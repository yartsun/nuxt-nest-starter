import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { IMPORT_QUEUE } from '../common/queues';
import { SearchModule, SearchWorkerModule } from '../search/search.module';
import { ImportProcessor, ImportsController } from './imports';

const queue = BullModule.registerQueue({ name: IMPORT_QUEUE });

@Module({ imports: [queue, SearchModule], controllers: [ImportsController] })
export class ImportsModule {}

@Module({ imports: [queue, SearchWorkerModule], providers: [ImportProcessor] })
export class ImportsWorkerModule {}
