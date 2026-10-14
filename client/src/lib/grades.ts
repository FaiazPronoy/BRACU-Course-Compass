// The lists the forms need. Every CGPA calculation lives in ./engine, which
// is the same tested engine as my BRACU CGPA Analyzer.
import { ALL_GRADES as ENGINE_ALL, GRADE_POINTS, LETTER_GRADES, TERMS } from './engine/grades';

export { GRADE_POINTS, TERMS };
export const GRADES: string[] = LETTER_GRADES;
export const ALL_GRADES: string[] = ENGINE_ALL;

// the semester a date falls in: Jan to Apr is Spring, May to Aug Summer, the rest Fall
export function currentSemester(d = new Date()) {
  const m = d.getMonth();
  return `${m < 4 ? 'Spring' : m < 8 ? 'Summer' : 'Fall'} ${d.getFullYear()}`;
}

// the last few semesters, newest first, for "when did you take it" pickers
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
