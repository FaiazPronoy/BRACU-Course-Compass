// BRAC University's undergraduate programs and the credits each needs.
// Checked September 2026 against each program's page on bracu.ac.bd (Program
// Finder) and the undergraduate admission brochure. Curricula change with the
// intake, so the page always lets a student correct the total.
//   - Anthropology: brochure 120, current program page 130
//   - Architecture: brochure 201, current program page 207
//   - LLB: brochure 135 (the program page lists courses but no total)
export interface Program {
  code: string;
  name: string;
  credits: number;
  // semesters allowed on probation before withdrawal is considered
  probation: number;
  load: [number, number]; // usual credits a semester, from the policy page
  match: RegExp; // how the program line on the grade sheet reads
}

export const PROGRAMS: Program[] = [
  { code: 'CSE', name: 'BSc in Computer Science and Engineering', credits: 136, probation: 3, load: [9, 15], match: /COMPUTER SCIENCE (AND|&) ENGINEERING/ },
  { code: 'CS', name: 'BSc in Computer Science', credits: 124, probation: 3, load: [9, 15], match: /COMPUTER SCIENCE/ },
  { code: 'EEE', name: 'BSc in Electrical and Electronic Engineering', credits: 136, probation: 3, load: [9, 15], match: /ELECTRICAL (AND|&) ELECTRONIC/ },
  { code: 'ECE', name: 'BSc in Electronic and Communication Engineering', credits: 136, probation: 3, load: [9, 15], match: /ELECTRONIC (AND|&) COMMUNICATION/ },
  { code: 'APE', name: 'BSc in Applied Physics and Electronics', credits: 130, probation: 3, load: [9, 15], match: /APPLIED PHYSICS/ },
  { code: 'PHY', name: 'BSc in Physics', credits: 132, probation: 3, load: [9, 15], match: /PHYSICS/ },
  { code: 'MAT', name: 'BSc in Mathematics', credits: 127, probation: 3, load: [9, 15], match: /MATHEMATICS/ },
  { code: 'MIC', name: 'BSc in Microbiology', credits: 136, probation: 3, load: [9, 15], match: /MICROBIOLOGY/ },
  { code: 'BIO', name: 'BSc in Biotechnology', credits: 136, probation: 3, load: [9, 15], match: /BIOTECHNOLOGY/ },
  { code: 'PHR', name: 'Bachelor of Pharmacy (Hons)', credits: 164, probation: 2, load: [18, 24], match: /PHARMACY/ },
  { code: 'BBA', name: 'Bachelor of Business Administration', credits: 130, probation: 3, load: [9, 15], match: /BUSINESS ADMINISTRATION/ },
  { code: 'ECO', name: 'BSS in Economics', credits: 120, probation: 3, load: [9, 15], match: /ECONOMICS/ },
  { code: 'ANT', name: 'BSS in Anthropology', credits: 130, probation: 3, load: [9, 15], match: /ANTHROPOLOGY/ },
  { code: 'ARC', name: 'Bachelor of Architecture', credits: 207, probation: 3, load: [9, 21], match: /ARCHITECTURE/ },
  { code: 'LLB', name: 'Bachelor of Laws (LLB Hons)', credits: 135, probation: 2, load: [12, 15], match: /\bLAWS?\b|LL\.?\s?B/ },
  { code: 'AELS', name: 'BA in Applied English Language Studies', credits: 132, probation: 3, load: [9, 15], match: /APPLIED ENGLISH/ },
  { code: 'ENG', name: 'BA in English', credits: 120, probation: 3, load: [9, 15], match: /ENGLISH/ },
  { code: 'BDM', name: 'Bachelor of Disaster Management', credits: 141, probation: 3, load: [9, 15], match: /DISASTER/ },
];

export const programByCode = (code: string | null | undefined) => PROGRAMS.find((p) => p.code === code) ?? null;

// from the "PROGRAM: ..." line of the grade sheet, or failing that the file
// name Connect gives it (20101234_UG_CSE_Gradesheet_Web.pdf)
export function detectProgram(programLine: string, fileName = ''): Program | null {
  const line = programLine.toUpperCase();
  if (line) {
    const hit = PROGRAMS.find((p) => p.match.test(line));
    if (hit) return hit;
  }
  const fromFile = /_UG_([A-Z]+)_/i.exec(fileName)?.[1]?.toUpperCase();
  return programByCode(fromFile);
}
