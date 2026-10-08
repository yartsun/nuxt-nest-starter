import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, Module, Res } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Response } from 'express';
import { Public } from '../auth/decorators';
import { PrismaService } from '../common/prisma.service';
import { SEARCH_QUEUE } from '../common/queues';
import { MeiliService } from '../search/meili.service';
import { SearchModule } from '../search/search.module';

const timed = async (check: () => Promise<unknown>) => {
  const started = Date.now();
  try {
    await Promise.race([check(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))]);
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
};

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
    @InjectQueue(SEARCH_QUEUE) private readonly queue: Queue,
  ) {}

  /** Readiness for load balancers and compose healthchecks: 503 if any dependency is down. */
  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const [database, redis, search] = await Promise.all([
      timed(() => this.prisma.$queryRaw`SELECT 1`),
      timed(() => this.queue.getJobCounts('wait')),
      timed(() => this.meili.client.health()),
    ]);
    const ok = database.ok && redis.ok && search.ok;
    res.status(ok ? 200 : 503);
    return { status: ok ? 'ok' : 'degraded', database, redis, search };
  }
}

@Module({ imports: [SearchModule, BullModule.registerQueue({ name: SEARCH_QUEUE })], controllers: [HealthController] })
export class HealthModule {}
