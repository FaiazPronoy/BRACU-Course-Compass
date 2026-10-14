import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { z } from 'zod';
import AppError from '../../errors/AppError';
import { mustBeId } from '../../utils/ownership';
import Course from '../Course/course.model';
import { CalendarEvent, EVENT_KINDS, Note, Todo } from './study.models';

// a course can be given as its id or its code; unknown ones are refused
const courseRef = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform(async (key, ctx) => {
    if (!key) return null;
    const course = /^[a-f\d]{24}$/i.test(key)
      ? await Course.findById(key, '_id')
      : await Course.findOne({ code: key.toUpperCase() }, '_id');
    if (!course) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'That course is not in the catalogue.' });
      return z.NEVER;
    }
    return course._id;
  });

const day = z.coerce.date({ errorMap: () => ({ message: 'Pick a date.' }) });

// one set of handlers for the three kinds of personal item; every query is
// scoped to the signed-in owner, so nobody can read or change another's
function personal(model: any, schema: z.ZodObject<any>, sort: Record<string, 1 | -1>, what: string) {
  const load = async (req: Request) => {
    mustBeId(req.params.id, `That ${what}`);
    const doc = await model.findOne({ _id: req.params.id, owner: req.user._id });
    if (!doc) throw new AppError(httpStatus.NOT_FOUND, `That ${what} does not exist.`);
    return doc;
  };

  return {
    list: async (req: Request, res: Response) => {
      const filter: Record<string, unknown> = { owner: req.user._id };
      if (req.query.course) filter.course = await courseRef.parseAsync(String(req.query.course));
      res.json(await model.find(filter).sort(sort).populate('course', 'code title').lean());
    },
    create: async (req: Request, res: Response) => {
      const body = await schema.parseAsync(req.body);
      const doc = await model.create({ ...body, owner: req.user._id });
      res.status(201).json(await doc.populate('course', 'code title'));
    },
    update: async (req: Request, res: Response) => {
      const doc = await load(req);
      const parsed = await schema.partial().parseAsync(req.body);
      // only the fields that were sent; the schema's defaults would otherwise
      // reset everything else (ticking a task done must not clear its deadline)
      for (const key of Object.keys(req.body || {})) {
        if (key in parsed) doc.set(key, (parsed as any)[key]);
      }
      await doc.save();
      res.json(await doc.populate('course', 'code title'));
    },
    remove: async (req: Request, res: Response) => {
      const doc = await load(req);
      await doc.deleteOne();
      res.json({ message: 'Deleted' });
    },
    get: async (req: Request, res: Response) => {
      res.json(await (await load(req)).populate('course', 'code title'));
    },
  };
}

export const todos = personal(
  Todo,
  z.object({
    text: z.string().trim().min(1, 'Write the task first.').max(200),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    deadline: day.nullable().optional(),
    course: courseRef,
    completed: z.boolean().default(false),
  }),
  { completed: 1, deadline: 1, createdAt: -1 },
  'task'
);

export const events = personal(
  CalendarEvent,
  z.object({
    title: z.string().trim().min(1, 'Give the event a name.').max(120),
    date: day,
    time: z.string().trim().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Time looks like 14:30.').default(''),
    kind: z.enum(EVENT_KINDS).default('other'),
    course: courseRef,
  }),
  { date: 1, time: 1 },
  'event'
);

export const notes = personal(
  Note,
  z.object({
    title: z.string().trim().min(1, 'Give the note a title.').max(120),
    content: z.string().max(200000, 'That note is too long to save.').default(''),
    course: courseRef,
    playlist: z.string().trim().max(500).default(''),
  }),
  { updatedAt: -1 },
  'note'
);
