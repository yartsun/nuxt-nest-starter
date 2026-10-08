import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { defaultJobOptions, SEARCH_QUEUE } from '../common/queues';

/**
 * Database writes enqueue index updates instead of calling Meilisearch inline:
 * a search outage never fails a write, and the worker retries until it lands.
 */
@Injectable()
export class SearchSync {
  constructor(@InjectQueue(SEARCH_QUEUE) private readonly queue: Queue) {}

  upsert(ids: string[]) {
    return ids.length ? this.queue.add('upsert', { ids }, defaultJobOptions) : undefined;
  }

  remove(ids: string[]) {
    return ids.length ? this.queue.add('delete', { ids }, defaultJobOptions) : undefined;
  }

  /** Requests that arrive while a rebuild is still queued or running collapse into it. */
  reindex() {
    return this.queue.add('reindex', {}, { ...defaultJobOptions, deduplication: { id: 'reindex' } });
  }
}
