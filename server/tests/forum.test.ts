import { beforeAll, describe, expect, it } from 'vitest';
import { api, createAdmin, createCourse, createStudent } from './helpers';

let admin: Awaited<ReturnType<typeof createAdmin>>;
let code: string;
beforeAll(async () => {
  admin = await createAdmin();
  code = (await createCourse(admin.token)).code;
});

const ask = (token: string, title = 'How do I prepare for the final?') =>
  api('POST', '/threads', { token, body: { course: code, title, body: 'The outline is vague and I do not know where to start.' } });

describe('asking a question', () => {
  it('needs a course that exists', async () => {
    const s = await createStudent();
    const res = await api('POST', '/threads', { token: s.token, body: { course: 'ZZZ999', title: 'A real question here', body: 'Some detail about it here.' } });
    expect(res.status).toBe(404);
  });

  it('needs a proper title', async () => {
    const s = await createStudent();
    expect((await ask(s.token, 'Help')).status).toBe(400);
  });
});

describe('answers', () => {
  it('count up and tell the asker', async () => {
    const asker = await createStudent();
    const helper = await createStudent('Helper');
    const thread = await ask(asker.token);
    await api('POST', `/threads/${thread.body._id}/answers`, { token: helper.token, body: { text: 'Do the past papers.' } });
    const read = await api('GET', `/threads/${thread.body._id}`);
    expect(read.body.answerCount).toBe(1);
    expect(read.body.answers[0].text).toBe('Do the past papers.');
    const inbox = await api('GET', '/notifications', { token: asker.token });
    expect(inbox.body.items[0]).toMatchObject({ kind: 'answer', actor: 'Helper' });
  });

  it('can only be accepted by the person who asked', async () => {
    const asker = await createStudent();
    const helper = await createStudent();
    const thread = await ask(asker.token);
    const answer = await api('POST', `/threads/${thread.body._id}/answers`, { token: helper.token, body: { text: 'Start with chapter two.' } });
    expect((await api('POST', `/answers/${answer.body._id}/accept`, { token: helper.token })).status).toBe(403);
    expect((await api('POST', `/answers/${answer.body._id}/accept`, { token: asker.token })).status).toBe(200);
    const read = await api('GET', `/threads/${thread.body._id}`);
    expect(read.body.resolved).toBe(true);
    expect(read.body.answers[0].accepted).toBe(true);
  });

  it('accepting again takes it back', async () => {
    const asker = await createStudent();
    const helper = await createStudent();
    const thread = await ask(asker.token);
    const answer = await api('POST', `/threads/${thread.body._id}/answers`, { token: helper.token, body: { text: 'Try the lab sheet.' } });
    await api('POST', `/answers/${answer.body._id}/accept`, { token: asker.token });
    await api('POST', `/answers/${answer.body._id}/accept`, { token: asker.token });
    expect((await api('GET', `/threads/${thread.body._id}`)).body.resolved).toBe(false);
  });

  it('removing the accepted answer reopens the question', async () => {
    const asker = await createStudent();
    const helper = await createStudent();
    const thread = await ask(asker.token);
    const answer = await api('POST', `/threads/${thread.body._id}/answers`, { token: helper.token, body: { text: 'Read the slides.' } });
    await api('POST', `/answers/${answer.body._id}/accept`, { token: asker.token });
    await api('DELETE', `/answers/${answer.body._id}`, { token: helper.token });
    const read = await api('GET', `/threads/${thread.body._id}`);
    expect(read.body.resolved).toBe(false);
    expect(read.body.answerCount).toBe(0);
  });
});

describe('votes', () => {
  it('are one per person, never on your own post', async () => {
    const asker = await createStudent();
    const voter = await createStudent();
    const thread = await ask(asker.token);
    expect((await api('POST', `/threads/${thread.body._id}/vote`, { token: asker.token })).status).toBe(400);
    expect((await api('POST', `/threads/${thread.body._id}/vote`, { token: voter.token })).body).toEqual({ votes: 1, votedByMe: true });
    expect((await api('POST', `/threads/${thread.body._id}/vote`, { token: voter.token })).body).toEqual({ votes: 0, votedByMe: false });
  });
});

describe('the question list', () => {
  it('filters open and resolved questions', async () => {
    const asker = await createStudent();
    const helper = await createStudent();
    const thread = await ask(asker.token, 'Which chapters are in the midterm?');
    const answer = await api('POST', `/threads/${thread.body._id}/answers`, { token: helper.token, body: { text: 'One to five.' } });
    await api('POST', `/answers/${answer.body._id}/accept`, { token: asker.token });
    const resolved = await api('GET', `/threads?course=${code}&status=resolved`);
    const open = await api('GET', `/threads?course=${code}&status=open`);
    expect(resolved.body.some((t: any) => t._id === thread.body._id)).toBe(true);
    expect(open.body.some((t: any) => t._id === thread.body._id)).toBe(false);
  });

  it('only the asker edits a question, an admin can remove it', async () => {
    const asker = await createStudent();
    const other = await createStudent();
    const thread = await ask(asker.token);
    const edit = { title: 'A better title for this question', body: 'With some more detail this time around.' };
    expect((await api('PUT', `/threads/${thread.body._id}`, { token: other.token, body: edit })).status).toBe(403);
    expect((await api('PUT', `/threads/${thread.body._id}`, { token: asker.token, body: edit })).status).toBe(200);
    expect((await api('DELETE', `/threads/${thread.body._id}`, { token: other.token })).status).toBe(403);
    expect((await api('DELETE', `/threads/${thread.body._id}`, { token: admin.token })).status).toBe(200);
  });
});
