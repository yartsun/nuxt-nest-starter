import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { SEARCH_QUEUE } from '../common/queues';
import { MeiliService, toDocument } from './meili.service';
import { SearchSync } from './search-sync.service';

const BATCH = 500;
const WAIT = { timeOutMs: 60_000 };

/** Worker side of search: applies index updates and rebuilds the index without downtime. */
@Processor(SEARCH_QUEUE, { concurrency: 1 })
export class SearchProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
  ) {
    super();
  }

  async process(job: Job<{ ids?: string[] }>) {
    const ids = job.data.ids ?? [];
    switch (job.name) {
      case 'upsert':
        return this.upsert(ids);
      case 'delete':
        await this.wait(this.meili.index().deleteDocuments(ids));
        return { removed: ids.length };
      case 'reindex':
        return this.reindex();
      default:
        throw new Error(`Unknown search job ${job.name}`);
    }
  }

  private async upsert(ids: string[]) {
    const items = await this.prisma.item.findMany({ where: { id: { in: ids } } });
    const found = new Set(items.map((item) => item.id));
    const missing = ids.filter((id) => !found.has(id)); // deleted before the job ran
    if (items.length) await this.wait(this.meili.index().addDocuments(items.map(toDocument), { primaryKey: 'id' }));
    if (missing.length) await this.wait(this.meili.index().deleteDocuments(missing));
    return { indexed: items.length, removed: missing.length };
  }

  /** Builds a fresh index next to the live one and swaps them atomically. */
  private async reindex() {
    const live = this.meili.indexUid;
    const next = `${live}_rebuild`;
    await this.meili.ensureSettings(live);
    await this.meili.client.deleteIndex(next).then((task) => this.meili.client.waitForTask(task.taskUid, WAIT)).catch(() => undefined);
    await this.meili.ensureSettings(next);
    let cursor: string | undefined;
    let total = 0;
    for (;;) {
      const page = await this.prisma.item.findMany({
        orderBy: { id: 'asc' },
        take: BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!page.length) break;
      await this.wait(this.meili.index(next).addDocuments(page.map(toDocument), { primaryKey: 'id' }));
      total += page.length;
      cursor = page[page.length - 1].id;
    }
    await this.wait(this.meili.client.swapIndexes([{ indexes: [live, next] }]));
    await this.wait(this.meili.client.deleteIndex(next));
    this.logger.log(`Reindexed ${total} items`);
    return { indexed: total };
  }

  private async wait(task: Promise<{ taskUid: number }>) {
    const done = await this.meili.client.waitForTask((await task).taskUid, WAIT);
    if (done.status === 'failed') throw new Error(`Meilisearch task failed: ${done.error?.message}`);
  }
}

/** On worker start: apply index settings and rebuild the index if it is empty but the database is not. */
@Injectable()
export class SearchBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchBootstrap.name);

  constructor(
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
    private readonly sync: SearchSync,
  ) {}

  async onApplicationBootstrap() {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.meili.ensureSettings();
        break;
      } catch (error) {
        if (attempt >= 30) throw error;
        this.logger.warn(`Meilisearch is not reachable yet (${(error as Error).message}); retrying`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    if ((await this.meili.documentCount()) === 0 && (await this.prisma.item.count()) > 0) {
      this.logger.log('Search index is empty; scheduling a full reindex');
      await this.sync.reindex();
    }
  }
}
