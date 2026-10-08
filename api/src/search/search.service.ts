import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MeiliSearchRequestError } from 'meilisearch';
import { isMissingIndex, MeiliService, type SearchDocument } from './meili.service';
import { buildSearch, type SearchQuery } from './search-query';

export interface SearchHit {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  inStock: boolean;
  ownerId: string | null;
  createdAt: string;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  categories: Record<string, number>;
  processingTimeMs: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly meili: MeiliService) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const { hits, facets } = buildSearch(query, this.meili.indexUid);
    try {
      const { results } = await this.meili.client.multiSearch({ queries: [hits, facets] });
      const [main, counts] = results;
      return {
        hits: (main.hits as SearchDocument[]).map(toHit),
        total: main.estimatedTotalHits ?? main.hits.length,
        categories: counts.facetDistribution?.category ?? {},
        processingTimeMs: main.processingTimeMs,
      };
    } catch (error) {
      if (isMissingIndex(error)) return { hits: [], total: 0, categories: {}, processingTimeMs: 0 };
      if (error instanceof MeiliSearchRequestError) throw new ServiceUnavailableException('Search is temporarily unavailable');
      throw error;
    }
  }
}

function toHit(doc: SearchDocument): SearchHit {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    category: doc.category,
    tags: doc.tags,
    price: doc.priceCents / 100,
    inStock: doc.inStock,
    ownerId: doc.ownerId,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}
