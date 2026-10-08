// E2E defaults; CI and local runs can override any of them through the environment.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://starter:starter@localhost:5432/starter_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.MEILI_HOST ??= 'http://localhost:7700';
process.env.MEILI_API_KEY ??= 'dev-master-key-change-me';
process.env.SEARCH_INDEX = 'items_e2e';
process.env.QUEUE_PREFIX = 'e2e';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.WEB_URL = 'http://localhost:3000';
process.env.API_URL = 'http://localhost:3001';
