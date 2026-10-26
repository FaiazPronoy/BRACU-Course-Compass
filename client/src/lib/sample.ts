import type { Attempt, Grade } from './engine/grades';
import { newId } from './engine/gradesheet';

// A made-up CSE student, so anyone can try every page with one click. It has
// the things worth showing: a rough second year, an F that was retaken, a
// course already repeated, and recent grades still inside the repeat window.
const rows: [string, string, number, Grade, string][] = [
  ['CSE110', 'Programming Language I', 3, 'B', 'Summer 2023'],
  ['ENG101', 'Fundamentals of English', 3, 'B+', 'Summer 2023'],
  ['MAT110', 'Mathematics I: Differential Calculus & Coordinate Geometry', 3, 'B-', 'Summer 2023'],

  ['CSE111', 'Programming Language II', 3, 'A-', 'Fall 2023'],
  ['CSE230', 'Discrete Mathematics', 3, 'B', 'Fall 2023'],
  ['PHY111', 'Principles of Physics I', 3, 'C+', 'Fall 2023'],
  ['ENG102', 'English Composition I', 3, 'A-', 'Fall 2023'],

  ['CSE220', 'Data Structures', 3, 'C', 'Spring 2024'],
  ['MAT120', 'Mathematics II: Integral Calculus & Differential Equations', 3, 'F', 'Spring 2024'],
  ['STA201', 'Elements of Statistics and Probability', 3, 'B-', 'Spring 2024'],
  ['EMB101', 'Emergence of Bangladesh', 3, 'B+', 'Spring 2024'],

  ['CSE221', 'Algorithms', 3, 'C-', 'Summer 2024'],
  ['MAT120', 'Mathematics II: Integral Calculus & Differential Equations', 3, 'B', 'Summer 2024'],
  ['CSE250', 'Circuits and Electronics', 3, 'B', 'Summer 2024'],
  ['HUM103', 'Ethics and Culture', 3, 'A', 'Summer 2024'],

  ['CSE260', 'Digital Logic Design', 3, 'B+', 'Fall 2024'],
  ['CSE320', 'Data Communications', 3, 'A-', 'Fall 2024'],
  ['MAT216', 'Mathematics IV: Linear Algebra & Fourier Analysis', 3, 'C+', 'Fall 2024'],
  ['CSE220', 'Data Structures', 3, 'B+', 'Fall 2024'],

  ['CSE321', 'Operating Systems', 3, 'B', 'Spring 2025'],
  ['CSE331', 'Automata and Computability', 3, 'A-', 'Spring 2025'],
  ['CSE370', 'Database Systems', 3, 'A', 'Spring 2025'],
  ['ECO101', 'Introduction to Microeconomics', 3, 'A', 'Spring 2025'],

  ['CSE340', 'Computer Architecture', 3, 'F', 'Summer 2025'],
  ['CSE341', 'Microprocessors', 3, 'B+', 'Summer 2025'],
  ['CSE422', 'Artificial Intelligence', 3, 'A-', 'Summer 2025'],
  ['CSE423', 'Computer Graphics', 3, 'A', 'Summer 2025'],

  ['CSE421', 'Computer Networks', 3, 'C+', 'Fall 2025'],
  ['CSE470', 'Software Engineering', 3, 'A', 'Fall 2025'],
  ['CSE471', 'System Analysis and Design', 3, 'A-', 'Fall 2025'],
  ['MAT215', 'Mathematics III: Complex Variables & Laplace Transformations', 3, 'B-', 'Fall 2025'],

  ['CSE360', 'Computer Interfacing', 3, 'B', 'Spring 2026'],
  ['CSE350', 'Digital Electronics and Pulse Techniques', 3, 'C', 'Spring 2026'],
  ['CSE400', 'Project & Thesis', 4, 'A', 'Spring 2026'],
  ['CSE420', 'Compiler Design', 3, 'A-', 'Spring 2026'],
];

export const sampleTranscript = (): Attempt[] =>
  rows.map(([code, title, credits, grade, semester]) => ({ id: newId(), code, title, credits, grade, semester }));
