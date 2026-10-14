import { describe, expect, it } from 'vitest';
import {
  Attempt, Grade, gpaOf, honourOf, levelOf, neededGpa, nextSemester, projectedCgpa, projectedSplit, semesterIndex, semesterSums, standingOf, timeline, totals, withNewCourses,
} from './grades';

let n = 0;
const a = (code: string, grade: Grade, semester = 'Fall 2024', credits = 3): Attempt => ({ id: `t${n++}`, code, title: code, credits, grade, semester });
const cgpa = (list: Attempt[]) => totals(list).cgpa;

describe('rounding, the way the grade sheet prints it', () => {
  it('rounds 3.895 up to 3.90', () => {
    // 7 credits of A- and 13 of A: 77.9 / 20 = 3.895 exactly
    const list = [a('X1', 'A-', 'Fall 2024', 3), a('X2', 'A-', 'Fall 2024', 4), a('X3', 'A'), a('X4', 'A'), a('X5', 'A'), a('X6', 'A', 'Fall 2024', 4)];
    expect(cgpa(list)).toBe(3.9);
  });

  it('leaves 3.894 at 3.89', () => {
    // 53 credits of A- and 97 of A: 584.1 / 150 = 3.894 exactly
    const list = [...Array(8)].map((_, i) => a(`M${i}`, 'A-', 'Fall 2024', 6)).concat(a('M9', 'A-', 'Fall 2024', 5));
    list.push(...[...Array(16)].map((_, i) => a(`P${i}`, 'A', 'Fall 2024', 6)), a('P99', 'A', 'Fall 2024', 1));
    expect(cgpa(list)).toBe(3.89);
  });

  it('goes to three places first: 3.0647 prints as 3.07, like the real sheet', () => {
    const grades: Grade[] = ['A', 'A', 'A-', 'A-', 'B+', 'B+', 'A-', 'B', 'B+', 'B', 'B', 'A-', 'B', 'A-', 'F', 'A-', 'F'];
    expect(cgpa(grades.map((g, i) => a(`R${i}`, g)))).toBe(3.07);
  });

  it('works on the whole-number sums directly', () => {
    expect(gpaOf({ points: 0, credits: 0 })).toBeNull();
    // 3.0644 has thousandths 3.064, so it stays 3.06
    expect(gpaOf({ points: 30644, credits: 1000 })).toBe(3.06);
    // 3.0645 rounds to 3.065 first, then up
    expect(gpaOf({ points: 30645, credits: 1000 })).toBe(3.07);
    expect(gpaOf({ points: 40 * 300, credits: 300 })).toBe(4);
  });
});

describe('which attempt counts', () => {
  it('a repeat replaces the old grade, even when it is lower', () => {
    expect(cgpa([a('CSE110', 'B', 'Fall 2024'), a('CSE110', 'C', 'Spring 2025')])).toBe(2);
  });

  it('a retake after an F counts, and the F stays in credits attempted', () => {
    const t = totals([a('MAT120', 'F', 'Fall 2022'), a('MAT120', 'F', 'Spring 2023'), a('MAT120', 'C', 'Spring 2024')]);
    expect(t).toMatchObject({ cgpa: 2, attempted: 9, earned: 3 });
  });

  it('goes by semester order, not by the order they were typed in', () => {
    expect(cgpa([a('ENG101', 'A', 'Summer 2025'), a('ENG101', 'B', 'Spring 2025')])).toBe(4);
  });

  it('a W or an I on a second attempt leaves the first grade in place', () => {
    expect(cgpa([a('PHY111', 'B', 'Fall 2024'), a('PHY111', 'W', 'Spring 2025')])).toBe(3);
    expect(cgpa([a('PHY111', 'B', 'Fall 2024'), a('PHY111', 'I', 'Spring 2025')])).toBe(3);
    // and once the I becomes a grade, that grade counts
    expect(cgpa([a('PHY111', 'B', 'Fall 2024'), a('PHY111', 'I', 'Spring 2025'), a('PHY111', 'A', 'Summer 2025')])).toBe(4);
  });

  it('keeps P, I and W out of the GPA; a P still earns its credits', () => {
    const t = totals([a('A1', 'B'), a('A2', 'P'), a('A3', 'W'), a('A4', 'I')]);
    expect(t).toMatchObject({ cgpa: 3, attempted: 3, earned: 6 });
  });

  it('counts an F in the CGPA until it is passed', () => {
    expect(totals([a('A1', 'A'), a('A2', 'F')])).toMatchObject({ cgpa: 2, attempted: 6, earned: 3 });
  });

  it('ignores zero-credit remedial courses', () => {
    expect(totals([a('ENG091', 'B+', 'Summer 2021', 0), a('MAT092', 'P', 'Summer 2021', 0), a('ENG101', 'A', 'Fall 2021')])).toMatchObject({ cgpa: 4, attempted: 3 });
  });
});

describe('the semester timeline', () => {
  const list = [
    a('CSE110', 'B+', 'Summer 2022'), a('ENG101', 'B+', 'Summer 2022'), a('MAT110', 'A', 'Summer 2022'),
    a('CSE111', 'A', 'Fall 2022'), a('CSE230', 'A', 'Fall 2022'), a('PHY111', 'B+', 'Fall 2022'), a('STA201', 'A', 'Fall 2022'),
    a('CSE110', 'A', 'Spring 2025'), a('CSE341', 'A', 'Spring 2025'), a('CHN101', 'A', 'Spring 2025'), a('PHY111', 'A', 'Spring 2025'),
  ];
  const rows = timeline(list);

  it('matches the grade sheet semester by semester', () => {
    expect(rows.map((r) => [r.semester, r.gpa, r.cgpa, r.cumAttempted, r.cumEarned])).toEqual([
      ['Summer 2022', 3.53, 3.53, 9, 9],
      ['Fall 2022', 3.83, 3.7, 21, 21],
      // two repeats: the old B+ attempts drop out of the CGPA but stay attempted
      // (8 A + one B+) x 3 credits = 105.9 over 27 credits = 3.922
      ['Spring 2025', 4, 3.92, 33, 27],
    ]);
  });

  it('keeps a repeated course in the old semester GPA', () => {
    expect(rows[0].gpa).toBe(gpaOf(semesterSums(list.slice(0, 3))));
  });

  it('records how much each semester moved the CGPA', () => {
    expect(rows.map((r) => r.change)).toEqual([null, 17, 22]);
  });

  it("puts 3.70 to 3.89 on the Dean's List and 3.90 up on the VC's List", () => {
    // Summer 2022 has 9 credits, Fall 2022 is 3.83, Spring 2025 has repeats
    expect(rows.map((r) => [r.list, r.listWhy])).toEqual([[null, 'credits'], ['dean', null], [null, 'repeat']]);
    expect(timeline([a('V1', 'A'), a('V2', 'A+'), a('V3', 'A'), a('V4', 'A')])[0].list).toBe('vc');
    // A A A A- over 12 credits is 3.925, printed 3.93: VC
    expect(timeline([a('W1', 'A'), a('W2', 'A'), a('W3', 'A'), a('W4', 'A-')])[0].list).toBe('vc');
    // A A- A- A is 3.85: Dean
    expect(timeline([a('X1', 'A'), a('X2', 'A-'), a('X3', 'A-'), a('X4', 'A')])[0].list).toBe('dean');
    const failed = timeline([a('A1', 'A'), a('A2', 'A'), a('A3', 'A'), a('A4', 'A'), a('A5', 'W', 'Fall 2024', 3)]);
    expect(failed[0].listWhy).toBe('failed');
    const low = timeline([a('A1', 'A'), a('A2', 'A'), a('A3', 'B+'), a('A4', 'B')]);
    expect(low[0].listWhy).toBe('gpa');
  });
});

describe('standing, level and honours', () => {
  const term = (semester: string, grade: Grade) => [a(`${semester}1`, grade, semester), a(`${semester}2`, grade, semester)];

  it('puts a CGPA under 2.00 on probation, with three semesters to recover', () => {
    // CGPA 1.00, then 1.50: two semesters under 2.00
    const rows = timeline([...term('Summer 2022', 'D'), ...term('Fall 2022', 'C')]);
    expect(standingOf(rows)).toMatchObject({ policy: 'current', threshold: 2, status: 'probation', semestersBelow: 2, allowed: 3 });
  });

  it('flags a fourth semester under the line for review', () => {
    const rows = timeline(['Fall 2022', 'Spring 2023', 'Summer 2023', 'Fall 2023'].flatMap((s) => term(s, 'D')));
    expect(standingOf(rows)?.status).toBe('review');
  });

  it('uses the old 1.50 line for students who started before Summer 2022', () => {
    const rows = timeline([...term('Fall 2021', 'D+'), ...term('Spring 2022', 'D+')]);
    expect(standingOf(rows)).toMatchObject({ policy: 'before2022', threshold: 1.5, status: 'probation' });
  });

  it('is in good standing once the CGPA is back above the line', () => {
    const rows = timeline([...term('Fall 2022', 'D'), ...term('Spring 2023', 'A'), ...term('Summer 2023', 'A')]);
    expect(standingOf(rows)).toMatchObject({ status: 'good', semestersBelow: 0 });
  });

  it('names the year level by earned credits', () => {
    expect([0, 30, 31, 60, 61, 90, 91, 140, 141].map(levelOf)).toEqual([
      'freshman', 'freshman', 'sophomore', 'sophomore', 'junior', 'junior', 'senior', 'senior', 'advancedSenior',
    ]);
  });

  it('gives the distinction bands at 3.50, 3.65 and 3.80', () => {
    expect([3.49, 3.5, 3.64, 3.65, 3.79, 3.8, 4].map(honourOf)).toEqual([null, 'distinction', 'distinction', 'high', 'high', 'highest', 'highest']);
  });
});

describe('graduation projections', () => {
  const list = [a('P1', 'B'), a('P2', 'B'), a('P3', 'B'), a('P4', 'B')]; // 3.00 over 12
  const sums = totals(list).sums;

  it('works out the CGPA if every remaining credit is a 4.00, or a 3.70', () => {
    // (36 + 4 x 24) / 36 = 3.667
    expect(projectedCgpa(sums, 24, 4)).toBe(3.67);
    // (36 + 3.7 x 24) / 36 = 3.467
    expect(projectedCgpa(sums, 24, 3.7)).toBe(3.47);
    expect(projectedCgpa(sums, 0, 4)).toBe(3);
  });

  it('splits the remaining credits in half', () => {
    // 12 credits at 4.00 and 12 at 3.00 on top of 12 at 3.00: 120 / 36 = 3.33
    expect(projectedSplit(sums, 24, 4, 3)).toBe(3.33);
  });
});

describe('targets and new courses', () => {
  it('works out the GPA needed so the printed CGPA reaches the target', () => {
    const sums = totals([a('A1', 'B'), a('A2', 'B'), a('A3', 'B'), a('A4', 'B')]).sums; // 3.00 over 12
    const need = neededGpa(sums, 3.5, 12)!;
    expect(need).toBeCloseTo(3.989, 3);
    // an A- (3.7) average over 12 more credits is not enough, all A is
    expect(withNewCourses(sums, [...Array(4)].map(() => ({ grade: 'A-' as const, credits: 3 })))).toBe(3.35);
    expect(withNewCourses(sums, [...Array(4)].map(() => ({ grade: 'A' as const, credits: 3 })))).toBe(3.5);
  });

  it('steps through semesters in order', () => {
    expect(nextSemester('Spring 2026')).toBe('Summer 2026');
    expect(nextSemester('Fall 2026')).toBe('Spring 2027');
    expect(semesterIndex('Nonsense')).toBe(-1);
  });
});
