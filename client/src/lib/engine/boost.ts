import { Attempt, byDate, countedAttempts, exactOf, gpaOf, GRADE_POINTS, isLetter, LetterGrade, semesterIndex, semesterName, Sums } from './grades';

export type Kind = 'retake' | 'repeat';
export type Allowed = 'yes' | 'permission' | 'no';
export type Why = 'repeatedOnce' | 'pastWindow' | 'thirdRetake' | null;

export interface Candidate {
  attempt: Attempt;
  kind: Kind;
  allowed: Allowed;
  why: Why;
  firstSemester: string;
  lastChance: string | null;
  gain: number;
}

const tenths = (g: LetterGrade) => Math.round(GRADE_POINTS[g] * 10);
const hundredths = (c: number) => Math.round(c * 100);
const passed = (a: Attempt) => a.grade !== 'F' && a.grade !== 'I' && a.grade !== 'W';

export function candidates(attempts: Attempt[], next: string, hope: LetterGrade = 'A'): Candidate[] {
  const counted = countedAttempts(attempts);
  const out: Candidate[] = [];
  for (const now of counted.values()) {
    if (!isLetter(now.grade) || now.credits <= 0 || GRADE_POINTS[now.grade] >= GRADE_POINTS[hope]) continue;
    const history = attempts.filter((a) => a.code === now.code).sort(byDate);
    const first = history[0].semester;
    const gain = (tenths(hope) - tenths(now.grade)) * hundredths(now.credits);

    if (now.grade === 'F') {
      const firstF = history.findIndex((a) => a.grade === 'F');
      const used = history.length - 1 - firstF;
      out.push({ attempt: now, kind: 'retake', allowed: used < 2 ? 'yes' : 'permission', why: used < 2 ? null : 'thirdRetake', firstSemester: first, lastChance: null, gain });
      continue;
    }

    const passes = history.filter(passed).length;
    const lastChance = semesterName(semesterIndex(first) + 2);
    if (passes > 1) {
      out.push({ attempt: now, kind: 'repeat', allowed: 'no', why: 'repeatedOnce', firstSemester: first, lastChance: null, gain });
      continue;
    }
    const inTime = semesterIndex(next) - semesterIndex(first) <= 2;
    out.push({
      attempt: now,
      kind: 'repeat',
      allowed: inTime ? 'yes' : 'permission',
      why: inTime ? null : 'pastWindow',
      firstSemester: first,
      lastChance: inTime ? lastChance : null,
      gain,
    });
  }
  return out.sort((a, b) => b.gain - a.gain || GRADE_POINTS[a.attempt.grade as LetterGrade] - GRADE_POINTS[b.attempt.grade as LetterGrade] || a.attempt.code.localeCompare(b.attempt.code));
}

export interface Plan {
  chosen: Candidate[];
  cgpa: number | null;
  exact: number | null;
  steps: { count: number; cgpa: number | null }[];
}

export function bestPlan(sums: Sums, pool: Candidate[], count: number): Plan {
  const chosen = pool.slice(0, Math.max(0, count));
  const steps: Plan['steps'] = [];
  let points = sums.points;
  chosen.forEach((c, i) => {
    points += c.gain;
    steps.push({ count: i + 1, cgpa: gpaOf({ points, credits: sums.credits }) });
  });
  const after = { points, credits: sums.credits };
  return { chosen, cgpa: gpaOf(after), exact: exactOf(after), steps };
}

export function scenarios(sums: Sums, all: Candidate[], count: number) {
  return {
    retakes: bestPlan(sums, all.filter((c) => c.kind === 'retake' && c.allowed === 'yes'), count),
    rules: bestPlan(sums, all.filter((c) => c.allowed === 'yes'), count),
    permission: bestPlan(sums, all.filter((c) => c.allowed !== 'no'), count),
  };
}

export const gainFor = (attempt: Attempt, grade: LetterGrade) =>
  Math.max(0, tenths(grade) - tenths(attempt.grade as LetterGrade)) * hundredths(attempt.credits);

export const cgpaWithGains = (sums: Sums, gains: number[]) => {
  const after = { points: sums.points + gains.reduce((n, g) => n + g, 0), credits: sums.credits };
  return { cgpa: gpaOf(after), exact: exactOf(after) };
};
