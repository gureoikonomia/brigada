import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true, // crea el índice en Mongo automáticamente
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email no válido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: true,
    },
    privacyNoticeAcknowledgedAt: {
      type: Date,
      default: null,
    },
    privacyNoticeVersion: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    avatarPublicId: {
      type: String,
      default: null,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('User', userSchema);