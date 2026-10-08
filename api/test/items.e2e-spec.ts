import request from 'supertest';
import { resetData, signUp, startStack, type Stack } from './harness';

const item = { name: 'Desk lamp', category: 'Lighting', price: 24.9, tags: ['LED', 'warm', 'led'] };

describe('items', () => {
  let stack: Stack;
  beforeAll(async () => {
    stack = await startStack();
  });
  beforeEach(() => resetData(stack));
  afterAll(() => stack.close());

  it('lets anyone read, only signed-in users create, and validates input', async () => {
    const api = request(stack.url);
    await api.post('/items').send(item).expect(401);
    const { token } = await signUp(stack.url);
    await api.post('/items').set('Authorization', `Bearer ${token}`).send({ ...item, price: -1 }).expect(400);
    await api.post('/items').set('Authorization', `Bearer ${token}`).send({ ...item, price: 1.234 }).expect(400);
    const created = await api.post('/items').set('Authorization', `Bearer ${token}`).send(item).expect(201);
    expect(created.body).toMatchObject({ name: 'Desk lamp', price: 24.9, tags: ['led', 'warm'], inStock: true });
    expect((await api.get(`/items/${created.body.id}`).expect(200)).body.name).toBe('Desk lamp');
  });

  it('allows only the owner to change or delete an item', async () => {
    const owner = await signUp(stack.url, 'Owner');
    const other = await signUp(stack.url, 'Other');
    const api = request(stack.url);
    const { body } = await api.post('/items').set('Authorization', `Bearer ${owner.token}`).send(item).expect(201);
    await api.patch(`/items/${body.id}`).set('Authorization', `Bearer ${other.token}`).send({ price: 1 }).expect(403);
    await api.delete(`/items/${body.id}`).set('Authorization', `Bearer ${other.token}`).expect(403);
    const updated = await api.patch(`/items/${body.id}`).set('Authorization', `Bearer ${owner.token}`).send({ price: 19.5, inStock: false }).expect(200);
    expect(updated.body).toMatchObject({ price: 19.5, inStock: false, name: 'Desk lamp' });
    await api.delete(`/items/${body.id}`).set('Authorization', `Bearer ${owner.token}`).expect(204);
    await api.get(`/items/${body.id}`).expect(404);
  });

  it('pages with a stable cursor', async () => {
    const { token } = await signUp(stack.url);
    for (let i = 0; i < 5; i++) {
      await request(stack.url).post('/items').set('Authorization', `Bearer ${token}`).send({ ...item, name: `Item ${i}` }).expect(201);
    }
    const first = await request(stack.url).get('/items?limit=2').expect(200);
    const second = await request(stack.url).get(`/items?limit=2&cursor=${first.body.nextCursor}`).expect(200);
    const third = await request(stack.url).get(`/items?limit=2&cursor=${second.body.nextCursor}`).expect(200);
    const names = [...first.body.items, ...second.body.items, ...third.body.items].map((i: { name: string }) => i.name);
    expect(names).toEqual(['Item 4', 'Item 3', 'Item 2', 'Item 1', 'Item 0']);
    expect(third.body.nextCursor).toBeNull();
  });
});
