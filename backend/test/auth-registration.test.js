import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import test from 'node:test';

import User from '../src/models/user.model.js';
import EmailVerificationToken from '../src/models/emailVerificationToken.model.js';
import { authService } from '../src/services/auth.service.js';

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

test('registration creates an unverified account and stores a hashed verification token', async (t) => {
  let createdUser;
  let createdToken;
  patchMethod(t, User, 'findOne', () => ({
    select: () => ({
      lean: async () => null,
    }),
  }));
  patchMethod(t, User, 'create', async (user) => {
    createdUser = user;
    return { ...user, _id: 'created-test-user' };
  });
  patchMethod(t, EmailVerificationToken, 'deleteMany', async () => ({ deletedCount: 0 }));
  patchMethod(t, EmailVerificationToken, 'create', async (token) => {
    createdToken = token;
    return token;
  });

  const previousConsoleError = console.error;
  console.error = () => {};
  t.after(() => {
    console.error = previousConsoleError;
  });

  const result = await authService.register({
    name: 'Test User',
    email: 'Test.User@Example.Invalid',
    password: 'StrongPass123',
    ageConfirmed: true,
  });

  assert.deepEqual(result, { registrationComplete: true, verificationRequired: true });
  assert.equal(createdUser.name, 'Test User');
  assert.equal(createdUser.email, 'test.user@example.invalid');
  assert.equal('password' in createdUser, true);
  assert.equal(bcrypt.getRounds(createdUser.password), 12);
  assert.equal(createdUser.emailVerified, false);
  assert.ok(createdUser.adultAgeConfirmedAt instanceof Date);
  assert.equal('privacyNoticeAcknowledgedAt' in createdUser, false);
  assert.equal('privacyNoticeVersion' in createdUser, false);
  assert.equal(createdToken.userId, 'created-test-user');
  assert.equal(createdToken.purpose, 'signup');
  assert.equal(createdToken.email, 'test.user@example.invalid');
  assert.match(createdToken.tokenHash, /^[a-f0-9]{64}$/);
  assert.ok(createdToken.expiresAt instanceof Date);
  assert.ok(createdToken.expiresAt.getTime() > Date.now());
});

test('registration rejects users who do not confirm the minimum age', async () => {
  await assert.rejects(
    authService.register({
      name: 'Test User',
      email: 'test@example.invalid',
      password: 'StrongPass123',
      ageConfirmed: false,
    }),
    { statusCode: 400 },
  );
});
