import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import test from 'node:test';

import User from '../src/models/user.model.js';
import { authService } from '../src/services/auth.service.js';
import { userService } from '../src/services/user.service.js';

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

function assertInvalidCurrentPassword(promise) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, 'INVALID_CURRENT_PASSWORD');
    return true;
  });
}

test('wrong current password on email change is a form error, not a session 401', async (t) => {
  const user = {
    _id: 'user-id',
    email: 'current@example.com',
    password: await bcrypt.hash('CurrentPassword123', 4),
    isActive: true,
    emailVerified: true,
  };
  patchMethod(t, User, 'findById', () => ({
    select: async () => user,
  }));

  await assertInvalidCurrentPassword(
    authService.requestEmailChange('user-id', {
      email: 'new@example.com',
      currentPassword: 'WrongPassword123',
    }),
  );
});

test('wrong current password on password change is a form error, not a session 401', async (t) => {
  const user = {
    _id: 'user-id',
    password: await bcrypt.hash('CurrentPassword123', 4),
  };
  patchMethod(t, User, 'findById', () => ({
    select: async () => user,
  }));

  await assertInvalidCurrentPassword(
    authService.changePassword('user-id', {
      currentPassword: 'WrongPassword123',
      newPassword: 'NewPassword123',
    }),
  );
});

test('wrong current password on account deletion is a form error, not a session 401', async (t) => {
  const user = {
    _id: 'user-id',
    password: await bcrypt.hash('CurrentPassword123', 4),
  };
  patchMethod(t, User, 'findById', () => ({
    select: async () => user,
  }));

  await assertInvalidCurrentPassword(
    userService.deleteAccount('user-id', 'WrongPassword123'),
  );
});

test('invalid login credentials do not use the session 401 status', async (t) => {
  const user = {
    password: await bcrypt.hash('CorrectPassword123', 4),
    isActive: true,
    emailVerified: true,
  };
  patchMethod(t, User, 'findOne', () => ({
    select: async () => user,
  }));

  await assert.rejects(
    authService.login({ email: 'user@example.com', password: 'WrongPassword123' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      assert.equal(error.message, 'Credenciales incorrectas');
      return true;
    },
  );
});
