import mongoose from 'mongoose';

const emailVerificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'email-change'],
    default: 'signup',
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    required() {
      return this.purpose === 'email-change';
    },
    match: /^\S+@\S+\.\S+$/,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);
