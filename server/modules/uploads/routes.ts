import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { authenticateRequest } from '../../lib/auth.js';

type Options = { db: PrismaClient; jwtSecret: string; uploadDir?: string };
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export function normalizeSpreadsheetRow(row: Record<string, unknown>) {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().trim(), value]));
  return { name: String(normalized.nome ?? normalized.name ?? '').trim(), phone: String(normalized.telefone ?? normalized.phone ?? '').trim() };
}

export function workbookFromGuests(guests: Array<{ name: string; phone: string }>) {
  const worksheet = XLSX.utils.json_to_sheet(guests.map((guest) => ({ Nome: guest.name, Telefone: guest.phone })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Convidados');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function registerUploadRoutes(app: FastifyInstance, options: Options) {
  app.post('/api/images/upload', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const file = await request.file();
    if (!file || !imageTypes.has(file.mimetype)) return reply.code(400).send({ error: 'Only PNG, JPG, GIF, or WEBP images are accepted' });
    const uploadDir = options.uploadDir ?? process.env.UPLOAD_DIR ?? path.resolve('uploads');
    await mkdir(uploadDir, { recursive: true });
    const filename = `invitation-${Date.now()}${path.extname(file.filename).toLowerCase() || '.bin'}`;
    const target = path.join(uploadDir, filename);
    await writeFile(target, await file.toBuffer());
    await options.db.setting.upsert({ where: { key: 'image_path' }, update: { value: target }, create: { key: 'image_path', value: target } });
    return { path: target, filename };
  });

  app.post('/api/guests/import', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const file = await request.file();
    if (!file || !/\.(xlsx|xls)$/i.test(file.filename)) return reply.code(400).send({ error: 'An .xlsx or .xls file is required' });
    const workbook = XLSX.read(await file.toBuffer(), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]] ?? {});
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const guest = normalizeSpreadsheetRow(row);
      if (!guest.name || !guest.phone) { skipped++; continue; }
      const existing = await options.db.guest.findFirst({ where: { phone: guest.phone } });
      if (existing) { skipped++; continue; }
      await options.db.guest.create({ data: guest });
      imported++;
    }
    return { message: `Imported ${imported} guests`, imported, skipped };
  });

  app.get('/api/guests/export', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const guests = await options.db.guest.findMany({ orderBy: { name: 'asc' } });
    return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition', 'attachment; filename="convidados.xlsx"').send(workbookFromGuests(guests));
  });
}