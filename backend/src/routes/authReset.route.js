import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';

import User from '../models/user.model.js';
import PasswordResetToken from '../models/passwordResetToken.model.js';
import { sendResetEmail, sendPasswordChangedNotification } from '../utils/email.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ServiceError } from '../errors/service.error.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';
import { SESSION_COOKIE_NAME, cookieOptions } from '../utils/security.js';
import { createRateLimitStore } from '../middlewares/mongo-rate-limit.store.js';

const isProduction = process.env.NODE_ENV === 'production';

const router = express.Router();

// Rate limiter específico para rutas de recuperación de contraseña
// (5 intentos por IP en 15 minutos)
const resetRateLimiter = rateLimit({
  store: createRateLimitStore('password-reset'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, prueba más tarde' },
});

function sanitizeMailDiagnostic(value) {
  if (typeof value !== 'string') return undefined;
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b[a-f0-9]{32,}\b/gi, '[redacted-token]')
    .replace(/\b(password|pass|token|secret|key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/[\r\n\x00-\x1f\x7f]+/g, ' ')
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

/**
 * POST /api/auth/forgot-password
 * Recibe un email y, si existe, envía un enlace de recuperación.
 * Siempre responde igual para no revelar si el email existe (anti-enumeration).
 */
async function issuePasswordReset(email) {
  let stage = 'account_lookup';
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.info('Password reset request completed without a matching account');
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
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

router.post(
  '/forgot-password',
  resetRateLimiter,
  validate(forgotPasswordSchema),
  (req, res) => {
    const { email } = req.validated.body;
    void issuePasswordReset(email);
    return res.json({
      message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.',
    });
  }
);

/**
 * POST /api/auth/reset-password
 * Valida el token y actualiza la contraseña del usuario.
 */
export async function resetPassword(req, res, next) {
  try {
    const { uid, token, newPassword } = req.validated.body;

    // Buscar token activo (no usado y no expirado)
    const record = await PasswordResetToken.findOne({
      userId: uid,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({ message: 'Enlace inválido o expirado' });
    }

    // Comparar el token enviado con el hash guardado
    const isValid = await bcrypt.compare(token, record.tokenHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Enlace inválido o expirado' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const session = await User.startSession();
    let user;

    try {
      await session.withTransaction(async () => {
        const claimedToken = await PasswordResetToken.findOneAndUpdate(
          { _id: record._id, usedAt: null, expiresAt: { $gt: new Date() } },
          { usedAt: new Date() },
          { returnDocument: 'after', session }
        );

        if (!claimedToken) return;

        user = await User.findByIdAndUpdate(
          uid,
          { $set: { password: newHash }, $inc: { tokenVersion: 1 } },
          { returnDocument: 'after', session }
        );

        if (!user) {
          throw new ServiceError('Enlace inválido o expirado', 400);
        }
        await PasswordResetToken.deleteMany({ userId: uid }, { session });
      });
    } finally {
      await session.endSession();
    }

    if (!user) {
      return res.status(400).json({ message: 'Enlace inválido o expirado' });
    }

    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions(isProduction));

    // Notificar al usuario por email
    try {
      await sendPasswordChangedNotification(user.email);
    } catch (emailError) {
      console.error('No se pudo enviar la notificación de cambio de contraseña:', emailError);
    }

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    return next(err);
  }
}

router.post(
  '/reset-password',
  resetRateLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

export default router;