import assert from 'node:assert/strict';
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

test('registration creates an immediately usable account without sending verification email', async (t) => {
  let createdUser;
  let verificationTokenPersistenceCalled = false;
  patchMethod(t, User, 'findOne', () => ({
    select: () => ({
      lean: async () => null,
    }),
  }));
  patchMethod(t, User, 'create', async (user) => {
    createdUser = user;
    return { ...user, _id: 'created-test-user' };
  });
  patchMethod(t, EmailVerificationToken, 'deleteMany', async () => {
    verificationTokenPersistenceCalled = true;
    throw new Error('Registration must not create verification tokens');
  });
  patchMethod(t, EmailVerificationToken, 'create', async () => {
    verificationTokenPersistenceCalled = true;
    throw new Error('Registration must not create verification tokens');
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
  });

  assert.deepEqual(result, { registrationComplete: true });
  assert.equal(createdUser.name, 'Test User');
  assert.equal(createdUser.email, 'test.user@example.invalid');
  assert.equal('password' in createdUser, true);
  assert.equal(createdUser.emailVerified, true);
  assert.equal('privacyNoticeAcknowledgedAt' in createdUser, false);
  assert.equal('privacyNoticeVersion' in createdUser, false);
  assert.equal(verificationTokenPersistenceCalled, false);
});
