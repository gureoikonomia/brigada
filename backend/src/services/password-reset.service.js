import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';

import User from '../models/user.model.js';
import PasswordResetToken from '../models/passwordResetToken.model.js';
import { ServiceError } from '../errors/service.error.js';
import { sendPasswordChangedNotification, sendResetEmail } from '../utils/email.js';

function sanitizeMailDiagnostic(value) {
  if (typeof value !== 'string') return undefined;
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b[a-f0-9]{32,}\b/gi, '[redacted-token]')
    .replace(/\b(password|pass|token|secret|key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f ? ' ' : character;
    })
    .join('')
    .slice(0, 300);
}

function logPasswordResetFailure(stage, error) {
  console.error('Password reset processing failed', {
    stage,
    name: error?.name,
    code: error?.code,
    command: error?.command,
    responseCode: error?.responseCode,
    message: sanitizeMailDiagnostic(error?.message),
    response: sanitizeMailDiagnostic(error?.response),
  });
}

export function createPasswordResetLink(frontendUrl, token, userId) {
  const resetUrl = new URL('/recuperar-contrasena', frontendUrl);
  resetUrl.searchParams.set('token', token);
  resetUrl.searchParams.set('uid', userId.toString());
  return resetUrl.toString();
}

async function requestPasswordReset(email) {
  let stage = 'account_lookup';
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.info('Password reset request completed without a matching account');
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    stage = 'token_storage';
    await PasswordResetToken.deleteMany({ userId: user._id });
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = createPasswordResetLink(frontendUrl, rawToken, user._id);

    stage = 'smtp_submission';
    const info = await sendResetEmail(user.email, resetLink);
    console.info('Password reset SMTP submission completed', {
      acceptedCount: Array.isArray(info.accepted) ? info.accepted.length : 0,
      rejectedCount: Array.isArray(info.rejected) ? info.rejected.length : 0,
      responseCode: Number(/^\s*(\d{3})/.exec(info.response)?.[1]) || null,
      response: sanitizeMailDiagnostic(info.response),
    });
  } catch (error) {
    logPasswordResetFailure(stage, error);
  }
}

async function resetPassword({ uid, token, newPassword }) {
  const record = await PasswordResetToken.findOne({
    userId: uid,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record || !(await bcrypt.compare(token, record.tokenHash))) {
    throw new ServiceError('Enlace inválido o expirado', 400);
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  const session = await User.startSession();
  let user;

  try {
    await session.withTransaction(async () => {
      const claimedToken = await PasswordResetToken.findOneAndUpdate(
        { _id: record._id, usedAt: null, expiresAt: { $gt: new Date() } },
        { usedAt: new Date() },
        { returnDocument: 'after', session },
      );

      if (!claimedToken) return;

      user = await User.findByIdAndUpdate(
        uid,
        { $set: { password: newHash }, $inc: { tokenVersion: 1 } },
        { returnDocument: 'after', session },
      );

      if (!user) throw new ServiceError('Enlace inválido o expirado', 400);
      await PasswordResetToken.deleteMany({ userId: uid }, { session });
    });
  } finally {
    await session.endSession();
  }

  if (!user) throw new ServiceError('Enlace inválido o expirado', 400);

  try {
    await sendPasswordChangedNotification(user.email);
  } catch (error) {
    console.error('Password change notification could not be sent', {
      name: error?.name,
      code: error?.code,
    });
  }
}

export const passwordResetService = {
  requestPasswordReset,
  resetPassword,
};
