import { describe, expect, it } from 'vitest';
import { bestPlan, candidates, scenarios } from './boost';
import { Attempt, Grade, LETTER_GRADES, gpaOf, totals } from './grades';

let n = 0;
const a = (code: string, grade: Grade, semester: string, credits = 3): Attempt => ({ id: `b${n++}`, code, title: code, credits, grade, semester });

describe('which courses can come back', () => {
  const list = [
    a('OLD101', 'B', 'Summer 2025'), // three semesters before Fall 2026: past the window
    a('WIN101', 'C', 'Fall 2025'), // the window is Spring and Summer 2026: Fall 2026 is too late
    a('NEW101', 'B-', 'Spring 2026'), // repeat by Fall 2026
    a('NEW102', 'A', 'Spring 2026'), // already an A, nothing to gain
    a('FAIL01', 'F', 'Summer 2025'), // a retake has no time limit
    a('DONE01', 'C', 'Fall 2025'), a('DONE01', 'B', 'Spring 2026'), // repeated once already
    a('F3X001', 'F', 'Fall 2024'), a('F3X001', 'F', 'Spring 2025'), a('F3X001', 'F', 'Summer 2025'), // both retakes used
  ];
  const list2 = candidates(list, 'Fall 2026', 'A');
  const find = (code: string) => list2.find((c) => c.attempt.code === code);

  it('allows a repeat only within 2 semesters of the first enrolment', () => {
    expect(find('NEW101')).toMatchObject({ kind: 'repeat', allowed: 'yes', lastChance: 'Fall 2026' });
    expect(find('WIN101')).toMatchObject({ allowed: 'permission', why: 'pastWindow' });
    expect(find('OLD101')).toMatchObject({ allowed: 'permission', why: 'pastWindow' });
  });

  it('counts the window from the semester the course was first taken', () => {
    expect(candidates(list, 'Summer 2026', 'A').find((c) => c.attempt.code === 'WIN101')).toMatchObject({ allowed: 'yes', lastChance: 'Summer 2026' });
  });

  it('lets an F be retaken twice, any time, then only by exception', () => {
    expect(find('FAIL01')).toMatchObject({ kind: 'retake', allowed: 'yes' });
    expect(find('F3X001')).toMatchObject({ kind: 'retake', allowed: 'permission', why: 'thirdRetake' });
  });

  it('allows one repeat per course', () => {
    expect(find('DONE01')).toMatchObject({ allowed: 'no', why: 'repeatedOnce' });
  });

  it('leaves out courses that would not go up', () => {
    expect(find('NEW102')).toBeUndefined();
    expect(candidates(list, 'Fall 2026', 'B').find((c) => c.attempt.code === 'NEW101')).toBeDefined();
    expect(candidates(list, 'Fall 2026', 'B').find((c) => c.attempt.code === 'OLD101')).toBeUndefined();
  });

  it('puts the biggest gain first', () => {
    const gains = list2.map((c) => c.gain);
    expect(gains).toEqual([...gains].sort((x, y) => y - x));
    expect(list2[0].attempt.grade).toBe('F');
  });
});

describe('the best plan', () => {
  it('gives the CGPA the sheet would print after the repeats', () => {
    const list = [a('A1', 'C', 'Fall 2025'), a('A2', 'A', 'Fall 2025'), a('A3', 'B', 'Fall 2025'), a('A4', 'A', 'Fall 2025')];
    const t = totals(list);
    const plan = bestPlan(t.sums, candidates(list, 'Spring 2026', 'A'), 1);
    expect(plan.chosen.map((c) => c.attempt.code)).toEqual(['A1']);
    // same as actually having an A in A1
    expect(plan.cgpa).toBe(totals([a('A1', 'A', 'Fall 2025'), ...list.slice(1)]).cgpa);
    expect(bestPlan(t.sums, candidates(list, 'Spring 2026', 'A'), 5).steps.map((s) => s.cgpa)).toEqual([3.75, 4]);
  });

  it('keeps the three scenarios apart', () => {
    const list = [a('R1', 'F', 'Fall 2024'), a('P1', 'C', 'Fall 2024'), a('W1', 'C', 'Summer 2025'), a('W2', 'A', 'Summer 2025')];
    const s = scenarios(totals(list).sums, candidates(list, 'Fall 2025', 'A'), 3);
    expect(s.retakes.chosen.map((c) => c.attempt.code)).toEqual(['R1']);
    expect(s.rules.chosen.map((c) => c.attempt.code)).toEqual(['R1', 'W1']);
    expect(s.permission.chosen.map((c) => c.attempt.code)).toEqual(['R1', 'P1', 'W1']);
  });

  it('is never beaten by trying every combination', () => {
    // a small random number generator with a fixed seed, so the test is repeatable
    let seed = 20260928;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let round = 0; round < 300; round++) {
      const count = 1 + Math.floor(rand() * 7);
      const list = [...Array(count)].map((_, i) =>
        a(`Q${i}`, LETTER_GRADES[Math.floor(rand() * LETTER_GRADES.length)], 'Fall 2025', [1, 1.5, 2, 3, 4][Math.floor(rand() * 5)]));
      const sums = totals(list).sums;
      const pool = candidates(list, 'Spring 2026', 'A');
      const k = 1 + Math.floor(rand() * 3);
      const greedy = bestPlan(sums, pool, k).exact ?? 0;
      let best = totals(list).exact ?? 0;
      for (let mask = 0; mask < 1 << pool.length; mask++) {
        const picked = pool.filter((_, i) => mask & (1 << i));
        if (picked.length > k) continue;
        const points = picked.reduce((p, c) => p + c.gain, sums.points);
        best = Math.max(best, points / (10 * sums.credits));
      }
      expect(greedy).toBeCloseTo(best, 12);
      expect(gpaOf({ points: sums.points + pool.slice(0, k).reduce((p, c) => p + c.gain, 0), credits: sums.credits })).toBe(bestPlan(sums, pool, k).cgpa);
    }
  });
});
