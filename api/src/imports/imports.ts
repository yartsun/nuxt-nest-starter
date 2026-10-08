import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, Post } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators';
import { PrismaService } from '../common/prisma.service';
import { IMPORT_QUEUE, type ImportJobData, type ImportProgress, type ImportResult } from '../common/queues';
import { SearchSync } from '../search/search-sync.service';
import { CsvFormatError, parseItemsCsv } from './csv';

const CHUNK = 100;

export class ImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1_000_000)
  csv: string;
}

@Controller('imports')
export class ImportsController {
  constructor(@InjectQueue(IMPORT_QUEUE) private readonly queue: Queue<ImportJobData, ImportResult>) {}

  /** Validates the file shape synchronously, then hands the work to the worker. Progress arrives over the socket. */
  @Post()
  async create(@CurrentUser() userId: string, @Body() dto: ImportDto) {
    let total: number;
    try {
      total = parseItemsCsv(dto.csv).total;
    } catch (error) {
      if (error instanceof CsvFormatError) throw new BadRequestException(error.message);
      throw error;
    }
    // One attempt: a partially applied import must not be replayed and duplicate rows.
    const job = await this.queue.add('csv', { userId, csv: dto.csv }, { attempts: 1, removeOnComplete: 100, removeOnFail: 100 });
    return { jobId: job.id, rows: total };
  }

  /** Polling fallback for clients without a socket. */
  @Get(':id')
  async status(@CurrentUser() userId: string, @Param('id') id: string) {
    const job = await this.queue.getJob(id);
    if (!job || job.data.userId !== userId) throw new NotFoundException('Import not found');
    const result = job.returnvalue ? { created: job.returnvalue.created, skipped: job.returnvalue.skipped, errors: job.returnvalue.errors } : null;
    return { jobId: job.id, state: await job.getState(), progress: job.progress, result, failedReason: job.failedReason ?? null };
  }
}

@Processor(IMPORT_QUEUE, { concurrency: 2 })
@Injectable()
export class ImportProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchSync,
  ) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<ImportResult> {
    const { userId, csv } = job.data;
    const { rows, errors, total } = parseItemsCsv(csv);
    let created = 0;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const items = await this.prisma.item.createManyAndReturn({
        data: chunk.map(({ line: _line, ...row }) => ({ ...row, ownerId: userId })),
        select: { id: true },
      });
      await this.search.upsert(items.map((item) => item.id));
      created += items.length;
      const progress: ImportProgress = { userId, processed: created + errors.length, total };
      await job.updateProgress(progress as unknown as object);
    }
    return { userId, created, skipped: errors.length, errors: errors.slice(0, 20) };
  }
}
