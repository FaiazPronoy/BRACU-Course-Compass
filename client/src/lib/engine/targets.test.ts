import { describe, expect, it } from 'vitest';
import { candidates } from './boost';
import { add, Attempt, Grade, gpaOf, LetterGrade, Sums, totals } from './grades';
import { gradeCounts, planTarget, splitCourses } from './targets';

let n = 0;
const a = (code: string, grade: Grade, semester = 'Fall 2025', credits = 3): Attempt => ({ id: `g${n++}`, code, title: code, credits, grade, semester });
const withMix = (sums: Sums, courses: number[], high: LetterGrade, k: number, low: LetterGrade) =>
  gpaOf(courses.reduce((s, c, i) => add(s, i < k ? high : low, c), sums));

describe('splitting the credits left into courses', () => {
  it('makes 3-credit courses and one for the remainder', () => {
    expect(splitCourses(54)).toEqual(Array(18).fill(3));
    expect(splitCourses(53)).toEqual([...Array(17).fill(3), 2]);
    expect(splitCourses(0)).toEqual([]);
  });
});

describe('planning a target', () => {
  // 30 courses done at 3.50 average: 15 A and 15 B
  const done = [...Array(15)].map((_, i) => a(`D${i}`, 'A')).concat([...Array(15)].map((_, i) => a(`E${i}`, 'B')));
  const sums = totals(done).sums;

  it('offers the smallest mix of each kind that reaches the target', () => {
    // 90 credits at 3.50, then 54 more: 4.00 in all of them gives 3.69, so 3.65 is in reach
    const plan = planTarget(sums, 54, 3.65);
    expect(plan.reachable).toBe(true);
    expect(planTarget(sums, 54, 3.7).reachable).toBe(false);
    expect(plan.mixes.length).toBeGreaterThan(0);
    for (const m of plan.mixes) {
      expect(m.cgpa).toBeGreaterThanOrEqual(3.65);
      // a mix is only offered when its lower grade alone would fall short
      if (m.lowCourses > 0) expect(withMix(sums, plan.courses, m.low, plan.courses.length, m.low)!).toBeLessThan(3.65);
      if (m.lowCourses > 0) {
        // one fewer at the higher grade must fall short, or it was not the smallest
        expect(withMix(sums, plan.courses, m.high, m.highCourses - 1, m.low)!).toBeLessThan(3.65);
      }
    }
    // the example from the brief: some courses at 4.00, the rest at 3.70
    const aMinus = plan.mixes.find((m) => m.high === 'A' && m.low === 'A-');
    expect(aMinus).toBeDefined();
    expect(aMinus!.highCourses + aMinus!.lowCourses).toBe(18);
  });

  it('says so when straight 4.00s are not enough, and finds the fewest repeats that are', () => {
    const lows = [a('L1', 'C', 'Summer 2025'), a('L2', 'D', 'Summer 2025'), a('L3', 'C+', 'Fall 2025'), a('L4', 'B', 'Fall 2025'), a('L5', 'B', 'Fall 2025')];
    const list = [...done, ...lows];
    const t = totals(list);
    const pool = candidates(list, 'Spring 2026', 'A');
    const plan = planTarget(t.sums, 6, 3.62, pool);
    expect(plan.reachable).toBe(false);
    expect(plan.repeats).not.toBeNull();
    expect(plan.repeats!.cgpa!).toBeGreaterThanOrEqual(3.62);
    // one repeat fewer does not get there
    const fewer = plan.repeats!.chosen.slice(0, -1);
    const courses = plan.courses.reduce((s, c) => add(s, 'A', c), t.sums);
    const without = gpaOf({ points: courses.points + fewer.reduce((p, c) => p + c.gain, 0), credits: courses.credits });
    expect(without!).toBeLessThan(3.62);
  });

  it('says how far it can go when even every repeat is not enough', () => {
    // two D grades that can only come back as a B: 3.95 is out of reach
    const list = [a('Z1', 'D'), a('Z2', 'D'), a('Z3', 'A'), a('Z4', 'A')];
    const plan = planTarget(totals(list).sums, 3, 3.95, candidates(list, 'Spring 2026', 'B'));
    expect(plan.reachable).toBe(false);
    expect(plan.repeats).toBeNull();
    expect(plan.best!).toBeLessThan(3.95);
  });

  it('counts grades', () => {
    expect(Object.fromEntries(gradeCounts(['A', 'A', 'A+', 'B']))).toEqual({ A: 2, 'A+': 1, B: 1 });
  });
});
