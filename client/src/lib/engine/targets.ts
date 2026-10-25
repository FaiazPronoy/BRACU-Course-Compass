import type { Candidate } from './boost';
import { add, gpaOf, LetterGrade, Sums } from './grades';

export interface Mix {
  high: LetterGrade;
  low: LetterGrade;
  highCourses: number;
  lowCourses: number;
  cgpa: number;
}

export interface TargetPlan {
  courses: number[];
  reachable: boolean;
  allFour: number | null;
  mixes: Mix[];
  repeats: { chosen: Candidate[]; cgpa: number | null } | null;
  best: number | null;
}

export function splitCourses(credits: number): number[] {
  const out: number[] = [];
  let left = Math.max(0, Math.round(credits * 2) / 2);
  while (left >= 3) {
    out.push(3);
    left -= 3;
  }
  if (left > 0) out.push(left);
  return out;
}

const withCourses = (sums: Sums, courses: number[], grades: LetterGrade[]) =>
  courses.reduce((s, credits, i) => add(s, grades[i], credits), sums);

const PAIRS: [LetterGrade, LetterGrade][] = [
  ['A-', 'B+'],
  ['A-', 'B'],
  ['A', 'B+'],
  ['A', 'A-'],
];

export function planTarget(sums: Sums, remaining: number, target: number, pool: Candidate[] = []): TargetPlan {
  const courses = splitCourses(remaining);
  const n = courses.length;
  const reaches = (s: Sums) => (gpaOf(s) ?? 0) >= target - 1e-9;
  const allFourSums = withCourses(sums, courses, courses.map(() => 'A'));
  const allFour = n ? gpaOf(allFourSums) : gpaOf(sums);
  const reachable = n > 0 && reaches(allFourSums);

  const mixes: Mix[] = [];
  if (reachable) {
    const seen = new Set<string>();
    for (const g of ['B', 'B+', 'A-', 'A'] as LetterGrade[]) {
      const s = withCourses(sums, courses, courses.map(() => g));
      if (reaches(s)) {
        mixes.push({ high: g, low: g, highCourses: n, lowCourses: 0, cgpa: gpaOf(s)! });
        seen.add(`${g}:${n}`);
        break;
      }
    }
    for (const [high, low] of PAIRS) {
      if (reaches(withCourses(sums, courses, courses.map(() => low)))) continue;
      for (let k = 1; k <= n; k++) {
        const grades = courses.map((_, i) => (i < k ? high : low));
        const s = withCourses(sums, courses, grades);
        if (reaches(s)) {
          if (k < n && !seen.has(`${high}:${k}:${low}`)) {
            mixes.push({ high, low, highCourses: k, lowCourses: n - k, cgpa: gpaOf(s)! });
            seen.add(`${high}:${k}:${low}`);
          }
          break;
        }
      }
    }
  }

  let repeats: TargetPlan['repeats'] = null;
  let best = allFour;
  if (!reachable && pool.length) {
    let points = allFourSums.points;
    const chosen: Candidate[] = [];
    for (const c of pool) {
      points += c.gain;
      chosen.push(c);
      const cgpa = gpaOf({ points, credits: allFourSums.credits });
      best = cgpa;
      if ((cgpa ?? 0) >= target - 1e-9) {
        repeats = { chosen: [...chosen], cgpa };
        break;
      }
    }
  }

  return { courses, reachable, allFour, mixes, repeats, best };
}

export function gradeCounts(grades: string[]) {
  const counts = new Map<string, number>();
  for (const g of grades) counts.set(g, (counts.get(g) ?? 0) + 1);
  return counts;
}
