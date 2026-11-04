import { ALL_GRADES as ENGINE_ALL, GRADE_POINTS, LETTER_GRADES, TERMS } from './engine/grades';

export { GRADE_POINTS, TERMS };
export const GRADES: string[] = LETTER_GRADES;
export const ALL_GRADES: string[] = ENGINE_ALL;

// a letter grade with its points, "A (4.00)"; P, I and W carry no points.
// num is the page's number formatter, so Bangla shows Bangla digits
export const withPoints = (g: string, num: (n: number, digits?: number) => string = (n, d) => n.toFixed(d)) =>
  g in GRADE_POINTS ? `${g} (${num(GRADE_POINTS[g as keyof typeof GRADE_POINTS], 2)})` : g;

export function currentSemester(d = new Date()) {
  const m = d.getMonth();
  return `${m < 4 ? 'Spring' : m < 8 ? 'Summer' : 'Fall'} ${d.getFullYear()}`;
}

export function recentSemesters(count = 12, d = new Date()) {
  const out: string[] = [];
  let year = d.getFullYear();
  let term = TERMS.indexOf(currentSemester(d).split(' ')[0] as (typeof TERMS)[number]);
  for (let i = 0; i < count; i++) {
    out.push(`${TERMS[term]} ${year}`);
    term -= 1;
    if (term < 0) {
      term = 2;
      year -= 1;
    }
  }
  return out;
}

export const DEPARTMENTS = ['CSE', 'CS', 'EEE', 'ECE', 'BBA', 'ENG', 'MNS', 'ARC', 'PHR', 'LAW', 'OTHER'];
