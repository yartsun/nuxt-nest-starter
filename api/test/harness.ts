import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule, WorkerModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.service';
import { MeiliService } from '../src/search/meili.service';

export interface Stack {
  app: NestExpressApplication;
  worker: INestApplicationContext;
  url: string;
  prisma: PrismaService;
  meili: MeiliService;
  close(): Promise<void>;
}

/** The API and the worker in one test process, wired exactly as in production. */
export async function startStack(): Promise<Stack> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] }));
  await app.listen(0);
  const worker = await NestFactory.createApplicationContext(WorkerModule, { logger: ['error'] });
  const url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  return {
    app,
    worker,
    url,
    prisma: app.get(PrismaService),
    meili: app.get(MeiliService),
    async close() {
      await worker.close();
      await app.close();
    },
  };
}

export async function resetData(stack: Stack) {
  await stack.prisma.$executeRawUnsafe('TRUNCATE "Item", "Session", "User" CASCADE');
  const task = await stack.meili.index().deleteAllDocuments().catch(() => null);
  if (task) await stack.meili.client.waitForTask(task.taskUid);
}

let counter = 0;

/** Registers a fresh user and returns a cookie-keeping agent plus the access token. */
export async function signUp(url: string, name = 'Tester') {
  const agent = request.agent(url);
  const email = `user${Date.now()}${counter++}@example.com`;
  const res = await agent.post('/auth/register').send({ email, name, password: 'a-long-password' }).expect(201);
  return { agent, email, token: res.body.accessToken as string, user: res.body.user as { id: string } };
}

export async function eventually<T>(check: () => Promise<T | undefined | false>, timeoutMs = 15_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

export function connect(url: string, token?: string): Promise<Socket> {
  const socket = io(`${url}/realtime`, { auth: token ? { token } : {}, transports: ['websocket'], forceNew: true });
  return new Promise((resolve, reject) => {
    socket.once('session', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

export function nextEvent<T = unknown>(socket: Socket, event: string, timeoutMs = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No "${event}" event`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}
