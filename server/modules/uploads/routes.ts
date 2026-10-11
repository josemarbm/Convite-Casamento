import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { authenticateRequest } from '../../lib/auth.js';
import { requireActiveEvent } from '../../lib/event-context.js';

type Options = { db: PrismaClient; jwtSecret: string; uploadDir?: string };
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function imageMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' } as Record<string, string>)[extension] ?? 'application/octet-stream';
}

function parseCompanionLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
}

function parseCompanions(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split(/[;,]/).map((name) => name.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeSpreadsheetRow(row: Record<string, unknown>) {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().trim(), value]));
  const companionLimitValue =
    normalized['limite de acompanhantes']
    ?? normalized['companion limit']
    ?? normalized['companion_limit']
    ?? normalized['limite_acompanhantes']
    ?? 0;
  const companionNamesValue =
    normalized.acompanhantes
    ?? normalized.companions
    ?? normalized['companions[]']
    ?? '';
  return {
    name: String(normalized.nome ?? normalized.name ?? '').trim(),
    phone: String(normalized.telefone ?? normalized.phone ?? '').trim(),
    groupName: String(normalized.grupo ?? normalized.group ?? '').trim(),
    companionLimit: Number.isInteger(parseCompanionLimit(companionLimitValue)) && parseCompanionLimit(companionLimitValue) >= 0 ? parseCompanionLimit(companionLimitValue) : 0,
    companions: parseCompanions(companionNamesValue),
  };
}

function normalizeGroupName(name: string) {
  return name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function findGroupIdByName(name: string, groups: Array<{ id: number; name: string }>) {
  const normalizedName = normalizeGroupName(name);
  if (!normalizedName) return null;
  const matches = groups.filter((group) => normalizeGroupName(group.name) === normalizedName);
  return matches.length === 1 ? matches[0].id : null;
}

function invitationStatusLabel(status: string | null | undefined) {
  if (status === 'sent') return 'Enviado';
  if (status === 'failed') return 'Falhou';
  return 'Pendente';
}

function rsvpStatusLabel(status: string | null | undefined) {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'declined') return 'Não comparece';
  return 'Aguardando';
}

export function workbookFromGuests(guests: Array<{
  name: string;
  phone: string;
  groupName?: string | null;
  status?: string | null;
  rsvpStatus?: string | null;
  companionLimit?: number | null;
  companions?: string[] | null;
}>) {
  const worksheet = XLSX.utils.json_to_sheet(guests.map((guest) => ({
    Nome: guest.name,
    Telefone: guest.phone,
    Grupo: guest.groupName ?? '',
    'Status do convite': invitationStatusLabel(guest.status),
    Resposta: rsvpStatusLabel(guest.rsvpStatus),
    'Limite de acompanhantes': guest.companionLimit ?? 0,
    Acompanhantes: (guest.companions ?? []).join('; '),
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Convidados');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function registerUploadRoutes(app: FastifyInstance, options: Options) {
  app.get('/api/images/preview', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const imagePath = event.imagePath;
    if (!imagePath) return reply.code(404).send({ error: 'No invitation image configured' });

    try {
      const image = await readFile(imagePath);
      return { data: image.toString('base64'), mimetype: imageMimeType(imagePath) };
    } catch {
      return reply.code(404).send({ error: 'Invitation image not found' });
    }
  });

  app.post('/api/images/upload', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const file = await request.file();
    if (!file || !imageTypes.has(file.mimetype)) return reply.code(400).send({ error: 'Only PNG, JPG, GIF, or WEBP images are accepted' });
    const uploadDir = options.uploadDir ?? process.env.UPLOAD_DIR ?? path.resolve('uploads');
    await mkdir(uploadDir, { recursive: true });
    const filename = `invitation-${Date.now()}${path.extname(file.filename).toLowerCase() || '.bin'}`;
    const target = path.join(uploadDir, filename);
    const contents = await file.toBuffer();
    await writeFile(target, contents);
    await options.db.event.update({ where: { id: event.id }, data: { imagePath: target } });
    return { path: target, filename, preview: `data:${file.mimetype};base64,${contents.toString('base64')}` };
  });

  app.post('/api/guests/import', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const file = await request.file();
    if (!file || !/\.(xlsx|xls)$/i.test(file.filename)) return reply.code(400).send({ error: 'An .xlsx or .xls file is required' });
    const workbook = XLSX.read(await file.toBuffer(), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]] ?? {});
    const groups = await options.db.group.findMany({ where: { eventId: event.id }, select: { id: true, name: true } });
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const guest = normalizeSpreadsheetRow(row);
      if (!guest.name || !guest.phone) { skipped++; continue; }
      const companionLimit = Number.isInteger(guest.companionLimit) && guest.companionLimit >= 0 ? guest.companionLimit : null;
      const companions = guest.companions.map((name) => name.trim()).filter((name) => name.length > 0 && name.length <= 200);
      if (companions.length > (companionLimit ?? 0) || (companionLimit !== null && companionLimit < 0)) { skipped++; continue; }
      const existing = await options.db.guest.findFirst({ where: { phone: guest.phone, eventId: event.id } });
      if (existing) { skipped++; continue; }
      const groupId = findGroupIdByName(guest.groupName, groups);
      const createdGuest = await options.db.guest.create({
        data: {
          name: guest.name,
          phone: guest.phone,
          eventId: event.id,
          groupId,
          ...(companionLimit !== null ? { companionLimit } : {}),
          ...(companions.length ? { companions: { create: companions.map((name) => ({ name })) } } : {}),
        },
      });
      if (companions.length > 0) {
        await options.db.guestCompanion.createMany({ data: companions.map((name) => ({ guestId: createdGuest.id, name })) });
      }
      imported++;
    }
    return { message: `Imported ${imported} guests`, imported, skipped };
  });

  app.get('/api/guests/export', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const guests = await options.db.guest.findMany({ where: { eventId: event.id }, include: { group: true, companions: { orderBy: { id: 'asc' } } }, orderBy: { name: 'asc' } });
    const exportRows = guests.map((guest) => ({
      name: guest.name,
      phone: guest.phone,
      groupName: guest.group?.name ?? null,
      status: guest.status,
      rsvpStatus: guest.rsvpStatus,
      companionLimit: guest.companionLimit,
      companions: guest.companions.map((companion) => companion.name),
    }));
    return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition', 'attachment; filename="convidados.xlsx"').send(workbookFromGuests(exportRows));
  });
}