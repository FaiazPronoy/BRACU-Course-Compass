import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { z } from 'zod';
import AppError from '../../errors/AppError';
import { GRADES, SEMESTER } from '../../utils/grades';
import { assertCanDelete, assertCanEdit, isOwner, mustBeId } from '../../utils/ownership';
import { findCourse } from '../course/course.controller';
import { notify } from '../notification/notification.controller';
import Review from './review.model';
import ReviewComment from './reviewComment.model';

const score = z.coerce.number().int().min(1, 'Pick 1 to 5.').max(5, 'Pick 1 to 5.');

const reviewSchema = z.object({
  faculty: z.string().trim().toUpperCase().regex(/^[A-Z]{2,6}$/, 'Faculty initials are 2 to 6 letters, like NZM.'),
  semester: z.string().trim().regex(SEMESTER, 'Semester looks like Spring 2025.'),
  rating: score,
  difficulty: score,
  workload: score,
  grade: z.enum([...GRADES, ''] as [string, ...string[]]).default(''),
  body: z.string().trim().min(30, 'Write at least a few sentences (30 characters).').max(2000),
  tips: z.string().trim().max(1000).default(''),
});

const author = 'name department';

const shape = (r: any, userId?: unknown, comments = 0) => {
  const { helpful = [], ...rest } = r;
  return {
    ...rest,
    helpfulCount: helpful.length,
    helpedByMe: !!userId && helpful.some((id: unknown) => String(id) === String(userId)),
    mine: !!userId && String(r.author?._id ?? r.author) === String(userId),
    comments,
  };
};

export const listReviews = async (req: Request, res: Response) => {
  const course = await findCourse(req.params.key);
  const filter: Record<string, unknown> = { course: course._id };
  const faculty = String(req.query.faculty || '').trim().toUpperCase();
  if (faculty) filter.faculty = faculty;

  const reviews = await Review.find(filter).populate('author', author).lean();
  const counts = new Map(
    (await ReviewComment.aggregate([
      { $match: { review: { $in: reviews.map((r) => r._id) } } },
      { $group: { _id: '$review', n: { $sum: 1 } } },
    ])).map((c) => [String(c._id), c.n])
  );
  const rows = reviews.map((r) => shape(r, req.user?._id, counts.get(String(r._id)) || 0));

  const sort = String(req.query.sort || 'helpful');
  const by: Record<string, (a: any, b: any) => number> = {
    helpful: (a, b) => b.helpfulCount - a.helpfulCount || +new Date(b.createdAt) - +new Date(a.createdAt),
    newest: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    highest: (a, b) => b.rating - a.rating,
    lowest: (a, b) => a.rating - b.rating,
  };
  rows.sort(by[sort] || by.helpful);
  res.json(rows);
};

export const recentReviews = async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 6, 20);
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', author)
    .populate('course', 'code title')
    .lean();
  res.json(reviews.map((r) => shape(r, req.user?._id)));
};

export const createReview = async (req: Request, res: Response) => {
  const course = await findCourse(req.params.key);
  const body = reviewSchema.parse(req.body);
  if (await Review.exists({ course: course._id, author: req.user._id })) {
    throw new AppError(httpStatus.CONFLICT, 'You have already reviewed this course. Edit your review instead.');
  }
  const review = await Review.create({ ...body, course: course._id, author: req.user._id });
  res.status(201).json(review);
};

const loadReview = async (id: string) => {
  mustBeId(id, 'That review');
  const review = await Review.findById(id);
  if (!review) throw new AppError(httpStatus.NOT_FOUND, 'That review does not exist.');
  return review;
};

export const updateReview = async (req: Request, res: Response) => {
  const review = await loadReview(req.params.id);
  assertCanEdit(review, req.user);
  review.set(reviewSchema.parse(req.body));
  await review.save();
  res.json(review);
};

export const deleteReview = async (req: Request, res: Response) => {
  const review = await loadReview(req.params.id);
  assertCanDelete(review, req.user);
  await ReviewComment.deleteMany({ review: review._id });
  await review.deleteOne();
  res.json({ message: 'Review removed' });
};

export const toggleHelpful = async (req: Request, res: Response) => {
  const review = await loadReview(req.params.id);
  if (isOwner(review, req.user)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot vote on your own review.');
  }
  const voted = review.helpful.some((id) => String(id) === String(req.user._id));
  const updated = await Review.findByIdAndUpdate(
    review._id,
    voted ? { $pull: { helpful: req.user._id } } : { $addToSet: { helpful: req.user._id } },
    { new: true }
  ).populate('course', 'code');
  if (!voted) {
    await notify(review.author, req.user, 'helpful', (updated!.course as any).code, `/courses/${(updated!.course as any).code}?tab=reviews`);
  }
  res.json({ helpfulCount: updated!.helpful.length, helpedByMe: !voted });
};

export const listReviewComments = async (req: Request, res: Response) => {
  mustBeId(req.params.id, 'That review');
  const comments = await ReviewComment.find({ review: req.params.id })
    .sort({ createdAt: 1 })
    .populate('author', 'name')
    .lean();
  res.json(comments.map((c) => ({ ...c, mine: isOwner({ author: (c.author as any)?._id }, req.user) })));
};

const commentSchema = z.object({ text: z.string().trim().min(1, 'Write something first.').max(1000) });

export const addReviewComment = async (req: Request, res: Response) => {
  const review = await loadReview(req.params.id);
  const { text } = commentSchema.parse(req.body);
  const comment = await ReviewComment.create({ review: review._id, author: req.user._id, text });
  const course = await findCourse(String(review.course));
  await notify(review.author, req.user, 'review_comment', course.code, `/courses/${course.code}?tab=reviews`);
  res.status(201).json(await comment.populate('author', 'name'));
};

const loadComment = async (id: string) => {
  mustBeId(id, 'That comment');
  const comment = await ReviewComment.findById(id);
  if (!comment) throw new AppError(httpStatus.NOT_FOUND, 'That comment does not exist.');
  return comment;
};

export const updateReviewComment = async (req: Request, res: Response) => {
  const comment = await loadComment(req.params.id);
  assertCanEdit(comment, req.user);
  comment.text = commentSchema.parse(req.body).text;
  await comment.save();
  res.json(comment);
};

export const deleteReviewComment = async (req: Request, res: Response) => {
  const comment = await loadComment(req.params.id);
  assertCanDelete(comment, req.user);
  await comment.deleteOne();
  res.json({ message: 'Comment removed' });
};
