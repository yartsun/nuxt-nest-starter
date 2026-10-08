import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IMPORT_QUEUE } from '../common/queues';
import { QueueBridge } from './queue-bridge.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: IMPORT_QUEUE })],
  providers: [RealtimeGateway, QueueBridge],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
