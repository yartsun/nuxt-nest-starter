export const MAX_ROWS = 5000;

export class CsvFormatError extends Error {}

export interface ImportRow {
  line: number;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  tags: string[];
  inStock: boolean;
}

/** RFC 4180 parsing: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new CsvFormatError('Unterminated quoted field');
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

const HEADERS: Record<string, keyof Omit<ImportRow, 'line' | 'priceCents'> | 'price'> = {
  name: 'name',
  title: 'name',
  description: 'description',
  category: 'category',
  price: 'price',
  tags: 'tags',
  in_stock: 'inStock',
  instock: 'inStock',
  stock: 'inStock',
};

/** Validates every row up front; bad rows are reported with their line number and skipped. */
export function parseItemsCsv(text: string): { rows: ImportRow[]; errors: { line: number; message: string }[]; total: number } {
  const [header, ...records] = parseCsv(text);
  if (!header) throw new CsvFormatError('The file is empty');
  const columns = header.map((name) => HEADERS[name.trim().toLowerCase().replace(/[\s-]/g, '_')]);
  for (const required of ['name', 'category', 'price'] as const) {
    if (!columns.includes(required)) throw new CsvFormatError(`Missing required column "${required}"`);
  }
  if (records.length > MAX_ROWS) throw new CsvFormatError(`At most ${MAX_ROWS} rows per import`);

  const rows: ImportRow[] = [];
  const errors: { line: number; message: string }[] = [];
  records.forEach((cells, index) => {
    const line = index + 2;
    const value = (key: string) => (cells[columns.indexOf(key as never)] ?? '').trim();
    const problem = rowProblem(value);
    if (problem) {
      errors.push({ line, message: problem });
      return;
    }
    rows.push({
      line,
      name: value('name'),
      description: value('description'),
      category: value('category'),
      priceCents: Math.round(Number(value('price').replace(',', '.')) * 100),
      tags: [...new Set(value('tags').split(/[|;]/).map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
      inStock: !['false', 'no', '0', 'n'].includes(value('inStock').toLowerCase()),
    });
  });
  return { rows, errors, total: records.length };
}

function rowProblem(value: (key: string) => string): string | null {
  const name = value('name');
  const category = value('category');
  const price = value('price').replace(',', '.');
  const tags = value('tags').split(/[|;]/).filter((tag) => tag.trim());
  if (!name || name.length > 120) return 'name must be 1-120 characters';
  if (!category || category.length > 40) return 'category must be 1-40 characters';
  if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) > 1_000_000) return 'price must be a number between 0 and 1000000 with up to 2 decimals';
  if (value('description').length > 2000) return 'description must be at most 2000 characters';
  if (tags.length > 10 || tags.some((tag) => tag.trim().length > 30)) return 'at most 10 tags of up to 30 characters';
  return null;
}
