import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export const DEPARTMENTS = ['CSE', 'CS', 'EEE', 'ECE', 'BBA', 'ENG', 'MNS', 'ARC', 'PHR', 'LAW', 'OTHER'] as const;

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  department: string;
  studentId: string;
  bio: string;
  savedCourses: Types.ObjectId[];
  createdAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false so the hash cannot leak through a handler that forgets to
    // project it; login asks for it explicitly
    password: { type: String, default: '', select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    department: { type: String, enum: DEPARTMENTS, default: 'CSE' },
    studentId: { type: String, default: '', trim: true, maxlength: 12 },
    bio: { type: String, default: '', trim: true, maxlength: 300 },
    savedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

// what the rest of the app is allowed to know about a person
export const publicUser = (u: IUser) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  department: u.department,
  studentId: u.studentId,
  bio: u.bio,
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
