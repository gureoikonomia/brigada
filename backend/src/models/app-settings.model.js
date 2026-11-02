import mongoose from 'mongoose';

const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global',
      unique: true,
      immutable: true,
    },
    votingEnabled: {
      type: Boolean,
      default: false,
    },
    adminInvariantVersion: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model('AppSettings', appSettingsSchema);
