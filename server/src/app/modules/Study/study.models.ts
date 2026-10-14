import mongoose, { Schema } from 'mongoose';

// Everything in here belongs to one person. It is keyed by their user id,
// not their email, so changing your email does not lose your tasks.

const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const course = { type: Schema.Types.ObjectId, ref: 'Course', default: null };

export const Todo = mongoose.model(
  'Todo',
  new Schema(
    {
      owner,
      course,
      text: { type: String, required: true, trim: true, maxlength: 200 },
      priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
      deadline: { type: Date, default: null },
      completed: { type: Boolean, default: false },
    },
    { timestamps: true }
  )
);

export const EVENT_KINDS = ['class', 'quiz', 'exam', 'assignment', 'lab', 'other'] as const;

export const CalendarEvent = mongoose.model(
  'CalendarEvent',
  new Schema(
    {
      owner,
      course,
      title: { type: String, required: true, trim: true, maxlength: 120 },
      date: { type: Date, required: true },
      // "14:30"; empty means the whole day
      time: { type: String, default: '', match: /^$|^([01]\d|2[0-3]):[0-5]\d$/ },
      kind: { type: String, enum: EVENT_KINDS, default: 'other' },
    },
    { timestamps: true }
  )
);

export const Note = mongoose.model(
  'Note',
  new Schema(
    {
      owner,
      course,
      title: { type: String, required: true, trim: true, maxlength: 120 },
      // the editor's html; kept to a size that fits a long set of lecture notes
      content: { type: String, default: '', maxlength: 200000 },
      // the playlist the note was written against, so it reopens next to it
      playlist: { type: String, default: '', maxlength: 500 },
    },
    { timestamps: true }
  )
);
