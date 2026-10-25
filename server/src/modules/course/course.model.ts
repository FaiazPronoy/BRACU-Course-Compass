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
    prerequisites: [{ type: String, uppercase: true, trim: true }],
    recommended: [{ type: String, uppercase: true, trim: true }],
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
