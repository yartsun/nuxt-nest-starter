import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { IMPORT_QUEUE, redisConnection, SEARCH_QUEUE, type ImportJobData, type ImportProgress, type ImportResult } from '../common/queues';
import type { Env } from '../config/env';
import { RealtimeGateway } from './realtime.gateway';

const parse = <T>(value: unknown): T => (typeof value === 'string' ? JSON.parse(value) : value) as T;

/**
 * Jobs run in the worker process, sockets live in the API process. BullMQ queue
 * events (Redis streams) connect the two without a second message bus.
 */
@Injectable()
export class QueueBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueBridge.name);
  private readonly listeners: QueueEvents[] = [];

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly realtime: RealtimeGateway,
    @InjectQueue(IMPORT_QUEUE) private readonly imports: Queue<ImportJobData, ImportResult>,
  ) {}

  onModuleInit() {
    const options = { connection: redisConnection(this.config), prefix: this.config.get('QUEUE_PREFIX', { infer: true }) };

    const imports = new QueueEvents(IMPORT_QUEUE, options);
    imports.on('progress', ({ jobId, data }) => {
      const progress = parse<ImportProgress>(data);
      if (progress?.userId) {
        this.realtime.toUser(progress.userId, 'import.progress', { jobId, processed: progress.processed, total: progress.total });
      }
    });
    imports.on('completed', ({ jobId, returnvalue }) => {
      const { userId, ...result } = parse<ImportResult>(returnvalue);
      this.realtime.toUser(userId, 'import.completed', { jobId, ...result });
    });
    imports.on('failed', async ({ jobId, failedReason }) => {
      const job = await this.imports.getJob(jobId);
      if (job) this.realtime.toUser(job.data.userId, 'import.failed', { jobId, reason: failedReason });
    });

    // Search results change only after the worker has indexed; tell clients to refresh then.
    const search = new QueueEvents(SEARCH_QUEUE, options);
    search.on('completed', () => this.realtime.toCatalog('search.updated', {}));

    for (const listener of [imports, search]) {
      listener.on('error', (error) => this.logger.warn(`Queue events: ${error.message}`));
      this.listeners.push(listener);
    }
  }

  async onModuleDestroy() {
    await Promise.all(this.listeners.map((listener) => listener.close()));
  }
}
