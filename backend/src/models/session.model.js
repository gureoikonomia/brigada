import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenVersion: {
      type: Number,
      required: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    previousRefreshTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
    refreshExpiresAt: {
      type: Date,
      required: true,
    },
    absoluteExpiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      required: true,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: 512,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ refreshExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Session', sessionSchema);
