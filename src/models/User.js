import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const avatarSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    username: { type: String, trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    institution: { type: String, trim: true },
    level: { type: String, trim: true }, // e.g. A/B/O level
    course: { type: String, trim: true },

    avatar: avatarSchema,

    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    taskLimitYear: { type: Number, default: 200 },
    tasksCreatedThisYear: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    passwordChangedAt: Date
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  // subtract 1s to account for token being issued before this timestamp is stored
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

export default mongoose.model('User', userSchema);
