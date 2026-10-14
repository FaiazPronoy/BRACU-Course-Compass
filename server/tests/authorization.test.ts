import { describe, expect, it } from 'vitest';
import { api, createStudent } from './helpers';

const signedIn: Array<[string, string]> = [
  ['GET', '/auth/me'],
  ['PATCH', '/me'],
  ['POST', '/me/email'],
  ['POST', '/me/password'],
  ['GET', '/me/saved'],
  ['GET', '/me/activity'],
  ['GET', '/me/dashboard'],
  ['GET', '/notifications'],
  ['GET', '/todos'],
  ['POST', '/todos'],
  ['GET', '/events'],
  ['POST', '/events'],
  ['GET', '/notes'],
  ['POST', '/notes'],
  ['GET', '/planner'],
  ['POST', '/planner/semesters'],
  ['POST', '/planner/records'],
  ['PUT', '/planner/records'],
  ['DELETE', '/planner/records'],
  ['POST', '/threads'],
  ['POST', '/courses/CSE110/reviews'],
  ['POST', '/courses/CSE110/save'],
];

describe('routes that need a signed-in student', () => {
  it.each(signedIn)('%s %s turns away a visitor', async (method, path) => {
    const res = await api(method, path, { body: {} });
    expect(res.status).toBe(401);
  });
});

const adminOnly: Array<[string, string]> = [
  ['GET', '/admin/overview'],
  ['GET', '/admin/users'],
  ['POST', '/courses'],
  ['PUT', '/courses/000000000000000000000000'],
  ['DELETE', '/courses/000000000000000000000000'],
  ['PATCH', '/admin/users/000000000000000000000000/role'],
];

describe('admin routes', () => {
  it.each(adminOnly)('%s %s turns away a visitor', async (method, path) => {
    expect((await api(method, path, { body: {} })).status).toBe(401);
  });

  it.each(adminOnly)('%s %s turns away a student', async (method, path) => {
    const s = await createStudent();
    expect((await api(method, path, { token: s.token, body: {} })).status).toBe(403);
  });
});

describe('what a visitor can read', () => {
  it.each([['/courses'], ['/stats'], ['/departments'], ['/threads'], ['/reviews/recent'], ['/threads/courses']])(
    '%s is public',
    async (path) => {
      expect((await api('GET', path)).status).toBe(200);
    }
  );

  it('an unknown address is a 404 in json', async () => {
    const res = await api('GET', '/no-such-thing');
    expect(res.status).toBe(404);
    expect(res.body.message).toBeTruthy();
  });

  it('a malformed id is a 404, not a server error', async () => {
    expect((await api('GET', '/threads/not-an-id')).status).toBe(404);
    expect((await api('GET', '/reviews/not-an-id/comments')).status).toBe(404);
  });
});
