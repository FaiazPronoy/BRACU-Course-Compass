// "Which courses should I repeat or retake?"
//
// BRACU's Retake and Repeat policy (bracu.ac.bd, read September 2026):
// - Retake: a course with an F may be retaken twice; a third time only by
//   exception, arranged by the Head of Department or the Dean. The best grade counts.
// - Repeat: a passed course may be repeated once to improve the grade, within
//   2 semesters of the first enrolment. The latest grade counts, whatever it is.
//   Going past the 2 semesters needs the Head of Department's permission.
//
// Either way the new grade takes the old one's place and the course's credits
// are already in the CGPA, so the credits the CGPA divides by stay the same and
// only the points change. That makes each course's gain independent of the
// others, so the best n courses are simply the n biggest gains.
import { Attempt, byDate, countedAttempts, exactOf, gpaOf, GRADE_POINTS, isLetter, LetterGrade, semesterIndex, semesterName, Sums } from './grades';

export type Kind = 'retake' | 'repeat';
export type Allowed = 'yes' | 'permission' | 'no';
export type Why = 'repeatedOnce' | 'pastWindow' | 'thirdRetake' | null;

export interface Candidate {
  attempt: Attempt; // the attempt that counts now
  kind: Kind;
  allowed: Allowed;
  why: Why;
  firstSemester: string;
  lastChance: string | null; // last semester a repeat is allowed without permission
  gain: number; // grade points gained, in the same whole units as Sums.points
}

const tenths = (g: LetterGrade) => Math.round(GRADE_POINTS[g] * 10);
const hundredths = (c: number) => Math.round(c * 100);
const passed = (a: Attempt) => a.grade !== 'F' && a.grade !== 'I' && a.grade !== 'W';

// every course that could raise the CGPA if it came back at `hope`
export function candidates(attempts: Attempt[], next: string, hope: LetterGrade = 'A'): Candidate[] {
  const counted = countedAttempts(attempts);
  const out: Candidate[] = [];
  for (const now of counted.values()) {
    if (!isLetter(now.grade) || now.credits <= 0 || GRADE_POINTS[now.grade] >= GRADE_POINTS[hope]) continue;
    const history = attempts.filter((a) => a.code === now.code).sort(byDate);
    const first = history[0].semester;
    const gain = (tenths(hope) - tenths(now.grade)) * hundredths(now.credits);

    if (now.grade === 'F') {
      // attempts after the first F are retakes; two are allowed
      const firstF = history.findIndex((a) => a.grade === 'F');
      const used = history.length - 1 - firstF;
      out.push({ attempt: now, kind: 'retake', allowed: used < 2 ? 'yes' : 'permission', why: used < 2 ? null : 'thirdRetake', firstSemester: first, lastChance: null, gain });
      continue;
    }

    // a passed course that was already passed before has had its one repeat
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
  // biggest gain first; on a tie, the lower grade and then the course code
  return out.sort((a, b) => b.gain - a.gain || GRADE_POINTS[a.attempt.grade as LetterGrade] - GRADE_POINTS[b.attempt.grade as LetterGrade] || a.attempt.code.localeCompare(b.attempt.code));
}

export interface Plan {
  chosen: Candidate[];
  cgpa: number | null;
  exact: number | null;
  // the CGPA after the first 1, 2, 3 ... of them
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

// the three ways to look at it, from the strictest
export function scenarios(sums: Sums, all: Candidate[], count: number) {
  return {
    retakes: bestPlan(sums, all.filter((c) => c.kind === 'retake' && c.allowed === 'yes'), count),
    rules: bestPlan(sums, all.filter((c) => c.allowed === 'yes'), count),
    permission: bestPlan(sums, all.filter((c) => c.allowed !== 'no'), count),
  };
}

// what one course adds if it comes back at `grade` (for the pick-your-own list)
export const gainFor = (attempt: Attempt, grade: LetterGrade) =>
  Math.max(0, tenths(grade) - tenths(attempt.grade as LetterGrade)) * hundredths(attempt.credits);

export const cgpaWithGains = (sums: Sums, gains: number[]) => {
  const after = { points: sums.points + gains.reduce((n, g) => n + g, 0), credits: sums.credits };
  return { cgpa: gpaOf(after), exact: exactOf(after) };
};
