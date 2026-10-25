import { describe, expect, it } from 'vitest';
import { titleCase } from './gradesheet';
import { detectProgram, PROGRAMS } from './programs';

const lines: [string, string][] = [
  ['BACHELOR OF SCIENCE IN COMPUTER SCIENCE AND ENGINEERING', 'CSE'],
  ['BACHELOR OF SCIENCE IN COMPUTER SCIENCE', 'CS'],
  ['BACHELOR OF SCIENCE IN ELECTRICAL AND ELECTRONIC ENGINEERING', 'EEE'],
  ['BACHELOR OF SCIENCE IN ELECTRONIC AND COMMUNICATION ENGINEERING', 'ECE'],
  ['BACHELOR OF SCIENCE IN APPLIED PHYSICS AND ELECTRONICS', 'APE'],
  ['BACHELOR OF SCIENCE IN PHYSICS', 'PHY'],
  ['BACHELOR OF SCIENCE IN MATHEMATICS', 'MAT'],
  ['BACHELOR OF SCIENCE IN MICROBIOLOGY', 'MIC'],
  ['BACHELOR OF SCIENCE IN BIOTECHNOLOGY', 'BIO'],
  ['BACHELOR OF PHARMACY (HONS.)', 'PHR'],
  ['BACHELOR OF BUSINESS ADMINISTRATION', 'BBA'],
  ['BACHELOR OF SOCIAL SCIENCE IN ECONOMICS', 'ECO'],
  ['BACHELOR OF SOCIAL SCIENCES IN ANTHROPOLOGY', 'ANT'],
  ['BACHELOR OF ARCHITECTURE', 'ARC'],
  ['BACHELOR OF LAWS (LL.B. HONS.)', 'LLB'],
  ['BACHELOR OF ARTS IN APPLIED ENGLISH LANGUAGE STUDIES', 'AELS'],
  ['BACHELOR OF ARTS IN ENGLISH', 'ENG'],
  ['BACHELOR OF DISASTER MANAGEMENT', 'BDM'],
];

describe('finding the program on a grade sheet', () => {
  it.each(lines)('%s is %s', (line, code) => {
    expect(detectProgram(line)?.code).toBe(code);
  });

  it('covers every program in the table', () => {
    expect(new Set(lines.map(([, code]) => code))).toEqual(new Set(PROGRAMS.map((p) => p.code)));
  });

  it('falls back to the file name Connect gives the sheet', () => {
    expect(detectProgram('', '20104321_UG_BBA_Gradesheet_Web.pdf')?.code).toBe('BBA');
    expect(detectProgram('', 'something.pdf')).toBeNull();
  });

  it('has the credit totals BRACU publishes', () => {
    const credits = Object.fromEntries(PROGRAMS.map((p) => [p.code, p.credits]));
    expect(credits).toEqual({
      CSE: 136, CS: 124, EEE: 136, ECE: 136, APE: 130, PHY: 132, MAT: 127, MIC: 136, BIO: 136,
      PHR: 164, BBA: 130, ECO: 120, ANT: 130, ARC: 207, LLB: 135, AELS: 132, ENG: 120, BDM: 141,
    });
  });
});

describe('course titles from the sheet', () => {
  it('turns capitals back into a normal title', () => {
    expect(titleCase('PROGRAMMING LANGUAGE-II')).toBe('Programming Language-II');
    expect(titleCase('PRINCIPLES OF PHYSICS I')).toBe('Principles of Physics I');
    expect(titleCase('VLSI DESIGN')).toBe('VLSI Design');
    expect(titleCase('BUSINESS - BASICS, ETHICS AND ENVIRONMENT')).toBe('Business - Basics, Ethics and Environment');
  });
});
