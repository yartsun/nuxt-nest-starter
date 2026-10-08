import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma.service';
import { redisConnection } from './common/queues';
import { validateEnv, type Env } from './config/env';
import { HealthModule } from './health/health.module';
import { ImportsModule, ImportsWorkerModule } from './imports/imports.module';
import { ItemsModule } from './items/items.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SearchModule, SearchWorkerModule } from './search/search.module';

const infrastructure = [
  ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
  BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService<Env, true>) => ({
      connection: redisConnection(config),
      prefix: config.get('QUEUE_PREFIX', { infer: true }),
    }),
  }),
  PrismaModule,
];

/** HTTP API + Socket.IO. Produces jobs, never runs them. */
@Module({ imports: [...infrastructure, AuthModule, ItemsModule, SearchModule, ImportsModule, RealtimeModule, HealthModule] })
export class AppModule {}

/** Background worker: no HTTP server, consumes the search and import queues. */
@Module({ imports: [...infrastructure, SearchWorkerModule, ImportsWorkerModule] })
export class WorkerModule {}
