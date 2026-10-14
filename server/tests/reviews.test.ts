import { beforeAll, describe, expect, it } from 'vitest';
import { api, createAdmin, createCourse, createStudent, review } from './helpers';

let admin: Awaited<ReturnType<typeof createAdmin>>;
beforeAll(async () => {
  admin = await createAdmin();
});

const post = (code: string, token: string, body = review()) =>
  api('POST', `/courses/${code}/reviews`, { token, body });

describe('writing a review', () => {
  it('is one per student per course', async () => {
    const course = await createCourse(admin.token);
    const s = await createStudent();
    expect((await post(course.code, s.token)).status).toBe(201);
    expect((await post(course.code, s.token)).status).toBe(409);
  });

  it.each([
    [{ faculty: 'N' }, /initials/],
    [{ semester: 'Autumn 2025' }, /Spring 2025/],
    [{ rating: 6 }, /1 to 5/],
    [{ body: 'Too short.' }, /30 characters/],
    [{ grade: 'E' }, /.+/],
  ])('checks %o', async (bad, message) => {
    const course = await createCourse(admin.token);
    const s = await createStudent();
    const res = await post(course.code, s.token, review(bad));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
  });

  it('takes the author from the session, not the request', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent('Real Author');
    const b = await createStudent('Someone Else');
    await post(course.code, a.token, review({ author: b.id }));
    const list = await api('GET', `/courses/${course.code}/reviews`);
    expect(list.body[0].author.name).toBe('Real Author');
  });

  it('shows no emails to visitors', async () => {
    const course = await createCourse(admin.token);
    const s = await createStudent();
    await post(course.code, s.token);
    const list = await api('GET', `/courses/${course.code}/reviews`);
    expect(JSON.stringify(list.body)).not.toContain(s.email);
  });
});

describe('changing a review', () => {
  it('is only for its author', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const b = await createStudent();
    const created = await post(course.code, a.token);
    expect((await api('PUT', `/reviews/${created.body._id}`, { token: b.token, body: review() })).status).toBe(403);
    expect((await api('DELETE', `/reviews/${created.body._id}`, { token: b.token })).status).toBe(403);
    expect((await api('PUT', `/reviews/${created.body._id}`, { token: a.token, body: review({ rating: 2 }) })).body.rating).toBe(2);
  });

  it('can be removed by an admin, for moderation', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const created = await post(course.code, a.token);
    expect((await api('DELETE', `/reviews/${created.body._id}`, { token: admin.token })).status).toBe(200);
    expect((await api('GET', `/courses/${course.code}/reviews`)).body).toHaveLength(0);
  });
});

describe('helpful votes', () => {
  it('count once per person and can be taken back', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const b = await createStudent();
    const created = await post(course.code, a.token);
    const first = await api('POST', `/reviews/${created.body._id}/helpful`, { token: b.token });
    expect(first.body).toEqual({ helpfulCount: 1, helpedByMe: true });
    const again = await api('POST', `/reviews/${created.body._id}/helpful`, { token: b.token });
    expect(again.body).toEqual({ helpfulCount: 0, helpedByMe: false });
  });

  it('are not allowed on your own review', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const created = await post(course.code, a.token);
    expect((await api('POST', `/reviews/${created.body._id}/helpful`, { token: a.token })).status).toBe(400);
  });

  it('put the most helpful review first', async () => {
    const course = await createCourse(admin.token);
    const [a, b, c] = await Promise.all([createStudent(), createStudent(), createStudent()]);
    await post(course.code, a.token, review({ faculty: 'AAA' }));
    const second = await post(course.code, b.token, review({ faculty: 'BBB' }));
    await api('POST', `/reviews/${second.body._id}/helpful`, { token: c.token });
    const list = await api('GET', `/courses/${course.code}/reviews?sort=helpful`);
    expect(list.body[0].faculty).toBe('BBB');
  });
});

describe('comments on a review', () => {
  it('let the review author know', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const b = await createStudent('Commenter');
    const created = await post(course.code, a.token);
    const res = await api('POST', `/reviews/${created.body._id}/comments`, { token: b.token, body: { text: 'Thanks, this helped.' } });
    expect(res.status).toBe(201);
    const inbox = await api('GET', '/notifications', { token: a.token });
    expect(inbox.body.unread).toBe(1);
    expect(inbox.body.items[0]).toMatchObject({ kind: 'review_comment', actor: 'Commenter', subject: course.code });
  });

  it('can only be edited by whoever wrote them', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const b = await createStudent();
    const created = await post(course.code, a.token);
    const comment = await api('POST', `/reviews/${created.body._id}/comments`, { token: b.token, body: { text: 'First.' } });
    expect((await api('PUT', `/review-comments/${comment.body._id}`, { token: a.token, body: { text: 'Hijacked' } })).status).toBe(403);
    expect((await api('PUT', `/review-comments/${comment.body._id}`, { token: b.token, body: { text: 'Edited' } })).status).toBe(200);
  });

  it('go when the review goes', async () => {
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const created = await post(course.code, a.token);
    await api('POST', `/reviews/${created.body._id}/comments`, { token: a.token, body: { text: 'My own note.' } });
    await api('DELETE', `/reviews/${created.body._id}`, { token: a.token });
    expect((await api('GET', `/reviews/${created.body._id}/comments`)).body).toHaveLength(0);
  });
});
