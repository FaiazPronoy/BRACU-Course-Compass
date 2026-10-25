import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { z } from 'zod';
import AppError from '../../errors/AppError';
import { assertCanDelete, assertCanEdit, isOwner, mustBeId } from '../../utils/ownership';
import { escapeRegex, findCourse } from '../course/course.controller';
import Course from '../course/course.model';
import { notify } from '../notification/notification.controller';
import Answer from './answer.model';
import Thread from './thread.model';

const votes = (list: unknown[] = [], userId?: unknown) => ({
  votes: list.length,
  votedByMe: !!userId && list.some((id) => String(id) === String(userId)),
});

const shapeThread = (t: any, userId?: unknown) => {
  const { upvotes, ...rest } = t;
  return { ...rest, ...votes(upvotes, userId), resolved: !!t.acceptedAnswer, mine: isOwner({ author: t.author?._id ?? t.author }, { _id: userId } as any) };
};

export const listThreads = async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  const courseKey = String(req.query.course || '').trim();
  if (courseKey) filter.course = (await findCourse(courseKey))._id;

  const status = String(req.query.status || '');
  if (status === 'open') filter.acceptedAnswer = null;
  if (status === 'resolved') filter.acceptedAnswer = { $ne: null };
  if (req.query.mine === '1' && req.user) filter.author = req.user._id;

  const search = String(req.query.search || '').trim();
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: re }, { body: re }];
  }

  const sort = String(req.query.sort || 'newest');
  const threads = await Thread.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('author', 'name department')
    .populate('course', 'code title')
    .lean();

  const rows = threads.map((t) => shapeThread(t, req.user?._id));
  if (sort === 'top') rows.sort((a, b) => b.votes - a.votes);
  if (sort === 'unanswered') rows.sort((a, b) => a.answerCount - b.answerCount);
  res.json(rows);
};

const threadSchema = z.object({
  course: z.string().trim().min(1, 'Pick the course this is about.'),
  title: z.string().trim().min(8, 'Make the title a full question (8 characters or more).').max(150),
  body: z.string().trim().min(15, 'Add a little more detail (15 characters or more).').max(4000),
});

export const createThread = async (req: Request, res: Response) => {
  const body = threadSchema.parse(req.body);
  const course = await findCourse(body.course);
  const thread = await Thread.create({ course: course._id, author: req.user._id, title: body.title, body: body.body });
  res.status(201).json(thread);
};

const loadThread = async (id: string) => {
  mustBeId(id, 'That question');
  const thread = await Thread.findById(id);
  if (!thread) throw new AppError(httpStatus.NOT_FOUND, 'That question does not exist.');
  return thread;
};

export const getThread = async (req: Request, res: Response) => {
  mustBeId(req.params.id, 'That question');
  const thread = await Thread.findById(req.params.id)
    .populate('author', 'name department')
    .populate('course', 'code title')
    .lean();
  if (!thread) throw new AppError(httpStatus.NOT_FOUND, 'That question does not exist.');

  const answers = await Answer.find({ thread: thread._id }).populate('author', 'name department').lean();
  const me = req.user?._id;
  const rows = answers
    .map(({ upvotes, ...a }) => ({
      ...a,
      ...votes(upvotes, me),
      accepted: String(a._id) === String(thread.acceptedAnswer),
      mine: !!me && String((a.author as any)?._id) === String(me),
    }))
    .sort((a, b) => Number(b.accepted) - Number(a.accepted) || b.votes - a.votes || +new Date(a.createdAt) - +new Date(b.createdAt));

  res.json({ ...shapeThread(thread, me), answers: rows });
};

const editSchema = threadSchema.omit({ course: true });

export const updateThread = async (req: Request, res: Response) => {
  const thread = await loadThread(req.params.id);
  assertCanEdit(thread, req.user);
  thread.set(editSchema.parse(req.body));
  await thread.save();
  res.json(thread);
};

export const deleteThread = async (req: Request, res: Response) => {
  const thread = await loadThread(req.params.id);
  assertCanDelete(thread, req.user);
  await Answer.deleteMany({ thread: thread._id });
  await thread.deleteOne();
  res.json({ message: 'Question removed' });
};

async function toggleVote(model: any, id: string, userId: unknown) {
  const doc = await model.findById(id);
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'That does not exist.');
  if (String(doc.author) === String(userId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot vote on your own post.');
  }
  const voted = doc.upvotes.some((v: unknown) => String(v) === String(userId));
  const updated = await model.findByIdAndUpdate(
    id,
    voted ? { $pull: { upvotes: userId } } : { $addToSet: { upvotes: userId } },
    { new: true }
  );
  return { votes: updated.upvotes.length, votedByMe: !voted };
}

export const voteThread = async (req: Request, res: Response) => {
  mustBeId(req.params.id, 'That question');
  res.json(await toggleVote(Thread, req.params.id, req.user._id));
};

export const voteAnswer = async (req: Request, res: Response) => {
  mustBeId(req.params.id, 'That answer');
  res.json(await toggleVote(Answer, req.params.id, req.user._id));
};

const answerSchema = z.object({ text: z.string().trim().min(2, 'Write an answer first.').max(4000) });

export const addAnswer = async (req: Request, res: Response) => {
  const thread = await loadThread(req.params.id);
  const { text } = answerSchema.parse(req.body);
  const answer = await Answer.create({ thread: thread._id, author: req.user._id, text });
  await Thread.updateOne({ _id: thread._id }, { $inc: { answerCount: 1 } });
  await notify(thread.author, req.user, 'answer', thread.title, `/forum/${thread._id}`);
  res.status(201).json(answer);
};

const loadAnswer = async (id: string) => {
  mustBeId(id, 'That answer');
  const answer = await Answer.findById(id);
  if (!answer) throw new AppError(httpStatus.NOT_FOUND, 'That answer does not exist.');
  return answer;
};

export const updateAnswer = async (req: Request, res: Response) => {
  const answer = await loadAnswer(req.params.id);
  assertCanEdit(answer, req.user);
  answer.text = answerSchema.parse(req.body).text;
  await answer.save();
  res.json(answer);
};

export const deleteAnswer = async (req: Request, res: Response) => {
  const answer = await loadAnswer(req.params.id);
  assertCanDelete(answer, req.user);
  await answer.deleteOne();
  await Thread.updateOne({ _id: answer.thread, acceptedAnswer: answer._id }, { acceptedAnswer: null });
  await Thread.updateOne({ _id: answer.thread }, { $inc: { answerCount: -1 } });
  res.json({ message: 'Answer removed' });
};

export const acceptAnswer = async (req: Request, res: Response) => {
  const answer = await loadAnswer(req.params.id);
  const thread = await loadThread(String(answer.thread));
  if (!isOwner(thread, req.user)) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only the person who asked can accept an answer.');
  }
  const undo = String(thread.acceptedAnswer) === String(answer._id);
  thread.acceptedAnswer = undo ? null : answer._id;
  await thread.save();
  if (!undo) await notify(answer.author, req.user, 'accepted', thread.title, `/forum/${thread._id}`);
  res.json({ acceptedAnswer: thread.acceptedAnswer });
};

export const forumCourses = async (req: Request, res: Response) => {
  const rows = await Thread.aggregate([
    { $group: { _id: '$course', n: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$acceptedAnswer', null] }, 1, 0] } } } },
    { $sort: { n: -1 } },
    { $limit: 12 },
  ]);
  const courses = await Course.find({ _id: { $in: rows.map((r) => r._id) } }, 'code title').lean();
  const byId = new Map(courses.map((c) => [String(c._id), c]));
  res.json(rows.filter((r) => byId.has(String(r._id))).map((r) => ({ ...byId.get(String(r._id)), threads: r.n, open: r.open })));
};
