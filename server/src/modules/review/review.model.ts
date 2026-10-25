import mongoose, { Schema } from 'mongoose';
import { GRADES } from '../../utils/grades';

const score = { type: Number, required: true, min: 1, max: 5 };

const reviewSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    faculty: { type: String, required: true, uppercase: true, trim: true, maxlength: 6 },
    semester: { type: String, required: true, trim: true },
    rating: score,
    difficulty: score,
    workload: score,
    grade: { type: String, enum: [...GRADES, ''], default: '' },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    tips: { type: String, default: '', trim: true, maxlength: 1000 },
    helpful: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

reviewSchema.index({ course: 1, author: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
