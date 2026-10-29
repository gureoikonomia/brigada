import mongoose from 'mongoose';

const pendingMediaDeletionSchema = new mongoose.Schema(
  {
    publicIds: {
      type: [String],
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
    leaseId: {
      type: String,
      default: null,
    },
    leaseUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

pendingMediaDeletionSchema.index({ nextAttemptAt: 1, createdAt: 1 });

export default mongoose.model('PendingMediaDeletion', pendingMediaDeletionSchema);
