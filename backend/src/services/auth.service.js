import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import bcrypt from 'bcrypt';

import User from '../models/user.model.js';
import EmailVerificationToken from '../models/emailVerificationToken.model.js';
import PasswordResetToken from '../models/passwordResetToken.model.js';
import { ServiceError } from '../errors/service.error.js';
import { createSessionToken } from './session.service.js';
import uploadService from './upload.service.js';
import { sendVerificationEmail } from '../utils/email.js';
import {
  enqueueMediaDeletion,
  processPendingMediaDeletions,
} from './media-deletion.service.js';

const SALT_ROUNDS = 10;
const dummyPasswordHash = bcrypt.hash('not-a-real-account-password', SALT_ROUNDS);
const MIN_ACCOUNT_LOOKUP_RESPONSE_MS = 500;

async function normalizeAccountLookupDuration(startedAt) {
  const remainingMs = MIN_ACCOUNT_LOOKUP_RESPONSE_MS - (Date.now() - startedAt);
  if (remainingMs > 0) await delay(remainingMs);
}

/**
 * Registra un nuevo usuario.
 */
async function register({
  name,
  email,
  password,
  privacyNoticeAcknowledged,
  privacyNoticeVersion,
}) {
  const startedAt = Date.now();
  if (
    process.env.NODE_ENV === 'production' &&
    (
      privacyNoticeAcknowledged !== true ||
      privacyNoticeVersion !== process.env.PRIVACY_NOTICE_VERSION
    )
  ) {
    throw new ServiceError('Debes leer y aceptar el aviso de privacidad vigente', 400);
  }

  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(
    password,
    SALT_ROUNDS
  );

  const existing = await User.findOne({ email: normalizedEmail }).select('_id').lean();
  if (!existing) {
    let user;
    try {
      user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: false,
        ...(privacyNoticeAcknowledged && {
          privacyNoticeAcknowledgedAt: new Date(),
          privacyNoticeVersion,
        }),
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }

    if (user) {
      try {
        await issueVerificationEmail(user);
      } catch (error) {
        console.error('No se pudo preparar el correo de verificación:', error.message);
      }
    }
  }

  await normalizeAccountLookupDuration(startedAt);
  return { verificationRequired: true };
}

function hashVerificationToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function issueVerificationEmail(user, { email = user.email, purpose = 'signup' } = {}) {
  const rawToken = randomBytes(32).toString('hex');
  await EmailVerificationToken.deleteMany({ userId: user._id });
  await EmailVerificationToken.create({
    userId: user._id,
    tokenHash: hashVerificationToken(rawToken),
    purpose,
    email,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationLink = `${frontendUrl}/verificar-email?token=${rawToken}&uid=${user._id}`;
  void sendVerificationEmail(email, verificationLink, purpose === 'email-change').catch((error) => {
    console.error('No se pudo enviar el correo de verificación:', error.message);
  });
}

async function resendVerification(email) {
  const startedAt = Date.now();
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && user.emailVerified === false) {
    try {
      await issueVerificationEmail(user);
    } catch (error) {
      console.error('No se pudo preparar el correo de verificación:', error.message);
    }
  }
  await normalizeAccountLookupDuration(startedAt);
  return { verificationRequired: true };
}

async function verifyEmail({ uid, token }) {
  const session = await User.startSession();
  let emailChanged = false;

  try {
    await session.withTransaction(async () => {
      const record = await EmailVerificationToken.findOneAndDelete({
        userId: uid,
        tokenHash: hashVerificationToken(token),
        expiresAt: { $gt: new Date() },
      }, { session });

      if (!record) throw new ServiceError('Enlace inválido o expirado', 400);
      if (record.purpose === 'email-change' && !record.email) {
        throw new ServiceError('Enlace inválido o expirado', 400);
      }

      const update = record.purpose === 'email-change'
        ? {
            $set: { email: record.email, emailVerified: true },
            $inc: { tokenVersion: 1 },
          }
        : { $set: { emailVerified: true } };

      const user = await User.findByIdAndUpdate(uid, update, {
        new: true,
        runValidators: true,
        session,
      });

      if (!user) throw new ServiceError('Enlace inválido o expirado', 400);
      emailChanged = record.purpose === 'email-change';
      await EmailVerificationToken.deleteMany({ userId: uid }, { session });
      if (emailChanged) {
        await PasswordResetToken.deleteMany({ userId: uid }, { session });
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ServiceError('Ese correo ya está asociado a otra cuenta', 409);
    }
    throw error;
  } finally {
    await session.endSession();
  }

  return { verified: true, emailChanged };
}

/**
 * Login.
 */
async function login({ email, password }) {
  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select('+password +tokenVersion');

  const passwordHash = user ? user.password : await dummyPasswordHash;
  const passwordMatches = await bcrypt.compare(password, passwordHash);

  if (!user || !user.isActive || user.emailVerified === false || !passwordMatches) {
    throw new ServiceError(
      'Credenciales incorrectas',
      401
    );
  }

  const token = await createSessionToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  };
}

/**
 * Devuelve el perfil del usuario autenticado.
 */
async function getProfile(userId) {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw new ServiceError(
      'Usuario no encontrado',
      404
    );
  }

  return user;
}

/**
 * Actualiza el nombre del usuario autenticado. El email tiene un flujo de verificación separado.
 */
async function updateProfile(userId, { name }) {
  const updates = {};
  if (name !== undefined) updates.name = name;

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!user) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  return user;
}

async function requestEmailChange(userId, { email, currentPassword }) {
  const startedAt = Date.now();
  const user = await User.findById(userId).select('+password');
  if (!user) throw new ServiceError('Usuario no encontrado', 404);
  if (!user.isActive || !user.emailVerified) {
    throw new ServiceError('La cuenta no puede cambiar el correo ahora', 403);
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatches) {
    throw new ServiceError('La contraseña actual no es correcta', 401);
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === user.email) {
    throw new ServiceError('El correo nuevo debe ser distinto al actual', 400);
  }

  const existing = await User.findOne({ email: normalizedEmail }).select('_id').lean();
  if (existing) {
    await normalizeAccountLookupDuration(startedAt);
    return { verificationRequired: true };
  }

  try {
    await issueVerificationEmail(user, {
      email: normalizedEmail,
      purpose: 'email-change',
    });
  } catch (error) {
    console.error('No se pudo preparar la verificación del nuevo correo:', error.message);
  }

  await normalizeAccountLookupDuration(startedAt);
  return { verificationRequired: true };
}

async function updateAvatar(userId, file) {
  const user = await User.findById(userId).select('+avatarPublicId');
  if (!user) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  const previousPublicId = user.avatarPublicId;
  const avatar = await uploadService.uploadAvatar(file);

  user.avatarUrl = avatar.url;
  user.avatarPublicId = avatar.publicId;

  try {
    await user.save();
  } catch (err) {
    try {
      await uploadService.deleteImage(avatar.publicId);
    } catch (cleanupError) {
      try {
        await enqueueMediaDeletion([avatar.publicId]);
      } catch (queueError) {
        throw new AggregateError(
          [err, cleanupError, queueError],
          'No se pudo guardar el perfil ni programar la limpieza de la foto nueva'
        );
      }
      throw new AggregateError(
        [err, cleanupError],
        'No se pudo guardar el perfil ni limpiar la foto nueva'
      );
    }
    throw err;
  }

  if (previousPublicId) {
    try {
      await enqueueMediaDeletion([previousPublicId]);
    } catch (queueError) {
      try {
        await uploadService.deleteImage(previousPublicId);
      } catch (cleanupError) {
        throw new AggregateError(
          [queueError, cleanupError],
          'El perfil se actualizó, pero no se pudo programar ni completar la limpieza de la foto anterior'
        );
      }
    }
    await processPendingMediaDeletions();
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Cambia la contraseña del usuario autenticado, verificando primero la
 * contraseña actual — así una sesión robada no basta para tomar la cuenta
 * por completo cambiando la contraseña sin más.
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password +tokenVersion');
  if (!user) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    throw new ServiceError('La contraseña actual no es correcta', 401);
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const session = await User.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await User.findOneAndUpdate(
        { _id: userId, password: user.password },
        { $set: { password: newHash }, $inc: { tokenVersion: 1 } },
        { new: true, session }
      );
      if (!updated) {
        throw new ServiceError('La contraseña cambió mientras se procesaba la solicitud', 409);
      }
      await PasswordResetToken.deleteMany({ userId }, { session });
    });
  } finally {
    await session.endSession();
  }

  return { updated: true };
}


export default {
  register,
  resendVerification,
  verifyEmail,
  login,
  getProfile,
  updateProfile,
  requestEmailChange,
  updateAvatar,
  changePassword
};