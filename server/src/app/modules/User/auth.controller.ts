import { Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../../config';
import AppError from '../../errors/AppError';
import User, { DEPARTMENTS, publicUser } from './User.model';

// BRACU gives students @g.bracu.ac.bd and staff @bracu.ac.bd
export const bracuEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('That email does not look right.')
  .refine((e) => /@(g\.)?bracu\.ac\.bd$/.test(e), 'Use your BRACU email (@g.bracu.ac.bd).');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(60),
  email: bracuEmail,
  password: z.string().min(8, 'Use at least 8 characters for the password.').max(100),
  department: z.enum(DEPARTMENTS).default('CSE'),
});

// Five wrong passwords lock that email for fifteen minutes. Kept in memory,
// which is enough for one server; it resets when the server restarts.
const FAILS_ALLOWED = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

const isLocked = (email: string) => {
  const f = failures.get(email);
  if (!f) return false;
  if (Date.now() - f.since > LOCK_MS) {
    failures.delete(email);
    return false;
  }
  return f.count >= FAILS_ALLOWED;
};

const recordFailure = (email: string) => {
  const f = failures.get(email);
  if (!f || Date.now() - f.since > LOCK_MS) failures.set(email, { count: 1, since: Date.now() });
  else f.count += 1;
};

const signIn = (res: Response, user: any) => {
  const token = jwt.sign({ id: user._id }, config.jwt_access_secret!, {
    expiresIn: config.jwt_access_expires_in as any,
  });
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

export const register = async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  if (await User.exists({ email: body.email })) {
    throw new AppError(httpStatus.CONFLICT, 'There is already an account with that email.');
  }
  const user = await User.create(body);
  const token = signIn(res, user);
  res.status(201).json({ token, user: publicUser(user) });
};

export const login = async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Enter your email and password.');
  }
  if (isLocked(email)) {
    throw new AppError(httpStatus.TOO_MANY_REQUESTS, 'Too many wrong tries. Please wait 15 minutes.');
  }

  const user = await User.findOne({ email }).select('+password');
  // the same message whether the email exists or not, so the form cannot be
  // used to find out who has an account
  if (!user || !(await user.comparePassword(password))) {
    recordFailure(email);
    throw new AppError(httpStatus.UNAUTHORIZED, 'Wrong email or password.');
  }

  failures.delete(email);
  const token = signIn(res, user);
  res.json({ token, user: publicUser(user) });
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('authToken');
  res.json({ message: 'Signed out' });
};

export const me = (req: Request, res: Response) => {
  res.json({ user: publicUser(req.user), savedCourses: req.user.savedCourses });
};
