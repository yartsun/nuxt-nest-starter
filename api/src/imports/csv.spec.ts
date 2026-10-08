import { CsvFormatError, MAX_ROWS, parseCsv, parseItemsCsv } from './csv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, embedded commas and newlines, CRLF and BOM', () => {
    const text = '﻿name,description\r\n"Lamp, warm","Says ""hi""\nsecond line"\r\nPlain,\n\n';
    expect(parseCsv(text)).toEqual([
      ['name', 'description'],
      ['Lamp, warm', 'Says "hi"\nsecond line'],
      ['Plain', ''],
    ]);
  });

  it('rejects an unterminated quote', () => {
    expect(() => parseCsv('name\n"broken')).toThrow(CsvFormatError);
  });
});

describe('parseItemsCsv', () => {
  it('maps flexible headers and normalizes values', () => {
    const { rows, errors, total } = parseItemsCsv(
      'Title,Category,Price,Tags,In Stock,Description\nDesk lamp,Lighting,"24,90",LED|Warm|led,no,Dimmable\nMat,Desk,10,,,\n',
    );
    expect(total).toBe(2);
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({
      line: 2,
      name: 'Desk lamp',
      category: 'Lighting',
      priceCents: 2490,
      tags: ['led', 'warm'],
      inStock: false,
      description: 'Dimmable',
    });
    expect(rows[1]).toMatchObject({ line: 3, priceCents: 1000, tags: [], inStock: true });
  });

  it('reports bad rows by line number and keeps the good ones', () => {
    const { rows, errors } = parseItemsCsv('name,category,price\nOk,Desk,1.5\n,Desk,2\nCheap,Desk,-1\nPrecise,Desk,1.999\n');
    expect(rows.map((row) => row.name)).toEqual(['Ok']);
    expect(errors.map((error) => error.line)).toEqual([3, 4, 5]);
  });

  it('requires the key columns and caps the row count', () => {
    expect(() => parseItemsCsv('name,price\nA,1')).toThrow('Missing required column "category"');
    expect(() => parseItemsCsv('')).toThrow('The file is empty');
    const big = 'name,category,price\n' + 'A,B,1\n'.repeat(MAX_ROWS + 1);
    expect(() => parseItemsCsv(big)).toThrow(`At most ${MAX_ROWS} rows`);
  });
});
