import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { z } from 'zod';
import AppError from '../../errors/AppError';
import { COURSE_CODE, GRADES, SEMESTER, semesterKey, transcript } from '../../utils/grades';
import { mustBeId } from '../../utils/ownership';
import { findCourse, prerequisitesFor } from '../Course/course.controller';
import Course from '../Course/course.model';
import Plan from './planner.model';

const planFor = async (userId: unknown) =>
  (await Plan.findOne({ owner: userId })) || (await Plan.create({ owner: userId }));

// the plan as the page needs it: semesters in date order, each course marked
// with any prerequisite that is neither passed nor planned for an earlier semester.
// Hard ones go in `missing`, recommended ones in `advised`.
async function present(userId: unknown, program?: string) {
  const plan = await Plan.findOne({ owner: userId })
    .populate('semesters.courses', 'code title credits prerequisites recommended programPrerequisites')
    .lean();
  if (!plan) {
    return { semesters: [], records: [], summary: { cgpa: null, credits: 0, attempted: 0, planned: 0, standing: null } };
  }

  const { counted, cgpa, earned, attempted, standing } = transcript(plan.records);
  const passed = new Set([...counted].filter((r) => !['F', 'I', 'W'].includes(r.grade)).map((r) => r.code));

  const semesters = [...plan.semesters].sort((a, b) => semesterKey(a.name) - semesterKey(b.name));
  const before = new Set(passed);
  let planned = 0;
  const shaped = semesters.map((s) => {
    const courses = (s.courses as any[]).filter(Boolean).map((c) => ({
      ...c,
      missing: prerequisitesFor(c, program).filter((p: string) => !before.has(p)),
      advised: (c.recommended || []).filter((p: string) => !before.has(p)),
    }));
    // a course planned this semester counts as done for the ones after it
    courses.forEach((c) => before.add(c.code));
    const credits = courses.reduce((n, c) => n + (c.credits ?? 3), 0);
    planned += credits;
    return { _id: s._id, name: s.name, courses, credits };
  });

  return {
    semesters: shaped,
    // newest semester first; `counted` is false for an attempt a retake replaced (NT on the sheet)
    records: plan.records
      .map((r) => ({ ...r, counted: counted.has(r) }))
      .sort((a, b) => semesterKey(b.semester) - semesterKey(a.semester) || a.code.localeCompare(b.code)),
    summary: { cgpa, credits: earned, attempted, planned, standing },
  };
}

export const getPlan = async (req: Request, res: Response) => {
  res.json(await present(req.user._id, req.user.department));
};

const semesterName = z.object({
  name: z.string().trim().regex(SEMESTER, 'Semester looks like Fall 2026.'),
});

export const addSemester = async (req: Request, res: Response) => {
  const { name } = semesterName.parse(req.body);
  const plan = await planFor(req.user._id);
  if (plan.semesters.some((s) => s.name === name)) {
    throw new AppError(httpStatus.CONFLICT, `${name} is already in your plan.`);
  }
  if (plan.semesters.length >= 16) {
    throw new AppError(httpStatus.BAD_REQUEST, 'That is enough semesters for one degree.');
  }
  plan.semesters.push({ name, courses: [] });
  await plan.save();
  res.status(201).json(await present(req.user._id, req.user.department));
};

const loadSemester = async (req: Request) => {
  mustBeId(req.params.id, 'That semester');
  const plan = await planFor(req.user._id);
  const semester = plan.semesters.id(req.params.id);
  if (!semester) throw new AppError(httpStatus.NOT_FOUND, 'That semester is not in your plan.');
  return { plan, semester };
};

export const removeSemester = async (req: Request, res: Response) => {
  const { plan, semester } = await loadSemester(req);
  semester.deleteOne();
  await plan.save();
  res.json(await present(req.user._id, req.user.department));
};

export const planCourse = async (req: Request, res: Response) => {
  const { plan, semester } = await loadSemester(req);
  const course = await findCourse(String(req.body?.course || ''));
  if (plan.semesters.some((s) => s.courses.some((c) => String(c) === String(course._id)))) {
    throw new AppError(httpStatus.CONFLICT, `${course.code} is already planned.`);
  }
  if (plan.records.some((r) => r.code === course.code && !['F', 'I', 'W'].includes(r.grade))) {
    throw new AppError(httpStatus.CONFLICT, `You have already passed ${course.code}.`);
  }
  if (semester.courses.length >= 7) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Seven courses is the most one semester can hold.');
  }
  semester.courses.push(course._id);
  await plan.save();
  res.json(await present(req.user._id, req.user.department));
};

export const unplanCourse = async (req: Request, res: Response) => {
  const { plan, semester } = await loadSemester(req);
  semester.courses = semester.courses.filter((c) => String(c) !== req.params.courseId) as any;
  await plan.save();
  res.json(await present(req.user._id, req.user.department));
};

const recordSchema = z.object({
  code: z.string().trim().toUpperCase().regex(COURSE_CODE, 'A course code looks like CSE220.'),
  title: z.string().trim().max(120).optional(),
  credits: z.coerce.number().min(0, 'Credits run from 0 to 6.').max(6, 'Credits run from 0 to 6.').optional(),
  grade: z.enum(GRADES, { errorMap: () => ({ message: 'Pick a grade.' }) }),
  semester: z.string().trim().regex(SEMESTER, 'Semester looks like Spring 2025.').or(z.literal('')).default(''),
});

// fills in the title and credits from the catalogue when the course is in it
async function shapeRecords(input: z.infer<typeof recordSchema>[]) {
  const known = new Map(
    (await Course.find({ code: { $in: input.map((r) => r.code) } }, 'code title credits').lean()).map((c) => [c.code, c])
  );
  return input.map((r) => ({
    code: r.code,
    title: r.title || known.get(r.code)?.title || '',
    credits: r.credits ?? known.get(r.code)?.credits ?? 3,
    grade: r.grade,
    semester: r.semester,
  }));
}

// a passed course no longer needs a place in a future semester
async function unplanPassed(plan: any, codes: string[]) {
  const ids = new Set((await Course.find({ code: { $in: codes } }, '_id').lean()).map((c) => String(c._id)));
  plan.semesters.forEach((s: any) => {
    s.courses = s.courses.filter((c: unknown) => !ids.has(String(c)));
  });
}

// one attempt per course per semester: saving it again edits that attempt,
// while the same course in a later semester is a retake
export const saveRecord = async (req: Request, res: Response) => {
  const [record] = await shapeRecords([recordSchema.parse(req.body)]);
  const plan = await planFor(req.user._id);
  plan.records = plan.records.filter((r) => !(r.code === record.code && r.semester === record.semester)) as any;
  if (plan.records.length >= 150) throw new AppError(httpStatus.BAD_REQUEST, 'That is more courses than one degree holds.');
  plan.records.push(record);
  if (!['F', 'I', 'W'].includes(record.grade)) await unplanPassed(plan, [record.code]);
  await plan.save();
  res.json(await present(req.user._id, req.user.department));
};

const importSchema = z.object({
  records: z.array(recordSchema).min(1, 'No courses found to import.').max(150, 'That is more courses than one degree holds.'),
});

// a whole grade sheet at once, replacing whatever was there
export const importRecords = async (req: Request, res: Response) => {
  const { records } = importSchema.parse(req.body);
  const plan = await planFor(req.user._id);
  plan.records = (await shapeRecords(records)) as any;
  await unplanPassed(plan, records.filter((r) => !['F', 'I', 'W'].includes(r.grade)).map((r) => r.code));
  await plan.save();
  res.json(await present(req.user._id, req.user.department));
};

export const removeRecord = async (req: Request, res: Response) => {
  mustBeId(req.params.id, 'That grade');
  const plan = await planFor(req.user._id);
  plan.records = plan.records.filter((r) => String(r._id) !== req.params.id) as any;
  await plan.save();
  res.json(await present(req.user._id, req.user.department));
};

export const clearRecords = async (req: Request, res: Response) => {
  const plan = await planFor(req.user._id);
  plan.records = [] as any;
  await plan.save();
  res.json(await present(req.user._id, req.user.department));
};
