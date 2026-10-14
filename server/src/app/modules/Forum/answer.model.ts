import mongoose, { Schema } from 'mongoose';

const answerSchema = new Schema(
  {
    thread: { type: Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Answer', answerSchema);
