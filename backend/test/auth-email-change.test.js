import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import test from 'node:test';

import User from '../src/models/user.model.js';
import EmailVerificationToken from '../src/models/emailVerificationToken.model.js';
import PasswordResetToken from '../src/models/passwordResetToken.model.js';
import authService from '../src/services/auth.service.js';

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

test('email change request stores a pending address without changing the user email', async (t) => {
  const user = {
    _id: 'user-id',
    email: 'current@example.com',
    password: await bcrypt.hash('CurrentPass123', 4),
    isActive: true,
    emailVerified: true,
  };
  let createdToken;
  let emailUpdateCalled = false;
  const previousConsoleError = console.error;
  console.error = () => {};
  t.after(() => {
    console.error = previousConsoleError;
  });

  patchMethod(t, User, 'findById', () => ({
    select: async () => user,
  }));
  patchMethod(t, User, 'findOne', () => ({
    select: () => ({
      lean: async () => null,
    }),
  }));
  patchMethod(t, User, 'findByIdAndUpdate', () => {
    emailUpdateCalled = true;
    throw new Error('Email must not change before confirmation');
  });
  patchMethod(t, EmailVerificationToken, 'deleteMany', async () => ({ deletedCount: 0 }));
  patchMethod(t, EmailVerificationToken, 'create', async (record) => {
    createdToken = record;
    return record;
  });

  const result = await authService.requestEmailChange('user-id', {
    email: '  NEW@example.com ',
    currentPassword: 'CurrentPass123',
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(result, { verificationRequired: true });
  assert.equal(user.email, 'current@example.com');
  assert.equal(emailUpdateCalled, false);
  assert.equal(createdToken.purpose, 'email-change');
  assert.equal(createdToken.email, 'new@example.com');
  assert.match(createdToken.tokenHash, /^[a-f0-9]{64}$/);
});

test('confirming an email-change token updates email and invalidates prior sessions atomically', async (t) => {
  let tokenAvailable = true;
  let capturedUpdate;
  let transactionCount = 0;
  let sessionEnded = false;

  patchMethod(t, User, 'startSession', async () => ({
    withTransaction: async (callback) => {
      transactionCount += 1;
      return callback();
    },
    endSession: async () => {
      sessionEnded = true;
    },
  }));
  patchMethod(t, EmailVerificationToken, 'findOneAndDelete', async () => {
    if (!tokenAvailable) return null;
    tokenAvailable = false;
    return {
      purpose: 'email-change',
      email: 'new@example.com',
    };
  });
  patchMethod(t, User, 'findByIdAndUpdate', async (_id, update, options) => {
    capturedUpdate = { update, options };
    return { _id: 'user-id', email: 'new@example.com' };
  });
  patchMethod(t, EmailVerificationToken, 'deleteMany', async () => ({ deletedCount: 0 }));
  patchMethod(t, PasswordResetToken, 'deleteMany', async () => ({ deletedCount: 0 }));

  const result = await authService.verifyEmail({
    uid: 'user-id',
    token: 'a'.repeat(64),
  });

  assert.deepEqual(result, { verified: true, emailChanged: true });
  assert.deepEqual(capturedUpdate.update, {
    $set: { email: 'new@example.com', emailVerified: true },
    $inc: { tokenVersion: 1 },
  });
  assert.equal(capturedUpdate.options.new, true);
  assert.equal(capturedUpdate.options.runValidators, true);
  assert.ok(capturedUpdate.options.session);
  assert.equal(transactionCount, 1);
  assert.equal(sessionEnded, true);
  await assert.rejects(
    authService.verifyEmail({ uid: 'user-id', token: 'a'.repeat(64) }),
    { statusCode: 400 }
  );
  assert.equal(transactionCount, 2);
});
