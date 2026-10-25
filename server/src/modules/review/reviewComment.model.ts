import mongoose, { Schema } from 'mongoose';

const reviewCommentSchema = new Schema(
  {
    review: { type: Schema.Types.ObjectId, ref: 'Review', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export default mongoose.model('ReviewComment', reviewCommentSchema);
