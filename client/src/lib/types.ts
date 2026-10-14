// the shapes the API sends back



export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  department: string;
  studentId: string;
  bio: string;
}

export interface Person {
  _id: string;
  name: string;
  department?: string;
}

export interface Link {
  title: string;
  url: string;
}

export interface Stats {
  reviews: number;
  rating: number;
  difficulty: number;
  workload: number;
}

export interface CourseRef {
  _id: string;
  code: string;
  title: string;
  credits?: number;
}

export interface Course extends CourseRef {
  department: string;
  credits: number;
  description: string;
  prerequisites: string[];
  // soft prerequisites: worth doing first, not required
  recommended: string[];
  // where a program's own curriculum asks for something else
  programPrerequisites: { program: string; codes: string[] }[];
  playlists: Link[];
  materials: Link[];
  stats: Stats;
  threads: number;
  saved: boolean;
}

export interface CourseDetail extends Course {
  grades: Record<string, number>;
  faculties: { faculty: string; reviews: number; rating: number }[];
  prerequisiteCourses: CourseRef[];
  unlocks: CourseRef[];
}

export interface Review {
  _id: string;
  course: string | CourseRef;
  author: Person;
  faculty: string;
  semester: string;
  rating: number;
  difficulty: number;
  workload: number;
  grade: string;
  body: string;
  tips: string;
  helpfulCount: number;
  helpedByMe: boolean;
  mine: boolean;
  comments: number;
  createdAt: string;
}

export interface ReviewComment {
  _id: string;
  author: Person;
  text: string;
  mine: boolean;
  createdAt: string;
}

export interface Thread {
  _id: string;
  course: CourseRef;
  author: Person;
  title: string;
  body: string;
  votes: number;
  votedByMe: boolean;
  resolved: boolean;
  mine: boolean;
  answerCount: number;
  createdAt: string;
}

export interface Answer {
  _id: string;
  author: Person;
  text: string;
  votes: number;
  votedByMe: boolean;
  accepted: boolean;
  mine: boolean;
  createdAt: string;
}

export interface Todo {
  _id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string | null;
  completed: boolean;
  course: CourseRef | null;
}

export type EventKind = 'class' | 'quiz' | 'exam' | 'assignment' | 'lab' | 'other';

export interface CalendarEvent {
  _id: string;
  title: string;
  date: string;
  time: string;
  kind: EventKind;
  course: CourseRef | null;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  playlist: string;
  course: CourseRef | null;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  kind: 'review_comment' | 'answer' | 'accepted' | 'helpful';
  actor: string;
  subject: string;
  link: string;
  read: boolean;
  createdAt: string;
}

// one attempt at a course, as a line on the grade sheet
export interface GradeRecord {
  _id?: string;
  code: string;
  title: string;
  credits: number;
  grade: string;
  semester: string;
  counted?: boolean;
}

export interface PlannedCourse extends CourseRef {
  credits: number;
  prerequisites: string[];
  missing: string[];
  advised: string[];
}

export interface Plan {
  semesters: { _id: string; name: string; credits: number; courses: PlannedCourse[] }[];
  records: GradeRecord[];
  summary: { cgpa: number | null; credits: number; attempted: number; planned: number; standing: 'satisfactory' | 'probation' | null };
}
