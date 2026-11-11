import mongoose from 'mongoose';

const incidentReportSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'personal_data', 'misinformation', 'other'],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'actioned', 'dismissed'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

incidentReportSchema.index(
  { incident: 1, reporter: 1 },
  {
    unique: true,
    partialFilterExpression: { reporter: { $type: 'objectId' } },
  },
);
incidentReportSchema.index(
  { reviewedAt: 1 },
  {
    expireAfterSeconds: 365 * 24 * 60 * 60,
    partialFilterExpression: { reviewedAt: { $type: 'date' } },
  },
);

export default mongoose.model('IncidentReport', incidentReportSchema);
