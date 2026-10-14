// BRACU's letter grades and the grade points each one is worth, as printed on
// the back of the grade sheet. The client has the same rules in
// src/lib/grades.ts so the calculator can run without an account.
export const GRADE_POINTS: Record<string, number> = {
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
};

// Pass, Incomplete and Withdrawal are on the sheet but not in the GPA
export const NON_GPA = ['P', 'I', 'W'];

export const GRADES = [...Object.keys(GRADE_POINTS), ...NON_GPA] as [string, ...string[]];

export const SEMESTER = /^(Spring|Summer|Fall) 20\d{2}$/;
export const COURSE_CODE = /^[A-Z]{3}\d{3}$/;

const TERM_ORDER: Record<string, number> = { Spring: 0, Summer: 1, Fall: 2 };
export const semesterKey = (name?: string) => {
  const [term, year] = (name || '').split(' ');
  return Number(year || 0) * 10 + (TERM_ORDER[term] ?? 0);
};

export interface Attempt {
  code: string;
  credits: number;
  grade: string;
  semester?: string;
}

// Grade points times ten and credits times a hundred are whole numbers, so
// the sums stay exact. With plain floats 3.895 comes out as 3.89499... and
// Math.round would give 3.89 where BRACU prints 3.90.
const tenths = (grade: string) => Math.round(GRADE_POINTS[grade] * 10);
const hundredths = (credits: number) => Math.round(credits * 100);

// BRACU rounds to three decimals first, then the third decimal decides:
// 5 or more rounds up (3.895 is 3.90, 3.894 is 3.89, 3.0647 is 3.065 so 3.07).
// Checked against every GPA and CGPA on four real grade sheets; the client's
// src/lib/grades.ts has the longer note.
export function gpaFrom(points: number, credits: number) {
  if (!credits) return null;
  const thousandths = Math.floor((200 * points + credits) / (2 * credits));
  return Math.floor((thousandths + 5) / 10) / 100;
}

// How BRACU counts a transcript:
// - a retaken course keeps only its latest attempt; the older ones are
//   marked (NT) and drop out of the CGPA, though they still show as attempted
// - P, I and W are left out of the GPA entirely
// - an F counts in the CGPA until the course is passed on a retake
// Returns which attempts count, alongside the totals.
export function transcript<T extends Attempt>(attempts: T[]) {
  const latest = new Map<string, T>();
  // oldest first, so a later attempt of the same course overwrites an earlier one
  const ordered = attempts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => semesterKey(x.a.semester) - semesterKey(y.a.semester) || x.i - y.i)
    .map(({ a }) => a);
  // a W or an I decides nothing, so it never pushes out an earlier result
  const settles = (g: string) => g !== 'I' && g !== 'W';
  for (const a of ordered) {
    const before = latest.get(a.code);
    if (!before || settles(a.grade) || !settles(before.grade)) latest.set(a.code, a);
  }

  let points = 0;
  let gpaCredits = 0;
  let attempted = 0;
  let earned = 0;
  for (const a of ordered) {
    const cr = hundredths(a.credits);
    const counted = latest.get(a.code) === a;
    if (!NON_GPA.includes(a.grade)) attempted += cr;
    if (!counted) continue;
    if (a.grade in GRADE_POINTS) {
      points += tenths(a.grade) * cr;
      gpaCredits += cr;
    }
    if (a.grade !== 'F' && a.grade !== 'I' && a.grade !== 'W') earned += cr;
  }

  const cgpa = gpaFrom(points, gpaCredits);
  return { counted: new Set(latest.values()), cgpa, earned: earned / 100, attempted: attempted / 100, standing: standing(cgpa) };
}

// academic standing: under 2.00 is probation (the policy for students who
// joined in Summer 2022 or later). "Unsatisfactory" on the grade sheet also
// depends on the first semester and on semesters in a row, which one number
// cannot tell, so it is left to the full timeline on the CGPA page.
export const standing = (cgpa: number | null) => (cgpa === null ? null : cgpa >= 2 ? 'satisfactory' : 'probation');
