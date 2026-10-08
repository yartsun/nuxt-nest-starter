import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SEARCH_QUEUE } from '../common/queues';
import { MeiliService } from './meili.service';
import { SearchController } from './search.controller';
import { SearchBootstrap, SearchProcessor } from './search.processor';
import { SearchSync } from './search-sync.service';
import { SearchService } from './search.service';

const queue = BullModule.registerQueue({ name: SEARCH_QUEUE });

/** API side: the search endpoint and the producer of index updates. */
@Module({
  imports: [queue],
  controllers: [SearchController],
  providers: [MeiliService, SearchService, SearchSync],
  exports: [MeiliService, SearchSync],
})
export class SearchModule {}

/** Worker side: consumes index updates. */
@Module({
  imports: [queue],
  providers: [MeiliService, SearchSync, SearchProcessor, SearchBootstrap],
  exports: [SearchSync],
})
export class SearchWorkerModule {}
