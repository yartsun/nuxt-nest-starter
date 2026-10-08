import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { hashPassword } from './auth/password';
import { defaultJobOptions, redisOptions, SEARCH_QUEUE } from './common/queues';
import { validateEnv } from './config/env';
import { DEMO_ITEMS, DEMO_USER } from './seed-data';

/**
 * `node dist/scripts.js seed`    – demo user and catalog on an empty database, then a reindex
 * `node dist/scripts.js reindex` – rebuild the search index from the database
 */
async function main(command: string | undefined) {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    // No .env file: rely on the real environment (Docker, CI).
  }
  const env = validateEnv(process.env);
  const prisma = new PrismaClient();
  const queue = new Queue(SEARCH_QUEUE, { connection: redisOptions(env.REDIS_URL), prefix: env.QUEUE_PREFIX });
  try {
    if (command === 'seed') {
      if ((await prisma.item.count()) > 0) {
        console.log('Database already has items; seed skipped');
        return;
      }
      const user = await prisma.user.upsert({
        where: { email: DEMO_USER.email },
        update: {},
        create: { email: DEMO_USER.email, name: DEMO_USER.name, passwordHash: await hashPassword(DEMO_USER.password) },
      });
      await prisma.item.createMany({ data: DEMO_ITEMS.map((item) => ({ ...item, ownerId: user.id })) });
      console.log(`Seeded ${DEMO_ITEMS.length} items for ${DEMO_USER.email}`);
    } else if (command !== 'reindex') {
      throw new Error('Usage: scripts.js seed|reindex');
    }
    await queue.add('reindex', {}, { ...defaultJobOptions, deduplication: { id: 'reindex' } });
    console.log('Reindex scheduled; the worker will pick it up');
  } finally {
    await queue.close();
    await prisma.$disconnect();
  }
}

main(process.argv[2]).catch((error) => {
  console.error(error);
  process.exit(1);
});
