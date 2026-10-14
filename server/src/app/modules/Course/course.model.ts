import mongoose, { Schema } from 'mongoose';

const linkSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const courseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z]{3}\d{3}$/ },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    department: { type: String, required: true, uppercase: true, trim: true, maxlength: 6 },
    credits: { type: Number, default: 3, min: 0, max: 6 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    // codes rather than ids, so a prerequisite can be listed before its course is added.
    // `prerequisites` are hard (the portal will not let you register without them);
    // `recommended` are soft ones, worth doing first but not required
    prerequisites: [{ type: String, uppercase: true, trim: true }],
    recommended: [{ type: String, uppercase: true, trim: true }],
    // a program that asks for something else, e.g. MAT215 needs MAT216 for CSE but MAT120 for EEE
    programPrerequisites: [
      {
        _id: false,
        program: { type: String, uppercase: true, trim: true },
        codes: [{ type: String, uppercase: true, trim: true }],
      },
    ],
    playlists: [linkSchema],
    materials: [linkSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
