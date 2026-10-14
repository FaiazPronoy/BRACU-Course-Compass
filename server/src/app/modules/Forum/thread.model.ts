import mongoose, { Schema } from 'mongoose';

const threadSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // set when the asker accepts an answer; a resolved thread stays readable
    acceptedAnswer: { type: Schema.Types.ObjectId, ref: 'Answer', default: null },
    answerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Thread', threadSchema);
