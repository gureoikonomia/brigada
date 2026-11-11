import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import test from 'node:test';

import AccountDeletionToken from '../src/models/accountDeletionToken.model.js';
import AppSettings from '../src/models/app-settings.model.js';
import EmailVerificationToken from '../src/models/emailVerificationToken.model.js';
import Incident from '../src/models/incident.model.js';
import IncidentReport from '../src/models/incidentReport.model.js';
import PasswordResetToken from '../src/models/passwordResetToken.model.js';
import PendingMediaDeletion from '../src/models/pendingMediaDeletion.model.js';
import Session from '../src/models/session.model.js';
import User from '../src/models/user.model.js';
import Vote from '../src/models/vote.model.js';
import { userService } from '../src/services/user.service.js';
import bcrypt from 'bcrypt';

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

test('account deletion unlinks retained incidents, removes media and votes, and de-identifies reports', async (t) => {
  const userId = '507f1f77bcf86cd799439011';
  const incidentId = '507f1f77bcf86cd799439012';
  const session = {
    async withTransaction(callback) {
      await callback();
    },
    async endSession() {},
  };
  const user = {
    _id: userId,
    role: 'user',
    isActive: true,
    avatarPublicId: null,
    password: 'hashed-password',
  };
  const userQuery = Promise.resolve(user);
  userQuery.select = () => userQuery;
  userQuery.session = () => userQuery;
  const incidentUpdates = [];
  const reportUpdates = [];
  const voteDeletes = [];
  const queuedMedia = [];
  const sessionDeletes = [];

  patchMethod(t, mongoose, 'startSession', async () => session);
  patchMethod(t, bcrypt, 'compare', async () => true);
  patchMethod(t, AppSettings, 'updateOne', async () => ({ matchedCount: 1 }));
  patchMethod(t, User, 'findById', () => userQuery);
  patchMethod(t, User, 'updateOne', async () => ({ matchedCount: 1 }));
  patchMethod(t, User, 'updateMany', async () => ({ matchedCount: 1 }));
  patchMethod(t, User, 'deleteOne', async () => ({ deletedCount: 1 }));
  patchMethod(t, Incident, 'find', () => ({
    select() { return this; },
    session() { return this; },
    lean: async () => [{ _id: incidentId, images: [{ publicId: 'incident-photo' }] }],
  }));
  patchMethod(t, Incident, 'updateOne', async () => ({ matchedCount: 1 }));
  patchMethod(t, Incident, 'updateMany', async (filter, update) => {
    incidentUpdates.push({ filter, update });
    return { matchedCount: 1 };
  });
  patchMethod(t, Incident, 'deleteMany', async () => {
    assert.fail('Retained incidents must not be deleted with the account');
  });
  patchMethod(t, Vote, 'aggregate', () => ({
    session: async () => [{ _id: incidentId, count: 1 }],
  }));
  patchMethod(t, Vote, 'deleteMany', async (filter) => {
    voteDeletes.push(filter);
    return { deletedCount: 1 };
  });
  patchMethod(t, IncidentReport, 'updateMany', async (filter, update) => {
    reportUpdates.push({ filter, update });
    return { matchedCount: 1 };
  });
  patchMethod(t, IncidentReport, 'deleteMany', async () => {
    assert.fail('Reports must be retained without the deleted account reference');
  });
  patchMethod(t, PasswordResetToken, 'deleteMany', async () => ({ deletedCount: 1 }));
  patchMethod(t, EmailVerificationToken, 'deleteMany', async () => ({ deletedCount: 1 }));
  patchMethod(t, AccountDeletionToken, 'deleteMany', async () => ({ deletedCount: 1 }));
  patchMethod(t, Session, 'deleteMany', async (filter) => {
    sessionDeletes.push(filter);
    return { deletedCount: 1 };
  });
  patchMethod(t, PendingMediaDeletion, 'create', async (jobs) => {
    queuedMedia.push(...jobs);
  });
  patchMethod(t, PendingMediaDeletion, 'findOneAndUpdate', () => ({
    lean: async () => null,
  }));
  patchMethod(t, PendingMediaDeletion, 'exists', async () => false);

  const result = await userService.deleteAccount(userId, 'current-password');

  assert.deepEqual(result, { deleted: true, mediaCleanupPending: false });
  assert.deepEqual(incidentUpdates, [{
    filter: { _id: { $in: [incidentId] }, createdBy: userId },
    update: { $set: { createdBy: null, images: [] } },
  }]);
  assert.deepEqual(voteDeletes, [{ user: userId }]);
  assert.deepEqual(reportUpdates, [
    { filter: { reporter: userId }, update: { $set: { reporter: null } } },
    { filter: { reviewedBy: userId }, update: { $set: { reviewedBy: null } } },
  ]);
  assert.deepEqual(sessionDeletes, [{ userId }]);
  assert.deepEqual(queuedMedia, [{ publicIds: ['incident-photo'] }]);
});
