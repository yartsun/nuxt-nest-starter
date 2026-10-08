import request from 'supertest';
import { SearchSync } from '../src/search/search-sync.service';
import { connect, eventually, nextEvent, resetData, signUp, startStack, type Stack } from './harness';

describe('search, imports and realtime', () => {
  let stack: Stack;
  beforeAll(async () => {
    stack = await startStack();
    await stack.meili.ensureSettings();
  });
  beforeEach(() => resetData(stack));
  afterAll(() => stack.close());

  const search = (query: string) => request(stack.url).get(`/search?${query}`).expect(200).then((res) => res.body);

  it('indexes new items through the worker and pushes events to every client', async () => {
    const { token } = await signUp(stack.url);
    const viewer = await connect(stack.url);
    const created = nextEvent<{ name: string }>(viewer, 'item.created');
    const indexed = nextEvent(viewer, 'search.updated');
    await request(stack.url).post('/items').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Walnut desk shelf', category: 'Desk', price: 89, tags: ['wood'] }).expect(201);
    await request(stack.url).post('/items').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Desk lamp', category: 'Lighting', price: 25, inStock: false }).expect(201);
    expect((await created).name).toBe('Walnut desk shelf');
    await indexed;

    const result = await eventually(async () => {
      const body = await search('q=desk');
      return body.total === 2 && body;
    });
    expect(result.categories).toEqual({ Desk: 1, Lighting: 1 });
    // Typo tolerance and the category facet staying complete while a category is selected.
    expect((await search('q=walnot')).hits.map((hit: { name: string }) => hit.name)).toEqual(['Walnut desk shelf']);
    const filtered = await search('q=desk&category=Desk&inStock=true&sort=price_desc');
    expect(filtered.hits.map((hit: { name: string }) => hit.name)).toEqual(['Walnut desk shelf']);
    expect(filtered.categories).toEqual({ Desk: 1 });
    viewer.close();
  });

  it('imports a CSV in the worker and streams progress only to its owner', async () => {
    const owner = await signUp(stack.url, 'Owner');
    const other = await signUp(stack.url, 'Other');
    const ownerSocket = await connect(stack.url, owner.token);
    const strangerSocket = await connect(stack.url);
    let strangerSawImport = false;
    strangerSocket.on('import.completed', () => (strangerSawImport = true));

    const rows = Array.from({ length: 150 }, (_, i) => `Cable ${i},Cables,${(i + 1) / 10},usb-c|braided,yes`);
    const csv = ['name,category,price,tags,in_stock', ...rows, 'Broken,Cables,-5,,'].join('\n');
    const progress = nextEvent<{ processed: number; total: number }>(ownerSocket, 'import.progress');
    const completed = nextEvent<{ jobId: string; created: number; skipped: number; errors: { line: number }[] }>(ownerSocket, 'import.completed');
    const { body } = await request(stack.url).post('/imports').set('Authorization', `Bearer ${owner.token}`).send({ csv }).expect(201);
    expect(body.rows).toBe(151);

    expect((await progress).total).toBe(151);
    const result = await completed;
    expect(result).toMatchObject({ jobId: body.jobId, created: 150, skipped: 1, errors: [{ line: 152 }] });
    expect(strangerSawImport).toBe(false);

    const status = await request(stack.url).get(`/imports/${body.jobId}`).set('Authorization', `Bearer ${owner.token}`).expect(200);
    expect(status.body).toMatchObject({ state: 'completed', result: { created: 150, skipped: 1 } });
    await request(stack.url).get(`/imports/${body.jobId}`).set('Authorization', `Bearer ${other.token}`).expect(404);
    await eventually(async () => (await search('q=cable&limit=1')).total === 150);
    ownerSocket.close();
    strangerSocket.close();
  });

  it('rebuilds the index from the database every time it is asked, not only the first time', async () => {
    const { token } = await signUp(stack.url);
    for (const name of ['Rebuild one', 'Rebuild two']) {
      await request(stack.url).post('/items').set('Authorization', `Bearer ${token}`).send({ name, category: 'Desk', price: 1 }).expect(201);
    }
    await eventually(async () => (await search('q=rebuild')).total === 2);
    const sync = stack.app.get(SearchSync);
    // Deleting straight in the database leaves the index stale until a rebuild.
    await stack.prisma.item.deleteMany({ where: { name: 'Rebuild one' } });
    await sync.reindex();
    await eventually(async () => (await search('q=rebuild')).total === 1);
    await stack.prisma.item.deleteMany({ where: { name: 'Rebuild two' } });
    await sync.reindex();
    await eventually(async () => (await search('q=rebuild')).total === 0);
  });

  it('rejects a CSV without the required columns before queueing it', async () => {
    const { token } = await signUp(stack.url);
    const res = await request(stack.url).post('/imports').set('Authorization', `Bearer ${token}`).send({ csv: 'name,price\nA,1' }).expect(400);
    expect(res.body.message).toMatch(/category/);
  });

  it('reports healthy dependencies', async () => {
    const { body } = await request(stack.url).get('/health').expect(200);
    expect(body).toMatchObject({ status: 'ok', database: { ok: true }, redis: { ok: true }, search: { ok: true } });
  });
});
