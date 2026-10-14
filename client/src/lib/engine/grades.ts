// Everything here follows BRAC University's published rules
// (bracu.ac.bd/academics/policies-and-procedures, read September 2026) and
// was checked against real grade sheets: every semester GPA, CGPA and credit
// total they print comes out the same. This engine is shared with BRACU CGPA Analyzer, my
// stand-alone CGPA calculator, where the real-sheet checks live; change it
// there first, then copy it here and run `npm test`.

export const GRADE_POINTS = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  'D-': 0.7,
  F: 0.0,
} as const;

export type LetterGrade = keyof typeof GRADE_POINTS;
// Pass, Incomplete and Withdrawal are on the sheet but carry no grade points
export type Grade = LetterGrade | 'P' | 'I' | 'W';

export const LETTER_GRADES = Object.keys(GRADE_POINTS) as LetterGrade[];
export const ALL_GRADES: Grade[] = [...LETTER_GRADES, 'P', 'I', 'W'];

// marks for each grade, from the policy page; A+ exists from Fall 2020
export const MARKS: Record<LetterGrade, [number, number]> = {
  'A+': [97, 100], A: [90, 97], 'A-': [85, 90], 'B+': [80, 85], B: [75, 80], 'B-': [70, 75],
  'C+': [65, 70], C: [60, 65], 'C-': [57, 60], 'D+': [55, 57], D: [52, 55], 'D-': [50, 52], F: [0, 50],
};

export const isLetter = (g: string): g is LetterGrade => g in GRADE_POINTS;
// grades that decide nothing yet (I) or were never taken (W) do not replace an earlier result
const settles = (g: Grade) => g !== 'I' && g !== 'W';
const earns = (g: Grade) => g !== 'F' && g !== 'I' && g !== 'W';

// ---------------------------------------------------------------- semesters

export const TERMS = ['Spring', 'Summer', 'Fall'] as const;
export type Term = (typeof TERMS)[number];

// Spring 2024 < Summer 2024 < Fall 2024 < Spring 2025: one step per semester
export function semesterIndex(name: string) {
  const [term, year] = name.split(' ');
  const t = TERMS.indexOf(term as Term);
  return t < 0 || !Number(year) ? -1 : Number(year) * 3 + t;
}

export const semesterName = (index: number) => `${TERMS[index % 3]} ${Math.floor(index / 3)}`;
export const nextSemester = (name: string) => semesterName(semesterIndex(name) + 1);

// ------------------------------------------------------------------ attempts

export interface Attempt {
  id: string;
  code: string;
  title: string;
  credits: number;
  grade: Grade;
  semester: string;
}

// Grade points times ten and credits times a hundred are whole numbers, so
// every sum below is exact. Floating point is not: 3.895 is stored as
// 3.89499..., and Math.round would give 3.89 where the sheet prints 3.90.
const tenths = (g: LetterGrade) => Math.round(GRADE_POINTS[g] * 10);
const hundredths = (credits: number) => Math.round(credits * 100);

export interface Sums {
  points: number; // sum of tenths(grade) * hundredths(credits)
  credits: number; // sum of hundredths(credits)
}

// How BRACU rounds, found by testing against every printed GPA and CGPA:
// the value is first taken to three decimals, then a 5 or more in the third
// decimal rounds up. 3.895 is 3.90, 3.894 is 3.89, and 156.3 / 51 = 3.0647
// becomes 3.065 and so 3.07, which is what the sheet prints. Rounding straight
// to two places would give 3.06.
export function gpaOf({ points, credits }: Sums): number | null {
  if (!credits) return null;
  const thousandths = Math.floor((200 * points + credits) / (2 * credits));
  return Math.floor((thousandths + 5) / 10) / 100;
}

// the unrounded value, only for ordering and comparing, never for showing
export const exactOf = ({ points, credits }: Sums) => (credits ? points / (10 * credits) : null);

export const add = (s: Sums, grade: LetterGrade, credits: number): Sums => ({
  points: s.points + tenths(grade) * hundredths(credits),
  credits: s.credits + hundredths(credits),
});

// A semester's own GPA: every letter-graded course taken that term counts,
// even one a later repeat replaced, because that is what the term was.
export function semesterSums(attempts: Attempt[]): Sums {
  let s: Sums = { points: 0, credits: 0 };
  for (const a of attempts) if (isLetter(a.grade)) s = add(s, a.grade, a.credits);
  return s;
}

export const byDate = (a: Attempt, b: Attempt) => semesterIndex(a.semester) - semesterIndex(b.semester);

// Which attempt of each course counts towards the CGPA.
// - Repeat (to improve a grade): "the latest grade earned would be counted",
//   even when it is lower.
// - Retake (after an F): "the best of the grades received will be counted".
//   A retake only happens after an F, so the best of that chain is simply the
//   latest one that is not another F, which is the same as the latest.
// - W and I decide nothing, so they never push out an earlier result.
// The attempts a later one replaced are the NT rows on the sheet.
export function countedAttempts(attempts: Attempt[]) {
  const counted = new Map<string, Attempt>();
  for (const a of [...attempts].sort(byDate)) {
    const before = counted.get(a.code);
    if (!before || settles(a.grade) || !settles(before.grade)) counted.set(a.code, a);
  }
  return counted;
}

export interface Totals {
  cgpa: number | null;
  exact: number | null;
  sums: Sums; // counted letter grades, the CGPA's own numbers
  attempted: number; // every letter-graded attempt, NT ones included, as the sheet counts it
  earned: number;
  counted: Map<string, Attempt>;
}

export function totals(attempts: Attempt[]): Totals {
  const counted = countedAttempts(attempts);
  let sums: Sums = { points: 0, credits: 0 };
  let earned = 0;
  for (const a of counted.values()) {
    if (isLetter(a.grade)) sums = add(sums, a.grade, a.credits);
    if (earns(a.grade)) earned += hundredths(a.credits);
  }
  const attempted = attempts.reduce((n, a) => n + (isLetter(a.grade) ? hundredths(a.credits) : 0), 0);
  return { cgpa: gpaOf(sums), exact: exactOf(sums), sums, attempted: attempted / 100, earned: earned / 100, counted };
}

// ------------------------------------------------------- semester timeline

export interface TermRow {
  semester: string;
  attempts: Attempt[];
  gpa: number | null;
  attempted: number;
  earned: number;
  cgpa: number | null;
  cumAttempted: number;
  cumEarned: number;
  change: number | null; // CGPA change against the semester before, in hundredths
  list: HonourList;
  listWhy: ListReason | null; // why a semester with a good GPA still missed out
}

export type HonourList = 'vc' | 'dean' | null;
export type ListReason = 'credits' | 'failed' | 'repeat' | 'gpa';

// The semester lists. From the Academic Standings and Honors page: at least 12
// letter-graded credits (P/F does not count), no F, W or I, no retake or
// repeat that semester, and a GPA of 3.70 or more. BRACU's own news pages put
// the line between the two at 3.90: "students earning a GPA of 3.9-4.0 are
// placed in the VC's List, whereas those attaining a GPA of 3.70-3.89 is placed
// in the Dean's List". A real transcript agrees: 3.83 was printed as Dean's
// List, every 4.00 as VC's List, and a 4.00 semester with repeats, or with only
// 9 credits, got neither. (The Residential Semester asks for 9 credits; the
// sheet does not say which semester that was, so 12 is used throughout.)
function honourList(rows: Attempt[], earlier: Set<string>, gpa: number | null): [HonourList, ListReason | null] {
  const letterCredits = rows.filter((a) => isLetter(a.grade)).reduce((n, a) => n + a.credits, 0);
  if (letterCredits < 12) return [null, 'credits'];
  if (rows.some((a) => a.grade === 'F' || a.grade === 'W' || a.grade === 'I')) return [null, 'failed'];
  if (rows.some((a) => earlier.has(a.code))) return [null, 'repeat'];
  if (gpa === null || gpa < 3.7) return [null, 'gpa'];
  return [gpa >= 3.9 ? 'vc' : 'dean', null];
}

export function timeline(attempts: Attempt[]): TermRow[] {
  const names = [...new Set(attempts.map((a) => a.semester))].sort((a, b) => semesterIndex(a) - semesterIndex(b));
  const seen = new Set<string>();
  const rows: TermRow[] = [];
  for (const name of names) {
    const here = attempts.filter((a) => a.semester === name);
    const upTo = attempts.filter((a) => semesterIndex(a.semester) <= semesterIndex(name));
    const t = totals(upTo);
    const gpa = gpaOf(semesterSums(here));
    const before = [...rows].reverse().find((r) => r.cgpa !== null);
    const [list, why] = honourList(here, seen, gpa);
    rows.push({
      semester: name,
      attempts: here,
      gpa,
      attempted: here.reduce((n, a) => n + (isLetter(a.grade) ? hundredths(a.credits) : 0), 0) / 100,
      earned: here.reduce((n, a) => n + (earns(a.grade) ? hundredths(a.credits) : 0), 0) / 100,
      cgpa: t.cgpa,
      cumAttempted: t.attempted,
      cumEarned: t.earned,
      change: before && t.cgpa !== null ? Math.round((t.cgpa - before.cgpa!) * 100) : null,
      list,
      listWhy: why,
    });
    here.forEach((a) => seen.add(a.code));
  }
  return rows;
}

// --------------------------------------------------------- standing, level

export type Level = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'advancedSenior';

// student classification by earned credits, from the policy page
export function levelOf(earned: number): Level {
  if (earned <= 30) return 'freshman';
  if (earned <= 60) return 'sophomore';
  if (earned <= 90) return 'junior';
  if (earned <= 140) return 'senior';
  return 'advancedSenior';
}

export interface Standing {
  policy: 'current' | 'before2022';
  threshold: number;
  status: 'good' | 'probation' | 'review';
  semestersBelow: number; // consecutive semesters, ending now, with the CGPA under the line
  allowed: number; // semesters BRACU gives to get back above it
}

// Probation. Students who joined in Summer 2022 or later: a CGPA under 2.00
// puts you on probation for the next semester, and you have three consecutive
// semesters to get back to 2.00 (the policy's "considered for withdrawal"
// comes after that). Before Summer 2022 the line was 1.50 with two semesters.
export function standingOf(rows: TermRow[], semestersAllowed = 3): Standing | null {
  const graded = rows.filter((r) => r.cgpa !== null);
  if (!graded.length) return null;
  const current = semesterIndex(rows[0].semester) >= semesterIndex('Summer 2022');
  const threshold = current ? 2 : 1.5;
  // Pharmacy and LLB get 2 semesters under the current policy, everyone else 3
  const allowed = current ? semestersAllowed : 2;
  let below = 0;
  for (const r of graded) below = r.cgpa! < threshold ? below + 1 : 0;
  return {
    policy: current ? 'current' : 'before2022',
    threshold,
    semestersBelow: below,
    allowed,
    status: below === 0 ? 'good' : below > allowed ? 'review' : 'probation',
  };
}

export type Honour = 'highest' | 'high' | 'distinction' | null;

// graduation distinctions by CGPA, from the Academic Standings and Honors page
export function honourOf(cgpa: number | null): Honour {
  if (cgpa === null) return null;
  if (cgpa >= 3.8) return 'highest';
  if (cgpa >= 3.65) return 'high';
  if (cgpa >= 3.5) return 'distinction';
  return null;
}

// ------------------------------------------------------------------- targets

// The average GPA the next `credits` would need for the CGPA to reach `target`
// as BRACU prints it. With the two-step rounding a CGPA already prints as the
// target from target - 0.0055 up (3.0645 goes to 3.065 and then 3.07), so
// that is the real line to reach.
export function neededGpa(sums: Sums, target: number, credits: number) {
  if (credits <= 0) return null;
  const line = target - 0.0055;
  const have = sums.points / 1000; // grade points times credits, in real units
  const had = sums.credits / 100;
  return (line * (had + credits) - have) / credits;
}

// the CGPA after adding new courses on top of what is there
export function withNewCourses(sums: Sums, courses: { grade: LetterGrade; credits: number }[]) {
  return gpaOf(courses.reduce((s, c) => add(s, c.grade, c.credits), sums));
}

// The CGPA at graduation if every remaining credit comes in at `points` grade
// points (4.0 for straight A grades, or any average). `remaining` is the
// program's credits minus what is already earned.
export function projectedCgpa(sums: Sums, remaining: number, points: number) {
  if (remaining <= 0) return gpaOf(sums);
  return gpaOf({ points: sums.points + Math.round(points * 10 * remaining * 100), credits: sums.credits + Math.round(remaining * 100) });
}

// half of what is left at one average, the other half at another
export function projectedSplit(sums: Sums, remaining: number, first: number, second: number) {
  if (remaining <= 0) return gpaOf(sums);
  const half = remaining / 2;
  const points = Math.round(first * 10 * half * 100) + Math.round(second * 10 * (remaining - half) * 100);
  return gpaOf({ points: sums.points + points, credits: sums.credits + Math.round(remaining * 100) });
}
