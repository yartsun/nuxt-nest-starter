export const SORTS = ['relevance', 'price_asc', 'price_desc', 'newest'] as const
export type Sort = (typeof SORTS)[number]

export interface CatalogQuery {
  q: string
  category: string
  sort: Sort
  inStock: boolean
}

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)

/** Route query → catalog state, tolerant of hand-edited URLs. */
export function parseCatalogQuery(query: Record<string, unknown>): CatalogQuery {
  const sort = String(first(query.sort) ?? '')
  return {
    q: String(first(query.q) ?? '').slice(0, 200),
    category: String(first(query.category) ?? '').slice(0, 40),
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : 'relevance',
    inStock: first(query.inStock) === 'true',
  }
}

/** Catalog state → minimal route query (defaults are omitted to keep URLs clean). */
export function toRouteQuery(state: CatalogQuery): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.q.trim()) query.q = state.q.trim()
  if (state.category) query.category = state.category
  if (state.sort !== 'relevance') query.sort = state.sort
  if (state.inStock) query.inStock = 'true'
  return query
}

/** Catalog state → API search parameters. */
export function toSearchParams(state: CatalogQuery, limit: number, offset = 0) {
  return {
    q: state.q.trim(),
    sort: state.sort,
    limit,
    offset,
    ...(state.category ? { category: state.category } : {}),
    ...(state.inStock ? { inStock: 'true' } : {}),
  }
}
