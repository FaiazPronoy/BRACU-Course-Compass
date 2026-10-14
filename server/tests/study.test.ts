import { describe, expect, it } from 'vitest';
import { api, createAdmin, createCourse, createStudent } from './helpers';

describe('tasks', () => {
  it('belong to one student only', async () => {
    const a = await createStudent();
    const b = await createStudent();
    const task = await api('POST', '/todos', { token: a.token, body: { text: 'Finish lab 3' } });
    expect((await api('GET', '/todos', { token: b.token })).body).toHaveLength(0);
    expect((await api('PUT', `/todos/${task.body._id}`, { token: b.token, body: { completed: true } })).status).toBe(404);
    expect((await api('DELETE', `/todos/${task.body._id}`, { token: b.token })).status).toBe(404);
  });

  it('keep their other fields when only one is changed', async () => {
    const s = await createStudent();
    const task = await api('POST', '/todos', {
      token: s.token,
      body: { text: 'Quiz prep', priority: 'high', deadline: '2030-01-15' },
    });
    const done = await api('PUT', `/todos/${task.body._id}`, { token: s.token, body: { completed: true } });
    expect(done.body).toMatchObject({ completed: true, priority: 'high', text: 'Quiz prep' });
    expect(done.body.deadline).toMatch(/^2030-01-15/);
  });

  it('can be tied to a course by its code', async () => {
    const admin = await createAdmin();
    const course = await createCourse(admin.token);
    const s = await createStudent();
    const task = await api('POST', '/todos', { token: s.token, body: { text: 'Read chapter 4', course: course.code } });
    expect(task.body.course.code).toBe(course.code);
    const bad = await api('POST', '/todos', { token: s.token, body: { text: 'Read', course: 'ZZZ999' } });
    expect(bad.status).toBe(400);
  });

  it('survive a change of email', async () => {
    const s = await createStudent();
    await api('POST', '/todos', { token: s.token, body: { text: 'Still mine after moving' } });
    await api('POST', '/me/email', { token: s.token, body: { email: `after${Date.now()}@g.bracu.ac.bd`, password: s.password } });
    const list = await api('GET', '/todos', { token: s.token });
    expect(list.body.map((t: any) => t.text)).toContain('Still mine after moving');
  });
});

describe('calendar events', () => {
  it('check the time format', async () => {
    const s = await createStudent();
    const bad = await api('POST', '/events', { token: s.token, body: { title: 'Quiz', date: '2030-02-01', time: '25:00' } });
    expect(bad.status).toBe(400);
    const good = await api('POST', '/events', { token: s.token, body: { title: 'Quiz', date: '2030-02-01', time: '09:30', kind: 'quiz' } });
    expect(good.status).toBe(201);
  });

  it('need a date', async () => {
    const s = await createStudent();
    expect((await api('POST', '/events', { token: s.token, body: { title: 'No date' } })).status).toBe(400);
  });
});

describe('notes', () => {
  it('are saved and private', async () => {
    const a = await createStudent();
    const b = await createStudent();
    const note = await api('POST', '/notes', { token: a.token, body: { title: 'Heaps', content: '<p>max-heap property</p>' } });
    expect(note.status).toBe(201);
    expect((await api('GET', `/notes/${note.body._id}`, { token: b.token })).status).toBe(404);
    const saved = await api('PUT', `/notes/${note.body._id}`, { token: a.token, body: { content: '<p>updated</p>' } });
    expect(saved.body).toMatchObject({ title: 'Heaps', content: '<p>updated</p>' });
  });
});

describe('the dashboard', () => {
  it('counts overdue tasks', async () => {
    const s = await createStudent();
    await api('POST', '/todos', { token: s.token, body: { text: 'Late one', deadline: '2020-01-01' } });
    await api('POST', '/todos', { token: s.token, body: { text: 'Future one', deadline: '2099-01-01' } });
    const res = await api('GET', '/me/dashboard', { token: s.token });
    expect(res.body).toMatchObject({ openTasks: 2, overdue: 1 });
  });
});
