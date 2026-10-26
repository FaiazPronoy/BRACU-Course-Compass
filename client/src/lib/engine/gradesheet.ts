// Reads the grade sheet PDF from Connect, in the browser. The file never
// leaves the device: pdf.js pulls the text out and the rows are matched up by
// where they sit on the page.
//
// A course row is one text item per cell:
//   CSE110 | PROGRAMMING LANGUAGE I | 3.00 | B+ (NT) | 3.30
// Long titles wrap onto two lines around the row, so a row is found by its
// course code and the title is whatever sits nearest to it.
import { ALL_GRADES, Attempt, Grade, isLetter, timeline } from './grades';

export interface TextCell {
  str: string;
  x: number;
  y: number;
}

// the two summary lines the sheet prints under every semester
export interface SheetTerm {
  semester: string;
  attempted: number;
  earned: number;
  gpa: number;
  cumAttempted: number;
  cumEarned: number;
  cgpa: number;
}

export interface ParsedSheet {
  attempts: Attempt[];
  program: string; // the "PROGRAM: ..." line from the header, as printed
  terms: SheetTerm[];
  // courses whose credits the sheet leaves out (an F or an I prints 0.00)
  guessed: string[];
}

const CODE = /^[A-Z]{3}\d{3}$/;
const NUMBER = /^\d+\.\d{2}$/;
const GRADE = /^(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|P|I|W)(\s*\((NT|RP|RT)\))?$/;

// the sheet prints titles in capitals; turn them back into normal titles
const SMALL = new Set(['of', 'and', 'the', 'for', 'to', 'in', 'a', 'an', 'on', 'with']);
const KEEP_UPPER = /^(i|ii|iii|iv|v|vi|vlsi|ai|dbms|ui|ux|ict)$/;
// each part of a hyphenated word on its own, so LANGUAGE-II becomes Language-II
const word = (w: string, first: boolean) =>
  KEEP_UPPER.test(w.replace(/[^a-z]/g, '')) ? w.toUpperCase() : !first && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1);
export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(' ')
    .map((w, i) => w.split('-').map((part, j) => word(part, i === 0 || j > 0)).join('-'))
    .join(' ');

let counter = 0;
export const newId = () => `a${Date.now().toString(36)}${(counter++).toString(36)}`;

// one page at a time, carrying the semester over: a semester often starts at
// the bottom of one page and finishes on the next
export function parsePages(pages: TextCell[][]): ParsedSheet {
  const attempts: Attempt[] = [];
  const terms: SheetTerm[] = [];
  let semester = '';
  let program = '';

  for (const raw of pages) {
    const cells = raw.map((c) => ({ ...c, str: c.str.trim() })).filter((c) => c.str);
    const header = (label: string) => cells.find((c) => c.str === label);
    const titleX = header('Course Title')?.x ?? 100;
    const creditsX = header('Credits Earned')?.x ?? 360;
    const gradeX = header('Grade')?.x ?? 425;
    const pointsX = header('Grade Points')?.x ?? 490;
    const sameRow = (a: TextCell, b: TextCell) => Math.abs(a.y - b.y) < 2;

    // the program sits in the header, right of "PROGRAM:" and above the table,
    // sometimes over two lines
    const label = cells.find((c) => /^PROGRAM\s*:?/i.test(c.str));
    const tableTop = header('Course No')?.y ?? 0;
    if (!program && label) {
      program = cells
        .filter((c) => c.y > tableTop && c.y <= label.y + 2 && c.x >= label.x - 2)
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((c) => c.str)
        .join(' ')
        .replace(/^PROGRAM\s*:?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const anchors = cells.filter((c) => CODE.test(c.str) && c.x < titleX);
    const titleCells = cells.filter((c) => c.x >= titleX - 2 && c.x < creditsX - 10 && !CODE.test(c.str));
    // "SEMESTER:" opens a semester; "SEMESTER" and "CUMULATIVE" are its two summary lines
    const marks = [
      ...cells.filter((c) => c.str === 'SEMESTER:').map((cell) => ({ cell, kind: 'semester' as const })),
      ...cells.filter((c) => c.str === 'SEMESTER' || c.str === 'CUMULATIVE').map((cell) => ({ cell, kind: 'summary' as const })),
      ...anchors.map((cell) => ({ cell, kind: 'course' as const })),
    ].sort((a, b) => b.cell.y - a.cell.y); // PDF y grows upwards, so this is top to bottom

    for (const { cell, kind } of marks) {
      if (kind === 'semester') {
        const name = cells.find((c) => sameRow(c, cell) && c.x > cell.x && /^(SPRING|SUMMER|FALL) \d{4}$/i.test(c.str));
        if (name) semester = titleCase(name.str);
        continue;
      }
      if (kind === 'summary') {
        // attempted, earned, then GPA or CGPA, left to right
        const nums = cells.filter((n) => sameRow(n, cell) && NUMBER.test(n.str)).sort((a, b) => a.x - b.x).map((n) => Number(n.str));
        if (nums.length < 3) continue;
        const [attempted, earned, value] = [nums[0], nums[1], nums[nums.length - 1]];
        if (cell.str === 'SEMESTER') terms.push({ semester, attempted, earned, gpa: value, cumAttempted: 0, cumEarned: 0, cgpa: 0 });
        else if (terms.length && terms[terms.length - 1].semester === semester) {
          Object.assign(terms[terms.length - 1], { cumAttempted: attempted, cumEarned: earned, cgpa: value });
        }
        continue;
      }
      const row = cells.filter((c) => sameRow(c, cell));
      const credits = row.find((c) => c.x >= creditsX - 10 && c.x < gradeX - 5 && NUMBER.test(c.str));
      const gradeCell = row.find((c) => c.x >= gradeX - 5 && c.x < pointsX - 5 && GRADE.test(c.str));
      if (!credits || !gradeCell) continue;
      const title = titleCells
        .filter((c) => {
          const nearest = anchors.reduce((best, a) => (Math.abs(a.y - c.y) < Math.abs(best.y - c.y) ? a : best));
          return nearest === cell && Math.abs(c.y - cell.y) < 10;
        })
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((c) => c.str)
        .join(' ');
      const grade = GRADE.exec(gradeCell.str)![1] as Grade;
      if (!ALL_GRADES.includes(grade)) continue;
      attempts.push({ id: newId(), code: cell.str, title: titleCase(title), credits: Number(credits.str), grade, semester });
    }
  }
  return { attempts, terms, program, guessed: fillMissingCredits(attempts, terms) };
}

// The credits column is credits *earned*, so an F or an I prints 0.00. The
// semester's "Credits Attempted" line still counts an F, so its credits are:
// another attempt of the same course if there is one (a retake prints its
// credits), otherwise what is left of the semester's attempted total, shared
// between the F rows. An I counts nowhere, but keeps credits for the what-ifs.
function fillMissingCredits(attempts: Attempt[], terms: SheetTerm[]) {
  const guessed: string[] = [];
  const known = new Map<string, number>();
  for (const a of attempts) if (a.credits > 0) known.set(a.code, a.credits);

  for (const term of terms) {
    const rows = attempts.filter((a) => a.semester === term.semester);
    const printed = rows.filter((a) => isLetter(a.grade) && a.grade !== 'F').reduce((n, a) => n + a.credits, 0);
    const fails = rows.filter((a) => a.grade === 'F' && a.credits === 0);
    let left = term.attempted - printed;
    for (const a of fails.filter((f) => known.has(f.code))) {
      a.credits = known.get(a.code)!;
      left -= a.credits;
    }
    const unknown = fails.filter((f) => f.credits === 0);
    for (const a of unknown) {
      a.credits = left > 0 ? Math.round((left / unknown.length) * 2) / 2 : 3;
      guessed.push(`${a.code} (${term.semester})`);
    }
  }
  for (const a of attempts) {
    if (a.grade === 'I' && a.credits === 0) {
      a.credits = known.get(a.code) ?? 3;
      if (!known.has(a.code)) guessed.push(`${a.code} (${a.semester})`);
    }
  }
  return guessed;
}

export type Figure = 'attempted' | 'earned' | 'gpa' | 'cumAttempted' | 'cumEarned' | 'cgpa';
export const FIGURES: Figure[] = ['attempted', 'earned', 'gpa', 'cumAttempted', 'cumEarned', 'cgpa'];

export interface TermCheck {
  semester: string;
  ok: boolean;
  figures: Record<Figure, [number, number]>; // [ours, sheet]
}

// Works every semester out again from the course rows and holds it up against
// the two lines the sheet prints under it. Any difference means a row was
// misread, and the page says so instead of quietly showing a wrong CGPA.
export function checkSheet(sheet: ParsedSheet): TermCheck[] {
  const rows = new Map(timeline(sheet.attempts).map((r) => [r.semester, r]));
  return sheet.terms.map((term) => {
    const r = rows.get(term.semester);
    const figures: Record<Figure, [number, number]> = {
      attempted: [r?.attempted ?? 0, term.attempted],
      earned: [r?.earned ?? 0, term.earned],
      gpa: [r?.gpa ?? 0, term.gpa],
      cumAttempted: [r?.cumAttempted ?? 0, term.cumAttempted],
      cumEarned: [r?.cumEarned ?? 0, term.cumEarned],
      cgpa: [r?.cgpa ?? 0, term.cgpa],
    };
    return { semester: term.semester, figures, ok: FIGURES.every((k) => Math.abs(figures[k][0] - figures[k][1]) < 0.001) };
  });
}

export async function readGradeSheet(file: File): Promise<ParsedSheet> {
  // pdf.js is large, so it only loads when someone picks a file
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: TextCell[][] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(
      content.items
        .filter((it) => 'str' in it)
        .map((it) => {
          const t = it as { str: string; transform: number[] };
          return { str: t.str, x: t.transform[4], y: t.transform[5] };
        })
    );
  }
  return parsePages(pages);
}
