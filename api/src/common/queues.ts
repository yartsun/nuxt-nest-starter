import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';
import type { Env } from '../config/env';

export const SEARCH_QUEUE = 'search';
export const IMPORT_QUEUE = 'import';

export type SearchJob =
  | { name: 'upsert'; data: { ids: string[] } }
  | { name: 'delete'; data: { ids: string[] } }
  | { name: 'reindex'; data: Record<string, never> };

export interface ImportJobData {
  userId: string;
  csv: string;
}

export interface ImportProgress {
  userId: string;
  processed: number;
  total: number;
}

export interface ImportResult {
  userId: string;
  created: number;
  skipped: number;
  errors: { line: number; message: string }[];
}

/** One Redis URL for queues, workers and queue events; `rediss://` enables TLS for managed Redis. */
export function redisConnection(config: ConfigService<Env, true>): ConnectionOptions {
  return redisOptions(config.get('REDIS_URL', { infer: true }));
}

export function redisOptions(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ workers, harmless for producers.
    maxRetriesPerRequest: null,
  };
}

export const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};
