import request from 'supertest';
import { resetData, signUp, startStack, type Stack } from './harness';

const refreshCookie = (res: request.Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith('refresh_token='));

describe('auth', () => {
  let stack: Stack;
  beforeAll(async () => {
    stack = await startStack();
  });
  beforeEach(() => resetData(stack));
  afterAll(() => stack.close());

  it('registers with an httpOnly refresh cookie scoped to /auth and never returns secrets', async () => {
    const res = await request(stack.url)
      .post('/auth/register')
      .send({ email: '  Ada@Example.com ', name: 'Ada', password: 'a-long-password' })
      .expect(201);
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', name: 'Ada', provider: 'local' });
    expect(JSON.stringify(res.body)).not.toMatch(/password|refresh/i);
    const cookie = refreshCookie(res)!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Path=\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const stored = await stack.prisma.session.findFirstOrThrow();
    expect(cookie).not.toContain(stored.tokenHash);
  });

  it('validates input and rejects duplicates and unknown fields', async () => {
    const api = request(stack.url);
    await api.post('/auth/register').send({ email: 'a@example.com', name: 'A', password: 'short' }).expect(400);
    await api.post('/auth/register').send({ email: 'a@example.com', name: 'A', password: 'a-long-password', admin: true }).expect(400);
    await api.post('/auth/register').send({ email: 'a@example.com', name: 'A', password: 'a-long-password' }).expect(201);
    await api.post('/auth/register').send({ email: 'A@example.com', name: 'A', password: 'a-long-password' }).expect(409);
  });

  it('logs in with the same error for a wrong password and an unknown email', async () => {
    const { email } = await signUp(stack.url);
    const api = request(stack.url);
    const wrong = await api.post('/auth/login').send({ email, password: 'not-the-password' }).expect(401);
    const unknown = await api.post('/auth/login').send({ email: 'nobody@example.com', password: 'whatever-123' }).expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
    const ok = await api.post('/auth/login').send({ email, password: 'a-long-password' }).expect(200);
    await api.get('/auth/me').set('Authorization', `Bearer ${ok.body.accessToken}`).expect(200);
    await api.get('/auth/me').expect(401);
  });

  it('rotates the refresh token and revokes every session when an old one is replayed', async () => {
    const { agent, user } = await signUp(stack.url);
    const original = refreshCookie(await agent.post('/auth/refresh').expect(200))!;
    const second = await agent.post('/auth/refresh').expect(200);
    expect(refreshCookie(second)).not.toBe(original);

    // Pretend the replay happens long after rotation (outside the parallel-refresh grace window).
    await stack.prisma.session.updateMany({ where: { userId: user.id, revokedAt: { not: null } }, data: { revokedAt: new Date(Date.now() - 60_000) } });
    const replay = await request(stack.url).post('/auth/refresh').set('Cookie', original.split(';')[0]).expect(401);
    expect(replay.body.message).toMatch(/reuse/);
    await agent.post('/auth/refresh').expect(401); // the legitimate session is gone too
    expect(await stack.prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });

  it('treats a parallel refresh inside the grace window as a race, not as theft', async () => {
    const { agent, user } = await signUp(stack.url);
    const first = refreshCookie(await agent.post('/auth/refresh').expect(200))!.split(';')[0];
    await agent.post('/auth/refresh').expect(200);
    const late = await request(stack.url).post('/auth/refresh').set('Cookie', first).expect(401);
    expect(late.body.message).toMatch(/just rotated/);
    expect(await stack.prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(1);
  });

  it('logs out, and cookie endpoints refuse foreign origins', async () => {
    const { agent } = await signUp(stack.url);
    await agent.post('/auth/refresh').set('Origin', 'https://evil.example').expect(403);
    await agent.post('/auth/refresh').set('Origin', 'http://localhost:3000').expect(200);
    await agent.post('/auth/logout').expect(204);
    await agent.post('/auth/refresh').expect(401);
  });

  it('reports no OAuth providers and redirects unconfigured ones back to the login page', async () => {
    const api = request(stack.url);
    expect((await api.get('/auth/providers').expect(200)).body).toEqual({ google: false, github: false });
    const res = await api.get('/auth/google').expect(302);
    expect(res.headers.location).toBe('http://localhost:3000/login?error=oauth_unavailable');
  });
});
