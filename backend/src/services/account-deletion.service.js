import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import AccountDeletionToken from '../models/accountDeletionToken.model.js';
import User from '../models/user.model.js';
import { sendAccountDeletionEmail } from '../utils/email.js';
import { userService } from './user.service.js';

const REQUEST_MESSAGE =
  'Si la dirección corresponde a una cuenta, recibirás un correo con los siguientes pasos.';
const MIN_REQUEST_DURATION_MS = 500;

async function normalizeRequestDuration(startedAt) {
  const remainingMs = MIN_REQUEST_DURATION_MS - (Date.now() - startedAt);
  if (remainingMs > 0) await delay(remainingMs);
}

export function createAccountDeletionLink(frontendUrl, token, userId) {
  const deletionUrl = new URL('/eliminar-cuenta', frontendUrl);
  deletionUrl.searchParams.set('token', token);
  deletionUrl.searchParams.set('uid', userId.toString());
  return deletionUrl.toString();
}

async function requestAccountDeletion(email) {
  const startedAt = Date.now();
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('_id email');
  if (!user) {
    await normalizeRequestDuration(startedAt);
    return { message: REQUEST_MESSAGE };
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const tokenUpdate = {
    $set: {
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  };
  let token;
  try {
    token = await AccountDeletionToken.findOneAndUpdate(
      { userId: user._id },
      tokenUpdate,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    token = await AccountDeletionToken.findOneAndUpdate(
      { userId: user._id },
      { $set: tokenUpdate.$set },
      { returnDocument: 'after' },
    );
  }
  if (!token) throw new Error('Could not persist an account deletion token');
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  const link = createAccountDeletionLink(frontendUrl, rawToken, user._id);

  void sendAccountDeletionEmail(user.email, link).catch(async (error) => {
    try {
      await AccountDeletionToken.deleteOne({ _id: token._id });
    } catch (cleanupError) {
      console.error('Could not remove an unsent account deletion token', {
        name: cleanupError?.name,
        code: cleanupError?.code,
      });
    }
    console.error('Account deletion email dispatch failed', {
      name: error?.name,
      code: error?.code,
      responseCode: error?.responseCode,
    });
  });

  await normalizeRequestDuration(startedAt);
  return { message: REQUEST_MESSAGE };
}

async function confirmAccountDeletion({ uid, token }) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return userService.deleteAccountAfterEmailVerification(uid, tokenHash);
}

export const accountDeletionService = {
  requestAccountDeletion,
  confirmAccountDeletion,
};
