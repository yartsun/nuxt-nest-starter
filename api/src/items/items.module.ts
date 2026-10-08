import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { SearchModule } from '../search/search.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  imports: [SearchModule, RealtimeModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
