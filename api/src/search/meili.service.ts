import { Injectable, Logger } from '@nestjs/common';
import type { Item } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, MeiliSearchApiError, type Index } from 'meilisearch';
import type { Env } from '../config/env';

export interface SearchDocument {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  priceCents: number;
  inStock: boolean;
  ownerId: string | null;
  createdAt: number;
}

@Injectable()
export class MeiliService {
  private readonly logger = new Logger(MeiliService.name);
  readonly client: MeiliSearch;
  readonly indexUid: string;

  constructor(config: ConfigService<Env, true>) {
    this.client = new MeiliSearch({
      host: config.get('MEILI_HOST', { infer: true }),
      apiKey: config.get('MEILI_API_KEY', { infer: true }) || undefined,
    });
    this.indexUid = config.get('SEARCH_INDEX', { infer: true });
  }

  index(uid = this.indexUid): Index<SearchDocument> {
    return this.client.index<SearchDocument>(uid);
  }

  /** Creates the index on first use and keeps its settings in code, not in a dashboard. */
  async ensureSettings(uid = this.indexUid) {
    const task = await this.index(uid).updateSettings({
      searchableAttributes: ['name', 'tags', 'category', 'description'],
      filterableAttributes: ['category', 'inStock', 'priceCents', 'ownerId'],
      sortableAttributes: ['priceCents', 'createdAt'],
      typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    });
    await this.client.waitForTask(task.taskUid, { timeOutMs: 30_000 });
    this.logger.log(`Search index "${uid}" is ready`);
  }

  async documentCount(): Promise<number> {
    try {
      return (await this.index().getStats()).numberOfDocuments;
    } catch (error) {
      if (isMissingIndex(error)) return 0;
      throw error;
    }
  }
}

export function isMissingIndex(error: unknown): boolean {
  return error instanceof MeiliSearchApiError && error.cause?.code === 'index_not_found';
}

export function toDocument(item: Item): SearchDocument {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    tags: item.tags,
    priceCents: item.priceCents,
    inStock: item.inStock,
    ownerId: item.ownerId,
    createdAt: item.createdAt.getTime(),
  };
}
