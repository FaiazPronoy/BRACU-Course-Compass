import { beforeAll, describe, expect, it } from 'vitest';
import { api, createAdmin, createCourse, createStudent } from './helpers';

let admin: Awaited<ReturnType<typeof createAdmin>>;
beforeAll(async () => {
  admin = await createAdmin();
});

const grade = (token: string, body: Record<string, unknown>) => api('POST', '/planner/records', { token, body });

describe('the semester plan', () => {
  it('needs a real semester name, once', async () => {
    const s = await createStudent();
    expect((await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Next term' } })).status).toBe(400);
    expect((await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Fall 2026' } })).status).toBe(201);
    expect((await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Fall 2026' } })).status).toBe(409);
  });

  it('keeps semesters in date order', async () => {
    const s = await createStudent();
    for (const name of ['Fall 2027', 'Spring 2027', 'Summer 2027']) {
      await api('POST', '/planner/semesters', { token: s.token, body: { name } });
    }
    const plan = await api('GET', '/planner', { token: s.token });
    expect(plan.body.semesters.map((x: any) => x.name)).toEqual(['Spring 2027', 'Summer 2027', 'Fall 2027']);
  });

  it('flags a course whose prerequisite is not done or planned earlier', async () => {
    const s = await createStudent();
    const base = await createCourse(admin.token);
    const next = await createCourse(admin.token, { prerequisites: [base.code] });
    const plan = await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Spring 2027' } });
    const semId = plan.body.semesters[0]._id;
    const after = await api('POST', `/planner/semesters/${semId}/courses`, { token: s.token, body: { course: next.code } });
    expect(after.body.semesters[0].courses[0].missing).toEqual([base.code]);

    // passing the prerequisite clears the warning
    const fixed = await grade(s.token, { code: base.code, grade: 'B', semester: 'Fall 2026' });
    expect(fixed.body.semesters[0].courses[0].missing).toEqual([]);
  });

  it('only advises on a soft prerequisite, it does not block', async () => {
    const s = await createStudent();
    const base = await createCourse(admin.token);
    const next = await createCourse(admin.token, { recommended: [base.code] });
    const plan = await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Spring 2027' } });
    const after = await api('POST', `/planner/semesters/${plan.body.semesters[0]._id}/courses`, { token: s.token, body: { course: next.code } });
    expect(after.body.semesters[0].courses[0].missing).toEqual([]);
    expect(after.body.semesters[0].courses[0].advised).toEqual([base.code]);
  });

  it('uses the prerequisites of the student\'s own program where it has them', async () => {
    const usual = await createCourse(admin.token);
    const eeeOnly = await createCourse(admin.token);
    const course = await createCourse(admin.token, {
      prerequisites: [usual.code],
      programPrerequisites: [{ program: 'EEE', codes: [eeeOnly.code] }],
    });
    const missingFor = async (department: string) => {
      const s = await createStudent('Test Student', department);
      const plan = await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Spring 2027' } });
      const after = await api('POST', `/planner/semesters/${plan.body.semesters[0]._id}/courses`, { token: s.token, body: { course: course.code } });
      return after.body.semesters[0].courses[0].missing;
    };
    expect(await missingFor('CSE')).toEqual([usual.code]);
    expect(await missingFor('EEE')).toEqual([eeeOnly.code]);
  });

  it('will not plan the same course twice', async () => {
    const s = await createStudent();
    const course = await createCourse(admin.token);
    const plan = await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Spring 2027' } });
    const semId = plan.body.semesters[0]._id;
    await api('POST', `/planner/semesters/${semId}/courses`, { token: s.token, body: { course: course.code } });
    expect((await api('POST', `/planner/semesters/${semId}/courses`, { token: s.token, body: { course: course.code } })).status).toBe(409);
  });

  it('takes a passed course out of the future plan', async () => {
    const s = await createStudent();
    const course = await createCourse(admin.token);
    const plan = await api('POST', '/planner/semesters', { token: s.token, body: { name: 'Fall 2026' } });
    await api('POST', `/planner/semesters/${plan.body.semesters[0]._id}/courses`, { token: s.token, body: { course: course.code } });
    const res = await grade(s.token, { code: course.code, grade: 'B+' });
    expect(res.body.semesters[0].courses).toHaveLength(0);
  });
});

describe('grades and CGPA, the way BRACU counts them', () => {
  it('weights grades by credits', async () => {
    const s = await createStudent();
    const three = await createCourse(admin.token, { credits: 3 });
    const one = await createCourse(admin.token, { credits: 1 });
    await grade(s.token, { code: three.code, grade: 'A' });
    const res = await grade(s.token, { code: one.code, grade: 'C' });
    // (4.0 * 3 + 2.0 * 1) / 4 = 3.5
    expect(res.body.summary).toMatchObject({ cgpa: 3.5, credits: 4, attempted: 4, standing: 'satisfactory' });
  });

  it('counts an F as attempted but not earned', async () => {
    const s = await createStudent();
    const course = await createCourse(admin.token);
    const res = await grade(s.token, { code: course.code, grade: 'F' });
    expect(res.body.summary).toMatchObject({ cgpa: 0, credits: 0, attempted: 3, standing: 'probation' });
  });

  it('counts only the latest attempt of a retaken course, but keeps the old one as attempted', async () => {
    const s = await createStudent();
    const course = await createCourse(admin.token);
    await grade(s.token, { code: course.code, grade: 'D', semester: 'Fall 2024' });
    const res = await grade(s.token, { code: course.code, grade: 'A-', semester: 'Spring 2025' });
    expect(res.body.records.map((r: any) => [r.grade, r.counted])).toEqual([['A-', true], ['D', false]]);
    expect(res.body.summary).toMatchObject({ cgpa: 3.7, credits: 3, attempted: 6 });
  });

  it('goes by semester order, even when the retake grade is lower', async () => {
    const s = await createStudent();
    const course = await createCourse(admin.token);
    await grade(s.token, { code: course.code, grade: 'A', semester: 'Summer 2025' });
    const res = await grade(s.token, { code: course.code, grade: 'B', semester: 'Spring 2025' });
    // Spring comes before Summer, so the A from Summer is the latest
    expect(res.body.summary.cgpa).toBe(4);
  });

  it('edits the attempt when the same course is saved again for the same semester', async () => {
    const s = await createStudent();
    const course = await createCourse(admin.token);
    await grade(s.token, { code: course.code, grade: 'B', semester: 'Fall 2025' });
    const res = await grade(s.token, { code: course.code, grade: 'B+', semester: 'Fall 2025' });
    expect(res.body.records).toHaveLength(1);
    expect(res.body.summary.cgpa).toBe(3.3);
  });

  it('keeps the earlier grade when a later attempt is a W', async () => {
    const s = await createStudent();
    await grade(s.token, { code: 'WWW101', grade: 'B', semester: 'Fall 2024' });
    const res = await grade(s.token, { code: 'WWW101', grade: 'W', semester: 'Spring 2025' });
    expect(res.body.summary).toMatchObject({ cgpa: 3, credits: 3 });
  });

  it('leaves P and W out of the GPA, but a P still earns its credits', async () => {
    const s = await createStudent();
    await grade(s.token, { code: 'PPP101', grade: 'B' });
    await grade(s.token, { code: 'PPP102', grade: 'P' });
    const res = await grade(s.token, { code: 'PPP103', grade: 'W' });
    expect(res.body.summary).toMatchObject({ cgpa: 3, credits: 6, attempted: 3 });
  });

  it('takes courses that are not in the catalogue', async () => {
    const s = await createStudent();
    const res = await grade(s.token, { code: 'chn101', title: 'Chinese Language', credits: 3, grade: 'A', semester: 'Spring 2025' });
    expect(res.status).toBe(200);
    expect(res.body.records[0]).toMatchObject({ code: 'CHN101', title: 'Chinese Language', credits: 3 });
  });

  it('fills in title and credits from the catalogue', async () => {
    const s = await createStudent();
    const course = await createCourse(admin.token, { credits: 4 });
    const res = await grade(s.token, { code: course.code, grade: 'A' });
    expect(res.body.records[0]).toMatchObject({ title: course.title, credits: 4 });
  });

  it('refuses a grade BRACU does not give, or a code that is not one', async () => {
    const s = await createStudent();
    expect((await grade(s.token, { code: 'CSE220', grade: 'E' })).status).toBe(400);
    expect((await grade(s.token, { code: 'CS 220', grade: 'A' })).status).toBe(400);
  });

  it('puts a student with a CGPA under 2 on probation', async () => {
    const s = await createStudent();
    const res = await grade(s.token, { code: 'PRB101', grade: 'D+' });
    expect(res.body.summary.standing).toBe('probation');
  });

  it('imports a whole grade sheet, replacing what was there', async () => {
    const s = await createStudent();
    await grade(s.token, { code: 'OLD101', grade: 'F' });
    const records = [
      { code: 'CSE110', credits: 3, grade: 'B+', semester: 'Summer 2022' },
      { code: 'MAT110', credits: 3, grade: 'A', semester: 'Summer 2022' },
      { code: 'CSE110', credits: 3, grade: 'A', semester: 'Spring 2025' },
      { code: 'CSE400', credits: 4, grade: 'A+', semester: 'Fall 2025' },
    ];
    const res = await api('PUT', '/planner/records', { token: s.token, body: { records } });
    expect(res.body.records).toHaveLength(4);
    // (4*3 + 4*3 + 4*4) / 10, with the first CSE110 attempt left out
    expect(res.body.summary).toMatchObject({ cgpa: 4, credits: 10, attempted: 13 });
    expect((await api('PUT', '/planner/records', { token: s.token, body: { records: [] } })).status).toBe(400);
  });

  it('removes one attempt, or all of them', async () => {
    const s = await createStudent();
    await grade(s.token, { code: 'RMV101', grade: 'B' });
    const both = await grade(s.token, { code: 'RMV102', grade: 'A' });
    const id = both.body.records.find((r: any) => r.code === 'RMV101')._id;
    const one = await api('DELETE', `/planner/records/${id}`, { token: s.token });
    expect(one.body.records.map((r: any) => r.code)).toEqual(['RMV102']);
    const none = await api('DELETE', '/planner/records', { token: s.token });
    expect(none.body.records).toEqual([]);
  });

  it('keeps grades private to their owner', async () => {
    const a = await createStudent();
    const b = await createStudent();
    const res = await grade(a.token, { code: 'PRV101', grade: 'A' });
    await api('DELETE', `/planner/records/${res.body.records[0]._id}`, { token: b.token });
    expect((await api('GET', '/planner', { token: a.token })).body.records).toHaveLength(1);
    expect((await api('GET', '/planner', { token: b.token })).body.records).toHaveLength(0);
  });

  // BRACU rounds to three places first, then 5 or more in the third place rounds up
  const cgpaOf = async (grades: [string, number][]) => {
    const s = await createStudent();
    const records = grades.map(([g, credits], i) => ({ code: `RND${100 + i}`, credits, grade: g, semester: 'Fall 2025' }));
    return (await api('PUT', '/planner/records', { token: s.token, body: { records } })).body.summary.cgpa;
  };

  it('rounds 3.895 up to 3.90 and leaves 3.894 at 3.89', async () => {
    // 7 credits of A- and 13 of A: 77.9 / 20 = 3.895 exactly
    expect(await cgpaOf([['A-', 3], ['A-', 4], ['A', 3], ['A', 3], ['A', 3], ['A', 4]])).toBe(3.9);
    // 53 credits of A- and 97 of A: (196.1 + 388) / 150 = 3.894 exactly
    const minus: [string, number][] = [...Array(8).fill(['A-', 6]), ['A-', 5]];
    const plain: [string, number][] = [...Array(16).fill(['A', 6]), ['A', 1]];
    expect(await cgpaOf([...minus, ...plain])).toBe(3.89);
  });

  it('rounds to three places before two, the way the sheet does', async () => {
    // a real semester from a BRACU grade sheet: 156.3 points over 51 credits is
    // 3.0647..., which the sheet prints as 3.07 (3.065, then up), not 3.06
    const grades = ['A', 'A', 'A-', 'A-', 'B+', 'B+', 'A-', 'B', 'B+', 'B', 'B', 'A-', 'B', 'A-', 'F', 'A-', 'F'];
    expect(await cgpaOf(grades.map((g) => [g, 3]))).toBe(3.07);
  });

  it('shows the same CGPA on the dashboard', async () => {
    const s = await createStudent();
    await grade(s.token, { code: 'DSH101', grade: 'A-', credits: 3 });
    await grade(s.token, { code: 'DSH102', grade: 'B', credits: 3 });
    expect((await api('GET', '/me/dashboard', { token: s.token })).body.cgpa).toBe(3.35);
  });
});
