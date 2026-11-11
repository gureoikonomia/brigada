import mongoose from 'mongoose';

const accountDeletionTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

accountDeletionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
accountDeletionTokenSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('AccountDeletionToken', accountDeletionTokenSchema);
