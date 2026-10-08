import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Consuming the search and import queues');
}

bootstrap().catch((error) => {
  console.error('Worker failed to start', error);
  process.exit(1);
});
