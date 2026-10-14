import { inject } from 'vitest';
import mongoose from 'mongoose';

export const baseUrl = () => inject('baseUrl') as string;

export async function api(
  method: string,
  path: string,
  { body, token }: { body?: unknown; token?: string } = {}
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const hasBody = body !== undefined && method !== 'GET' && method !== 'HEAD';
  const res = await fetch(baseUrl() + path, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // some responses have no body
  }
  return { status: res.status, body: json };
}

export async function withDb<T>(fn: (db: any) => Promise<T>): Promise<T> {
  const connection = mongoose.createConnection(inject('mongoUri') as string);
  await connection.asPromise();
  try {
    return await fn(connection.db);
  } finally {
    await connection.close();
  }
}

let counter = 0;
const unique = () => `${Date.now().toString(36)}${counter++}`;

// registers through the API so the password hashing hook runs
export async function createStudent(name = 'Test Student', department = 'CSE') {
  const email = `s${unique()}@g.bracu.ac.bd`;
  const password = 'Student@123';
  const res = await api('POST', '/auth/register', { body: { name, email, password, department } });
  return { name, email, password, token: res.body?.token as string, id: res.body?.user?._id as string };
}

export async function createAdmin() {
  const student = await createStudent('Test Admin');
  await withDb((db) => db.collection('users').updateOne({ email: student.email }, { $set: { role: 'admin' } }));
  return student;
}

// each test file loads this module afresh, so start somewhere random to keep codes apart
let codeCounter = Math.floor(Math.random() * 17000);
export const newCode = () => `T${String.fromCharCode(65 + (codeCounter % 26))}${String.fromCharCode(65 + Math.floor(codeCounter / 26) % 26)}${String(codeCounter++ % 1000).padStart(3, '0')}`;

export async function createCourse(adminToken: string, extra: Record<string, unknown> = {}) {
  const res = await api('POST', '/courses', {
    token: adminToken,
    body: { code: newCode(), title: 'A test course', department: 'CSE', credits: 3, ...extra },
  });
  if (res.status !== 201) throw new Error(`could not create course: ${JSON.stringify(res.body)}`);
  return res.body;
}

export const review = (extra: Record<string, unknown> = {}) => ({
  faculty: 'ABC',
  semester: 'Spring 2025',
  rating: 4,
  difficulty: 3,
  workload: 3,
  grade: 'A-',
  body: 'A fair course with a heavy lab, but the exams follow the practice sheets closely.',
  tips: 'Start the assignments early.',
  ...extra,
});

export const getUserDoc = (email: string) => withDb((db) => db.collection('users').findOne({ email }));
