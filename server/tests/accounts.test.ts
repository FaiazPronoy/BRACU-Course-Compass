import { describe, expect, it } from 'vitest';
import { api, createStudent, getUserDoc } from './helpers';

describe('signing up', () => {
  it('needs a BRACU email', async () => {
    const res = await api('POST', '/auth/register', {
      body: { name: 'Someone', email: 'someone@gmail.com', password: 'Student@123' },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/BRACU/);
  });

  it('refuses a short password', async () => {
    const res = await api('POST', '/auth/register', {
      body: { name: 'Someone', email: `short${Date.now()}@g.bracu.ac.bd`, password: 'abc' },
    });
    expect(res.status).toBe(400);
  });

  it('refuses an email that already has an account', async () => {
    const s = await createStudent();
    const res = await api('POST', '/auth/register', { body: { name: 'Again', email: s.email, password: 'Student@123' } });
    expect(res.status).toBe(409);
  });

  it('stores a hash, never the password', async () => {
    const s = await createStudent();
    const doc = await getUserDoc(s.email);
    expect(doc.password).not.toBe(s.password);
    expect(doc.password).toMatch(/^\$2[aby]\$/);
  });

  it('cannot be used to make yourself an admin', async () => {
    const email = `sneaky${Date.now()}@g.bracu.ac.bd`;
    await api('POST', '/auth/register', { body: { name: 'Sneaky', email, password: 'Student@123', role: 'admin' } });
    expect((await getUserDoc(email)).role).toBe('user');
  });
});

describe('signing in', () => {
  it('gives the same answer for an unknown email and a wrong password', async () => {
    const s = await createStudent();
    const unknown = await api('POST', '/auth/login', { body: { email: 'nobody@g.bracu.ac.bd', password: 'whatever12' } });
    const wrong = await api('POST', '/auth/login', { body: { email: s.email, password: 'wrong-password' } });
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('locks an email after five wrong passwords', async () => {
    const s = await createStudent();
    for (let i = 0; i < 5; i++) {
      await api('POST', '/auth/login', { body: { email: s.email, password: 'wrong-password' } });
    }
    const right = await api('POST', '/auth/login', { body: { email: s.email, password: s.password } });
    expect(right.status).toBe(429);
  });

  it('returns who you are, without the password', async () => {
    const s = await createStudent();
    const me = await api('GET', '/auth/me', { token: s.token });
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(s.email);
    expect(me.body.user.password).toBeUndefined();
  });

  it('rejects a forged token', async () => {
    const res = await api('GET', '/auth/me', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IngifQ.bad' });
    expect(res.status).toBe(401);
  });
});

describe('the profile', () => {
  it('can be updated, but not the role', async () => {
    const s = await createStudent();
    const res = await api('PATCH', '/me', { token: s.token, body: { name: 'New Name', studentId: '22101045', role: 'admin' } });
    expect(res.status).toBe(200);
    const doc = await getUserDoc(s.email);
    expect(doc.name).toBe('New Name');
    expect(doc.role).toBe('user');
  });

  it('checks the student id format', async () => {
    const s = await createStudent();
    const res = await api('PATCH', '/me', { token: s.token, body: { studentId: '123' } });
    expect(res.status).toBe(400);
  });

  it('changes the email only with the current password', async () => {
    const s = await createStudent();
    const newEmail = `moved${Date.now()}@g.bracu.ac.bd`;
    const wrong = await api('POST', '/me/email', { token: s.token, body: { email: newEmail, password: 'not-it-at-all' } });
    expect(wrong.status).toBe(400);
    const right = await api('POST', '/me/email', { token: s.token, body: { email: newEmail, password: s.password } });
    expect(right.status).toBe(200);
    const login = await api('POST', '/auth/login', { body: { email: newEmail, password: s.password } });
    expect(login.status).toBe(200);
  });

  it('changes the password after checking the old one', async () => {
    const s = await createStudent();
    const wrong = await api('POST', '/me/password', { token: s.token, body: { oldPassword: 'nope-nope', newPassword: 'Another@123' } });
    expect(wrong.status).toBe(400);
    const right = await api('POST', '/me/password', { token: s.token, body: { oldPassword: s.password, newPassword: 'Another@123' } });
    expect(right.status).toBe(200);
    const login = await api('POST', '/auth/login', { body: { email: s.email, password: 'Another@123' } });
    expect(login.status).toBe(200);
  });
});
