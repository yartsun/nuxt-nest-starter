import { describe, expect, it } from 'vitest'
import { parseCatalogQuery, toRouteQuery, toSearchParams } from '../app/utils/search-params'
import { formatPrice } from '../app/utils/format'

describe('catalog query', () => {
  it('parses a route query and drops invalid values', () => {
    expect(parseCatalogQuery({ q: 'lamp', category: 'Lighting', sort: 'price_asc', inStock: 'true' }))
      .toEqual({ q: 'lamp', category: 'Lighting', sort: 'price_asc', inStock: true })
    expect(parseCatalogQuery({ sort: 'random', q: ['a', 'b'], inStock: 'yes' }))
      .toEqual({ q: 'a', category: '', sort: 'relevance', inStock: false })
  })

  it('omits defaults from the URL and round-trips', () => {
    const state = { q: '  desk ', category: '', sort: 'relevance' as const, inStock: false }
    expect(toRouteQuery(state)).toEqual({ q: 'desk' })
    const full = { q: 'desk', category: 'Desk', sort: 'newest' as const, inStock: true }
    expect(parseCatalogQuery(toRouteQuery(full))).toEqual(full)
  })

  it('builds API parameters', () => {
    expect(toSearchParams({ q: ' lamp ', category: 'Lighting', sort: 'price_desc', inStock: true }, 24, 48))
      .toEqual({ q: 'lamp', sort: 'price_desc', limit: 24, offset: 48, category: 'Lighting', inStock: 'true' })
    expect(toSearchParams({ q: '', category: '', sort: 'relevance', inStock: false }, 24))
      .toEqual({ q: '', sort: 'relevance', limit: 24, offset: 0 })
  })

  it('formats prices', () => {
    expect(formatPrice(24.9)).toBe('$24.90')
    expect(formatPrice(1299)).toBe('$1,299.00')
  })
})
