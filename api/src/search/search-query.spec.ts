import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { buildSearch, quote, SearchQuery } from './search-query';

const parse = (raw: Record<string, string>) => {
  const query = plainToInstance(SearchQuery, raw);
  return { query, errors: validateSync(query) };
};

describe('search query', () => {
  it('applies defaults and no filters for a plain query', () => {
    const { query, errors } = parse({ q: '  lamp ' });
    expect(errors).toHaveLength(0);
    const search = buildSearch(query, 'items');
    expect(search.hits).toMatchObject({ indexUid: 'items', q: 'lamp', limit: 24, offset: 0, filter: undefined, sort: undefined });
    expect(search.facets).toMatchObject({ facets: ['category'], limit: 0, filter: undefined });
  });

  it('builds price, stock and category filters but leaves category out of the facet query', () => {
    const { query } = parse({ category: 'Desk "Pro"', inStock: 'true', minPrice: '10.5', maxPrice: '99.99', sort: 'price_desc' });
    const search = buildSearch(query, 'items');
    expect(search.hits.filter).toEqual(['inStock = true', 'priceCents >= 1050', 'priceCents <= 9999', 'category = "Desk \\"Pro\\""']);
    expect(search.hits.sort).toEqual(['priceCents:desc']);
    expect(search.facets.filter).toEqual(['inStock = true', 'priceCents >= 1050', 'priceCents <= 9999']);
  });

  it('rejects unknown sorts, huge pages and negative prices', () => {
    expect(parse({ sort: 'random' }).errors).not.toHaveLength(0);
    expect(parse({ limit: '500' }).errors).not.toHaveLength(0);
    expect(parse({ minPrice: '-1' }).errors).not.toHaveLength(0);
  });

  it('escapes quotes and backslashes so a value cannot break out of the filter', () => {
    expect(quote('a" OR inStock = false OR "')).toBe('"a\\" OR inStock = false OR \\""');
    expect(quote('back\\slash')).toBe('"back\\\\slash"');
  });
});
