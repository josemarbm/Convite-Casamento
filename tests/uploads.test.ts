import { describe, expect, it, vi } from 'vitest';
import { findGroupIdByName, normalizeSpreadsheetRow, workbookFromGuests } from '../server/modules/uploads/routes.js';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';
import * as XLSX from 'xlsx';

describe('upload helpers', () => {
  it('normalizes Portuguese and English spreadsheet headers', () => {
    expect(normalizeSpreadsheetRow({ Nome: ' Maria ', Telefone: '(11) 99999-9999', Grupo: ' Família ' })).toEqual({ name: 'Maria', phone: '(11) 99999-9999', groupName: 'Família' });
    expect(normalizeSpreadsheetRow({ NAME: 'John', PHONE: '4155551212', GROUP: ' Friends ' })).toEqual({ name: 'John', phone: '4155551212', groupName: 'Friends' });
    expect(normalizeSpreadsheetRow({ Nome: 'Ana', Telefone: '5511' })).toEqual({ name: 'Ana', phone: '5511', groupName: '' });
  });

  it('matches existing group names without case, accent, or whitespace differences', () => {
    const groups = [{ id: 4, name: 'Família' }, { id: 5, name: 'Amigos' }];

    expect(findGroupIdByName(' familia ', groups)).toBe(4);
    expect(findGroupIdByName('não cadastrado', groups)).toBeNull();
    expect(findGroupIdByName('', groups)).toBeNull();
    expect(findGroupIdByName('família', [...groups, { id: 6, name: 'Familia' }])).toBeNull();
  });

  it('exports group, invitation status, and RSVP response columns', () => {
    const workbook = XLSX.read(workbookFromGuests([{
      name: 'Maria',
      phone: '5511',
      groupName: 'Família',
      status: 'sent',
      rsvpStatus: 'confirmed',
    }]), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Convidados, { header: 1 });
    expect(rows[0]).toEqual(['Nome', 'Telefone', 'Grupo', 'Status do convite', 'Resposta']);
    expect(rows[1]).toEqual(['Maria', '5511', 'Família', 'Enviado', 'Confirmado']);
  });

  it('skips guests whose phone number is already present in the event', async () => {
    const event = { id: 8, name: 'Festa', eventType: 'birthday', customType: null, hosts: null, dateTime: null, location: null, address: null, imagePath: null, archivedAt: null };
    const createdGuests: Array<{ name: string; phone: string; eventId: number; groupId: number | null }> = [];
    const db = {
      event: { findUnique: vi.fn().mockResolvedValue(event) },
      group: {
        findMany: vi.fn().mockResolvedValue([{ id: 4, name: 'Família' }]),
        create: vi.fn(),
      },
      guest: {
        findFirst: vi.fn().mockImplementation(async ({ where }: { where: { name?: string; phone: string; eventId: number } }) => createdGuests.find((guest) => (!where.name || guest.name === where.name) && guest.phone === where.phone && guest.eventId === where.eventId) ?? null),
        create: vi.fn().mockImplementation(async ({ data }: { data: typeof createdGuests[number] }) => { createdGuests.push(data); return {}; }),
      },
    };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { Nome: 'Maria', Telefone: '5511', Grupo: ' familia ' },
      { Nome: 'João', Telefone: '5511', Grupo: 'Visitantes' },
      { Nome: 'Ana', Telefone: '5533' },
      { Nome: 'Maria', Telefone: '5511', Grupo: 'Família' },
    ]), 'Convidados');
    const file = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const boundary = 'guest-import-test-boundary';
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="guests.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
      file,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const app = buildApp({ db: db as never, jwtSecret: 'test-secret' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests/import',
      headers: {
        authorization: `Bearer ${token}`,
        'x-event-id': '8',
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ imported: 2, skipped: 2 });
    expect(db.group.findMany).toHaveBeenCalledWith({ where: { eventId: 8 }, select: { id: true, name: true } });
    expect(db.guest.create).toHaveBeenNthCalledWith(1, { data: { name: 'Maria', phone: '5511', eventId: 8, groupId: 4 } });
    expect(db.guest.create).toHaveBeenNthCalledWith(2, { data: { name: 'Ana', phone: '5533', eventId: 8, groupId: null } });
    expect(db.guest.findFirst).toHaveBeenCalledWith({ where: { phone: '5511', eventId: 8 } });
    expect(db.group.create).not.toHaveBeenCalled();
    await app.close();
  });
});