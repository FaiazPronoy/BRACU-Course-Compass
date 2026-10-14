import { Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { mustBeId } from '../../utils/ownership';
import { escapeRegex } from '../Course/course.controller';
import Course from '../Course/course.model';
import Answer from '../Forum/answer.model';
import Thread from '../Forum/thread.model';
import Review from '../Review/review.model';
import ReviewComment from '../Review/reviewComment.model';
import User from '../User/User.model';

// the numbers on the landing page, counted rather than typed in
export const publicStats = async (req: Request, res: Response) => {
  const [courses, reviews, threads, students] = await Promise.all([
    Course.countDocuments(),
    Review.countDocuments(),
    Thread.countDocuments(),
    User.countDocuments({ role: 'user' }),
  ]);
  res.json({ courses, reviews, threads, students });
};

export const overview = async (req: Request, res: Response) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [users, courses, reviews, threads, answers, comments, newUsers, newReviews, unanswered, recentReviews, recentThreads] =
    await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Review.countDocuments(),
      Thread.countDocuments(),
      Answer.countDocuments(),
      ReviewComment.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Review.countDocuments({ createdAt: { $gte: weekAgo } }),
      Thread.countDocuments({ answerCount: 0 }),
      Review.find().sort({ createdAt: -1 }).limit(8).populate('author', 'name').populate('course', 'code').lean(),
      Thread.find().sort({ createdAt: -1 }).limit(8).populate('author', 'name').populate('course', 'code').lean(),
    ]);

  // the courses with no reviews yet are the gaps worth nudging students about
  const reviewed = new Set((await Review.distinct('course')).map(String));
  const allCourses = await Course.find({}, 'code title').sort({ code: 1 }).lean();

  res.json({
    counts: { users, courses, reviews, threads, answers, comments, newUsers, newReviews, unanswered },
    recentReviews: recentReviews.map(({ helpful, ...r }) => r),
    recentThreads: recentThreads.map(({ upvotes, ...t }) => t),
    unreviewed: allCourses.filter((c) => !reviewed.has(String(c._id))),
  });
};

export const listUsers = async (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim();
  const filter = search
    ? { $or: [{ name: new RegExp(escapeRegex(search), 'i') }, { email: new RegExp(escapeRegex(search), 'i') }] }
    : {};
  const users = await User.find(filter, 'name email role department studentId createdAt').sort({ createdAt: -1 }).limit(200).lean();
  const reviewCounts = new Map(
    (await Review.aggregate([{ $group: { _id: '$author', n: { $sum: 1 } } }])).map((r) => [String(r._id), r.n])
  );
  res.json(users.map((u) => ({ ...u, reviews: reviewCounts.get(String(u._id)) || 0 })));
};

export const setRole = async (req: Request, res: Response) => {
  mustBeId(req.params.id, 'That account');
  const role = req.body?.role;
  if (!['user', 'admin'].includes(role)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'A role is either user or admin.');
  }
  // an admin demoting themselves could leave nobody able to run the site
  if (String(req.params.id) === String(req.user._id)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot change your own role.');
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'That account does not exist.');
  res.json({ _id: user._id, role: user.role });
};
