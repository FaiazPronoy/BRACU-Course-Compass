import mongoose, { Schema } from 'mongoose';

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
      content: { type: String, default: '', maxlength: 200000 },
      playlist: { type: String, default: '', maxlength: 500 },
    },
    { timestamps: true }
  )
);
