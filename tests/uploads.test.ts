import { describe, expect, it } from 'vitest';
import { normalizeSpreadsheetRow, workbookFromGuests } from '../server/modules/uploads/routes.js';
import * as XLSX from 'xlsx';

describe('upload helpers', () => {
  it('normalizes Portuguese and English spreadsheet headers', () => {
    expect(normalizeSpreadsheetRow({ Nome: ' Maria ', Telefone: '(11) 99999-9999' })).toEqual({ name: 'Maria', phone: '(11) 99999-9999' });
    expect(normalizeSpreadsheetRow({ NAME: 'John', PHONE: '4155551212' })).toEqual({ name: 'John', phone: '4155551212' });
  });

  it('creates an Excel workbook with the expected columns', () => {
    const workbook = XLSX.read(workbookFromGuests([{ name: 'Maria', phone: '5511' }]), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Convidados, { header: 1 });
    expect(rows[0]).toEqual(['Nome', 'Telefone']);
    expect(rows[1]).toEqual(['Maria', '5511']);
  });
});