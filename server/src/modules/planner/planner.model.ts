import mongoose, { Schema } from 'mongoose';
import { GRADES } from '../../utils/grades';

const planSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    semesters: [
      {
        name: { type: String, required: true },
        courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
      },
    ],
    records: [
      {
        code: { type: String, required: true },
        title: { type: String, default: '' },
        credits: { type: Number, required: true, min: 0, max: 6 },
        grade: { type: String, enum: GRADES, required: true },
        semester: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);
