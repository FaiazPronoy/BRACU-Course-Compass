import { Request, Response } from 'express';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { z } from 'zod';
import AppError from '../../errors/AppError';
import Course from './course.model';
import Review from '../Review/review.model';
import ReviewComment from '../Review/reviewComment.model';
import Thread from '../Forum/thread.model';
import Answer from '../Forum/answer.model';
import User from '../User/User.model';

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const round = (n: number) => Math.round(n * 10) / 10;

// average rating, difficulty and workload for each course, from its reviews
export async function statsByCourse(ids: mongoose.Types.ObjectId[]) {
  const rows = await Review.aggregate([
    { $match: { course: { $in: ids } } },
    {
      $group: {
        _id: '$course',
        reviews: { $sum: 1 },
        rating: { $avg: '$rating' },
        difficulty: { $avg: '$difficulty' },
        workload: { $avg: '$workload' },
      },
    },
  ]);
  return new Map(
    rows.map((r) => [
      String(r._id),
      { reviews: r.reviews, rating: round(r.rating), difficulty: round(r.difficulty), workload: round(r.workload) },
    ])
  );
}

export const emptyStats = { reviews: 0, rating: 0, difficulty: 0, workload: 0 };

// the hard prerequisites that apply to a student of `program`
export const prerequisitesFor = (
  course: { prerequisites?: string[]; programPrerequisites?: { program?: string | null; codes: string[] }[] },
  program?: string
) => course.programPrerequisites?.find((p) => p.program === program)?.codes ?? course.prerequisites ?? [];

export const listCourses = async (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim();
  const dept = String(req.query.dept || '').trim().toUpperCase();
  const sort = String(req.query.sort || 'code');

  const filter: Record<string, unknown> = {};
  if (dept) filter.department = dept;
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ code: re }, { title: re }];
  }

  const courses = await Course.find(filter).sort({ code: 1 }).lean();
  const ids = courses.map((c) => c._id);
  const [stats, threadRows] = await Promise.all([
    statsByCourse(ids),
    Thread.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: '$course', n: { $sum: 1 } } }]),
  ]);
  const threads = new Map(threadRows.map((r) => [String(r._id), r.n]));
  const saved = new Set((req.user?.savedCourses || []).map(String));

  const rows = courses.map((c) => ({
    ...c,
    stats: stats.get(String(c._id)) || emptyStats,
    threads: threads.get(String(c._id)) || 0,
    saved: saved.has(String(c._id)),
  }));

  const by: Record<string, (a: any, b: any) => number> = {
    rating: (a, b) => b.stats.rating - a.stats.rating || b.stats.reviews - a.stats.reviews,
    reviews: (a, b) => b.stats.reviews - a.stats.reviews,
    // courses nobody has rated yet go to the end rather than looking easiest
    easiest: (a, b) => (a.stats.difficulty || 9) - (b.stats.difficulty || 9),
  };
  if (by[sort]) rows.sort(by[sort]);
  res.json(rows);
};

// a course is addressed by its code in the url (/courses/CSE220), or by id from the admin screens
export const findCourse = async (key: string) => {
  const course = mongoose.Types.ObjectId.isValid(key)
    ? await Course.findById(key)
    : await Course.findOne({ code: String(key).toUpperCase() });
  if (!course) throw new AppError(httpStatus.NOT_FOUND, 'We could not find that course.');
  return course;
};

export const getCourse = async (req: Request, res: Response) => {
  const course = await findCourse(req.params.key);

  const [stats, grades, faculties, prerequisiteCourses, unlocks, threads] = await Promise.all([
    statsByCourse([course._id]),
    Review.aggregate([
      { $match: { course: course._id, grade: { $nin: [null, ''] } } },
      { $group: { _id: '$grade', n: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { course: course._id } },
      { $group: { _id: '$faculty', reviews: { $sum: 1 }, rating: { $avg: '$rating' } } },
      { $sort: { reviews: -1, _id: 1 } },
    ]),
    Course.find({ code: { $in: [...course.prerequisites, ...course.recommended] } }, 'code title').lean(),
    Course.find({ $or: [{ prerequisites: course.code }, { recommended: course.code }] }, 'code title').sort({ code: 1 }).lean(),
    Thread.countDocuments({ course: course._id }),
  ]);

  res.json({
    ...course.toObject(),
    stats: stats.get(String(course._id)) || emptyStats,
    threads,
    grades: Object.fromEntries(grades.map((g) => [g._id, g.n])),
    faculties: faculties.map((f) => ({ faculty: f._id, reviews: f.reviews, rating: round(f.rating) })),
    prerequisiteCourses,
    unlocks,
    saved: !!req.user?.savedCourses?.some((id) => String(id) === String(course._id)),
  });
};

const link = z.object({
  title: z.string().trim().min(1, 'Every link needs a title.').max(120),
  // zod's url() accepts javascript: and data: links, which would run when a
  // student clicks them, so the scheme is checked as well
  url: z
    .string()
    .trim()
    .max(500)
    .url('Links need to start with http:// or https://')
    .refine((u) => /^https?:\/\//i.test(u), 'Links need to start with http:// or https://'),
});

const code = z.string().trim().toUpperCase().regex(/^[A-Z]{3}\d{3}$/, 'A course code looks like CSE220.');

export const courseSchema = z.object({
  code,
  title: z.string().trim().min(3, 'Give the course a title.').max(120),
  department: z.string().trim().toUpperCase().min(2).max(6),
  credits: z.coerce.number().min(0).max(6).default(3),
  description: z.string().trim().max(2000).default(''),
  prerequisites: z.array(code).max(6).default([]),
  recommended: z.array(code).max(6).default([]),
  programPrerequisites: z
    .array(z.object({ program: z.string().trim().toUpperCase().min(2).max(6), codes: z.array(code).max(6) }))
    .max(6)
    .default([]),
  playlists: z.array(link).max(12).default([]),
  materials: z.array(link).max(30).default([]),
});

const notItself = (body: z.infer<typeof courseSchema>) => {
  const all = [...body.prerequisites, ...body.recommended, ...body.programPrerequisites.flatMap((p) => p.codes)];
  if (all.includes(body.code)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'A course cannot be its own prerequisite.');
  }
};

export const createCourse = async (req: Request, res: Response) => {
  const body = courseSchema.parse(req.body);
  notItself(body);
  if (await Course.exists({ code: body.code })) {
    throw new AppError(httpStatus.CONFLICT, `${body.code} is already in the catalogue.`);
  }
  const course = await Course.create(body);
  res.status(201).json(course);
};

export const updateCourse = async (req: Request, res: Response) => {
  const course = await findCourse(req.params.key);
  const body = courseSchema.parse(req.body);
  notItself(body);
  if (body.code !== course.code) {
    if (await Course.exists({ code: body.code })) {
      throw new AppError(httpStatus.CONFLICT, `${body.code} is already in the catalogue.`);
    }
    // a renamed code has to follow into the prerequisite lists that mention it
    await Course.updateMany({ prerequisites: course.code }, { $set: { 'prerequisites.$': body.code } });
    await Course.updateMany({ recommended: course.code }, { $set: { 'recommended.$': body.code } });
  }
  course.set(body);
  await course.save();
  res.json(course);
};

export const deleteCourse = async (req: Request, res: Response) => {
  const course = await findCourse(req.params.key);
  // everything that hangs off the course goes with it, rather than being left
  // pointing at nothing
  const [reviews, threads] = await Promise.all([
    Review.find({ course: course._id }, '_id'),
    Thread.find({ course: course._id }, '_id'),
  ]);
  await Promise.all([
    ReviewComment.deleteMany({ review: { $in: reviews.map((r) => r._id) } }),
    Review.deleteMany({ course: course._id }),
    Answer.deleteMany({ thread: { $in: threads.map((t) => t._id) } }),
    Thread.deleteMany({ course: course._id }),
    User.updateMany({}, { $pull: { savedCourses: course._id } }),
    Course.updateMany({}, { $pull: { prerequisites: course.code, recommended: course.code } }),
  ]);
  await course.deleteOne();
  res.json({ message: `${course.code} deleted` });
};

export const departments = async (req: Request, res: Response) => {
  res.json((await Course.distinct('department')).sort());
};
