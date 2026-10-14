import { describe, expect, it } from 'vitest';
import { api, createAdmin, createStudent, getUserDoc } from './helpers';

describe('the admin screens', () => {
  it('count the whole site', async () => {
    const admin = await createAdmin();
    const res = await api('GET', '/admin/overview', { token: admin.token });
    expect(res.status).toBe(200);
    expect(res.body.counts.users).toBeGreaterThan(0);
    expect(Array.isArray(res.body.unreviewed)).toBe(true);
  });

  it('list accounts without their passwords', async () => {
    const admin = await createAdmin();
    const res = await api('GET', '/admin/users', { token: admin.token });
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/);
  });

  it('can make someone an admin, and back', async () => {
    const admin = await createAdmin();
    const s = await createStudent();
    expect((await api('PATCH', `/admin/users/${s.id}/role`, { token: admin.token, body: { role: 'admin' } })).status).toBe(200);
    expect((await getUserDoc(s.email)).role).toBe('admin');
    await api('PATCH', `/admin/users/${s.id}/role`, { token: admin.token, body: { role: 'user' } });
    expect((await getUserDoc(s.email)).role).toBe('user');
  });

  it('will not let an admin change their own role', async () => {
    const admin = await createAdmin();
    const res = await api('PATCH', `/admin/users/${admin.id}/role`, { token: admin.token, body: { role: 'user' } });
    expect(res.status).toBe(400);
  });

  it('take effect straight away, without waiting for the token to expire', async () => {
    const admin = await createAdmin();
    const other = await createAdmin();
    await api('PATCH', `/admin/users/${other.id}/role`, { token: admin.token, body: { role: 'user' } });
    expect((await api('GET', '/admin/overview', { token: other.token })).status).toBe(403);
  });
});

describe('the public numbers', () => {
  it('are counted from the database', async () => {
    const before = (await api('GET', '/stats')).body;
    await createStudent();
    const after = (await api('GET', '/stats')).body;
    expect(after.students).toBe(before.students + 1);
  });
});
