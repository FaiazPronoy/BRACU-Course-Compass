import { describe, expect, it } from 'vitest';
import { api, createAdmin, createCourse, createStudent, getUserDoc, newCode, review } from './helpers';

describe('the course catalogue', () => {
  it('refuses a course code in the wrong shape', async () => {
    const admin = await createAdmin();
    const res = await api('POST', '/courses', { token: admin.token, body: { code: 'CS1', title: 'Broken', department: 'CSE' } });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/CSE220/);
  });

  it('refuses the same code twice', async () => {
    const admin = await createAdmin();
    const course = await createCourse(admin.token);
    const res = await api('POST', '/courses', { token: admin.token, body: { code: course.code, title: 'Again', department: 'CSE' } });
    expect(res.status).toBe(409);
  });

  it('checks that resource links are real links', async () => {
    const admin = await createAdmin();
    const res = await api('POST', '/courses', {
      token: admin.token,
      body: { code: newCode(), title: 'Links', department: 'CSE', materials: [{ title: 'Notes', url: 'javascript:alert(1)' }] },
    });
    expect(res.status).toBe(400);
  });

  it('is found by its code, case does not matter', async () => {
    const admin = await createAdmin();
    const course = await createCourse(admin.token);
    const res = await api('GET', `/courses/${course.code.toLowerCase()}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(course.code);
  });

  it('works out ratings from the reviews', async () => {
    const admin = await createAdmin();
    const course = await createCourse(admin.token);
    const a = await createStudent();
    const b = await createStudent();
    await api('POST', `/courses/${course.code}/reviews`, { token: a.token, body: review({ rating: 5, difficulty: 2 }) });
    await api('POST', `/courses/${course.code}/reviews`, { token: b.token, body: review({ rating: 3, difficulty: 4, faculty: 'XYZ', grade: 'B' }) });
    const res = await api('GET', `/courses/${course.code}`);
    expect(res.body.stats).toMatchObject({ reviews: 2, rating: 4, difficulty: 3 });
    expect(res.body.grades).toMatchObject({ 'A-': 1, B: 1 });
    expect(res.body.faculties.map((f: any) => f.faculty).sort()).toEqual(['ABC', 'XYZ']);
  });

  it('lists what a course unlocks', async () => {
    const admin = await createAdmin();
    const base = await createCourse(admin.token);
    const next = await createCourse(admin.token, { prerequisites: [base.code] });
    const res = await api('GET', `/courses/${base.code}`);
    expect(res.body.unlocks.map((c: any) => c.code)).toContain(next.code);
  });

  it('counts a soft prerequisite as something the course opens up', async () => {
    const admin = await createAdmin();
    const base = await createCourse(admin.token);
    const next = await createCourse(admin.token, { recommended: [base.code] });
    const res = await api('GET', `/courses/${base.code}`);
    expect(res.body.unlocks.map((c: any) => c.code)).toContain(next.code);
  });

  it('refuses a course as its own prerequisite when it is created', async () => {
    const admin = await createAdmin();
    const code = newCode();
    const res = await api('POST', '/courses', {
      token: admin.token,
      body: { code, title: 'Loops forever', department: 'CSE', recommended: [code] },
    });
    expect(res.status).toBe(400);
  });

  it('carries a renamed code into the prerequisite lists', async () => {
    const admin = await createAdmin();
    const base = await createCourse(admin.token);
    const next = await createCourse(admin.token, { prerequisites: [base.code] });
    const renamed = newCode();
    const res = await api('PUT', `/courses/${base._id}`, {
      token: admin.token,
      body: { code: renamed, title: base.title, department: 'CSE' },
    });
    expect(res.status).toBe(200);
    const after = await api('GET', `/courses/${next.code}`);
    expect(after.body.prerequisites).toEqual([renamed]);
  });

  it('takes its reviews, questions and bookmarks with it when deleted', async () => {
    const admin = await createAdmin();
    const course = await createCourse(admin.token);
    const s = await createStudent();
    await api('POST', `/courses/${course.code}/reviews`, { token: s.token, body: review() });
    const thread = await api('POST', '/threads', {
      token: s.token,
      body: { course: course.code, title: 'Is the final open book?', body: 'Asking before I print everything out.' },
    });
    await api('POST', `/courses/${course.code}/save`, { token: s.token });

    expect((await api('DELETE', `/courses/${course._id}`, { token: admin.token })).status).toBe(200);
    expect((await api('GET', `/threads/${thread.body._id}`)).status).toBe(404);
    expect((await getUserDoc(s.email)).savedCourses).toHaveLength(0);
  });

  it('can be saved and unsaved', async () => {
    const admin = await createAdmin();
    const course = await createCourse(admin.token);
    const s = await createStudent();
    expect((await api('POST', `/courses/${course.code}/save`, { token: s.token })).body.saved).toBe(true);
    expect((await api('GET', '/me/saved', { token: s.token })).body.map((c: any) => c.code)).toEqual([course.code]);
    expect((await api('POST', `/courses/${course.code}/save`, { token: s.token })).body.saved).toBe(false);
  });

  it('can be searched and filtered by department', async () => {
    const admin = await createAdmin();
    const course = await createCourse(admin.token, { title: 'Quantum Basket Weaving', department: 'ZZZ' });
    const found = await api('GET', '/courses?search=basket');
    expect(found.body.map((c: any) => c.code)).toContain(course.code);
    const dept = await api('GET', '/courses?dept=ZZZ');
    expect(dept.body.every((c: any) => c.department === 'ZZZ')).toBe(true);
  });
});
