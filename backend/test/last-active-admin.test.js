import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import test from 'node:test';

import AppSettings from '../src/models/app-settings.model.js';
import User from '../src/models/user.model.js';
import { ServiceError } from '../src/errors/service.error.js';
import { userService } from '../src/services/user.service.js';

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

async function prepareLastAdmin(t) {
  const session = {
    async withTransaction(callback) {
      await callback();
    },
    async endSession() {},
  };
  const events = [];
  const admin = {
    _id: 'last-admin',
    role: 'admin',
    isActive: true,
    password: await bcrypt.hash('ValidPassword123', 4),
  };
  const userQuery = Promise.resolve(admin);
  userQuery.select = () => userQuery;
  userQuery.session = () => userQuery;

  patchMethod(t, mongoose, 'startSession', async () => session);
  patchMethod(t, AppSettings, 'updateOne', async (_filter, _update, options) => {
    if (options?.session) events.push('lock');
    return { matchedCount: 1 };
  });
  patchMethod(t, User, 'findById', () => userQuery);
  patchMethod(t, User, 'countDocuments', () => ({
    session(activeSession) {
      assert.equal(activeSession, session);
      events.push('count');
      return Promise.resolve(1);
    },
  }));
  patchMethod(t, bcrypt, 'compare', async () => true);

  return { events };
}

test('cannot demote the last active administrator', async (t) => {
  const { events } = await prepareLastAdmin(t);

  await assert.rejects(
    userService.updateUserRole('another-admin', 'last-admin', 'moderator'),
    (error) => error instanceof ServiceError && error.statusCode === 409,
  );
  assert.deepEqual(events, ['lock', 'count']);
});

test('cannot deactivate the last active administrator', async (t) => {
  const { events } = await prepareLastAdmin(t);

  await assert.rejects(
    userService.updateUserStatus('another-admin', 'last-admin', false),
    (error) => error instanceof ServiceError && error.statusCode === 409,
  );
  assert.deepEqual(events, ['lock', 'count']);
});

test('cannot delete the last active administrator account', async (t) => {
  const { events } = await prepareLastAdmin(t);

  await assert.rejects(
    userService.deleteAccount('last-admin', 'ValidPassword123'),
    (error) => error instanceof ServiceError && error.statusCode === 409,
  );
  assert.deepEqual(events, ['lock', 'count']);
});
