import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const SORTS = ['relevance', 'price_asc', 'price_desc', 'newest'] as const;
export type Sort = (typeof SORTS)[number];

export class SearchQuery {
  @IsOptional() @IsString() @MaxLength(200)
  q = '';

  @IsOptional() @IsString() @MaxLength(40)
  category?: string;

  @IsOptional() @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)) @IsBoolean()
  inStock?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  maxPrice?: number;

  @IsOptional() @IsIn(SORTS)
  sort: Sort = 'relevance';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60)
  limit = 24;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  offset = 0;
}

const SORT_RULES: Record<Sort, string[] | undefined> = {
  relevance: undefined,
  price_asc: ['priceCents:asc'],
  price_desc: ['priceCents:desc'],
  newest: ['createdAt:desc'],
};

/** Quote a value for a Meilisearch filter expression. */
export function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Two queries for one request: the hits with every filter, and category counts
 * with every filter except the category itself, so the facet list does not
 * collapse to the single selected category.
 */
export function buildSearch(query: SearchQuery, indexUid: string) {
  const shared: string[] = [];
  if (query.inStock !== undefined) shared.push(`inStock = ${query.inStock}`);
  if (query.minPrice !== undefined) shared.push(`priceCents >= ${Math.round(query.minPrice * 100)}`);
  if (query.maxPrice !== undefined) shared.push(`priceCents <= ${Math.round(query.maxPrice * 100)}`);
  const withCategory = query.category ? [...shared, `category = ${quote(query.category)}`] : shared;
  const q = query.q.trim();
  return {
    hits: {
      indexUid,
      q,
      filter: withCategory.length ? withCategory : undefined,
      sort: SORT_RULES[query.sort],
      limit: query.limit,
      offset: query.offset,
    },
    facets: {
      indexUid,
      q,
      filter: shared.length ? shared : undefined,
      facets: ['category'],
      limit: 0,
    },
  };
}
