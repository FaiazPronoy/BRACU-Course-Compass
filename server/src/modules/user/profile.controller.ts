import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { z } from 'zod';
import AppError from '../../errors/AppError';
import { transcript } from '../../utils/grades';
import { emptyStats, findCourse, statsByCourse } from '../course/course.controller';
import Course from '../course/course.model';
import Answer from '../forum/answer.model';
import Thread from '../forum/thread.model';
import Notification from '../notification/notification.model';
import Plan from '../planner/planner.model';
import Review from '../review/review.model';
import { CalendarEvent, Note, Todo } from '../study/study.model';
import { bracuEmail } from './auth.controller';
import User, { DEPARTMENTS, publicUser } from './user.model';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(60),
  department: z.enum(DEPARTMENTS),
  studentId: z.string().trim().regex(/^$|^\d{8}$/, 'A BRACU student ID has 8 digits.').default(''),
  bio: z.string().trim().max(300).default(''),
});

export const updateProfile = async (req: Request, res: Response) => {
  const body = profileSchema.partial().parse(req.body);
  req.user.set(body);
  await req.user.save();
  res.json({ user: publicUser(req.user) });
};

const withPassword = async (userId: unknown, password: unknown) => {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(String(password || '')))) {
    throw new AppError(httpStatus.BAD_REQUEST, 'That password is not right.');
  }
  return user;
};

// changing the sign-in email needs the current password, checked against the
// account as it is now (the old code checked it against the new address)
export const changeEmail = async (req: Request, res: Response) => {
  const email = bracuEmail.parse(req.body?.email);
  const user = await withPassword(req.user._id, req.body?.password);
  if (email !== user.email && (await User.exists({ email }))) {
    throw new AppError(httpStatus.CONFLICT, 'There is already an account with that email.');
  }
  user.email = email;
  await user.save();
  res.json({ user: publicUser(user) });
};

export const changePassword = async (req: Request, res: Response) => {
  const next = String(req.body?.newPassword || '');
  if (next.length < 8) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Use at least 8 characters for the new password.');
  }
  const user = await withPassword(req.user._id, req.body?.oldPassword);
  user.password = next;
  await user.save();
  res.json({ message: 'Password changed' });
};

export const toggleSaved = async (req: Request, res: Response) => {
  const course = await findCourse(req.params.key);
  const saved = req.user.savedCourses.some((id) => String(id) === String(course._id));
  await User.updateOne(
    { _id: req.user._id },
    saved ? { $pull: { savedCourses: course._id } } : { $addToSet: { savedCourses: course._id } }
  );
  res.json({ saved: !saved });
};

export const savedCourses = async (req: Request, res: Response) => {
  const courses = await Course.find({ _id: { $in: req.user.savedCourses } }).sort({ code: 1 }).lean();
  const stats = await statsByCourse(courses.map((c) => c._id));
  res.json(courses.map((c) => ({ ...c, saved: true, stats: stats.get(String(c._id)) || emptyStats })));
};

// everything you have written, for the profile page
export const myActivity = async (req: Request, res: Response) => {
  const [reviews, threads, answers] = await Promise.all([
    Review.find({ author: req.user._id }).sort({ createdAt: -1 }).populate('course', 'code title').lean(),
    Thread.find({ author: req.user._id }).sort({ createdAt: -1 }).populate('course', 'code').lean(),
    Answer.countDocuments({ author: req.user._id }),
  ]);
  res.json({
    reviews: reviews.map(({ helpful, ...r }) => ({ ...r, helpfulCount: helpful.length })),
    threads: threads.map(({ upvotes, ...t }) => ({ ...t, votes: upvotes.length, resolved: !!t.acceptedAnswer })),
    answers,
  });
};

// the home screen in one request: what is due, what is coming, what is new
export const dashboard = async (req: Request, res: Response) => {
  const id = req.user._id;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inTwoWeeks = new Date(startOfToday.getTime() + 14 * 86400000);

  const [tasks, events, notes, plan, unread, saved] = await Promise.all([
    Todo.find({ owner: id, completed: false }).sort({ deadline: 1, createdAt: -1 }).populate('course', 'code').lean(),
    CalendarEvent.find({ owner: id, date: { $gte: startOfToday, $lte: inTwoWeeks } })
      .sort({ date: 1, time: 1 })
      .limit(8)
      .populate('course', 'code')
      .lean(),
    Note.find({ owner: id }, 'title course updatedAt playlist').sort({ updatedAt: -1 }).limit(4).populate('course', 'code').lean(),
    Plan.findOne({ owner: id }, 'records').lean(),
    Notification.countDocuments({ user: id, read: false }),
    Course.find({ _id: { $in: req.user.savedCourses } }, 'code title credits').sort({ code: 1 }).lean(),
  ]);

  // tasks with no deadline sort to the end rather than the start
  tasks.sort((a, b) => (a.deadline ? +a.deadline : Infinity) - (b.deadline ? +b.deadline : Infinity));

  res.json({
    tasks: tasks.slice(0, 6),
    openTasks: tasks.length,
    overdue: tasks.filter((t) => t.deadline && t.deadline < startOfToday).length,
    events,
    notes,
    saved,
    unread,
    cgpa: transcript(plan?.records || []).cgpa,
  });
};
