import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import test, { after } from 'node:test';

import authController from '../src/controllers/auth.controller.js';
import authService from '../src/services/auth.service.js';
import { protect } from '../src/middlewares/auth.middleware.js';
import PasswordResetToken from '../src/models/passwordResetToken.model.js';
import Session from '../src/models/session.model.js';
import User from '../src/models/user.model.js';
import { resetPassword } from '../src/routes/authReset.route.js';
import { createSessionToken } from '../src/services/session.service.js';
import { SESSION_COOKIE_NAME } from '../src/utils/security.js';

const originalJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'session-revocation-test-secret-that-is-long-enough';
after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

function signTestToken({
  id = '507f1f77bcf86cd799439011',
  sessionId = 'test-session',
  tokenVersion = 0,
  expiresIn = '1h',
} = {}) {
  return jwt.sign(
    { id, role: 'user', tokenVersion },
    process.env.JWT_SECRET,
    { jwtid: sessionId, expiresIn }
  );
}

function createSessionStore(t) {
  const records = new Map();
  patchMethod(t, Session, 'create', async (record) => {
    records.set(record.sessionId, record);
    return record;
  });
  patchMethod(t, Session, 'exists', async (query) => {
    const record = records.get(query.sessionId);
    if (
      !record
      || record.userId.toString() !== query.userId
      || record.tokenVersion !== query.tokenVersion
      || record.expiresAt <= query.expiresAt.$gt
    ) {
      return null;
    }
    return { _id: record.sessionId };
  });
  patchMethod(t, Session, 'deleteOne', async (query) => {
    const record = records.get(query.sessionId);
    if (
      record
      && record.userId.toString() === query.userId
      && record.tokenVersion === query.tokenVersion
    ) {
      records.delete(query.sessionId);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  });
  return records;
}

function mockUserLookup(t, getUser) {
  patchMethod(t, User, 'findById', () => ({
    select: async () => getUser(),
  }));
}

async function callProtect(token) {
  const req = { cookies: { [SESSION_COOKIE_NAME]: token } };
  const response = { statusCode: undefined, body: undefined };
  const res = {
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
  };
  let continued = false;
  let error;

  await protect(req, res, (nextError) => {
    if (nextError) error = nextError;
    else continued = true;
  });

  return { ...response, continued, error, user: req.user };
}

async function callLogout(token) {
  const response = { clearedCookies: [], statusCode: undefined, ended: false };
  const res = {
    clearCookie(name) {
      response.clearedCookies.push(name);
      return this;
    },
    status(code) {
      response.statusCode = code;
      return this;
    },
    end() {
      response.ended = true;
      return this;
    },
  };
  let error;

  await authController.logout(
    { cookies: { [SESSION_COOKIE_NAME]: token } },
    res,
    (nextError) => {
      error = nextError;
    }
  );

  return { ...response, error };
}

test('login creates a persisted session token with a unique ID and matching expiry', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    tokenVersion: 4,
    name: 'Test User',
    email: 'user@example.com',
    emailVerified: true,
    isActive: true,
    password: await bcrypt.hash('ValidPassword123', 4),
  };
  patchMethod(t, User, 'findOne', () => ({
    select: async () => user,
  }));

  const result = await authService.login({
    email: user.email,
    password: 'ValidPassword123',
  });
  const token = result.token;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const session = sessions.get(decoded.jti);

  assert.ok(decoded.jti);
  assert.equal(decoded.tokenVersion, 4);
  assert.equal(session.userId, user._id);
  assert.equal(session.tokenVersion, 4);
  assert.equal(session.expiresAt.getTime(), decoded.exp * 1000);

  const ttlIndex = Session.schema.indexes().find(
    ([keys]) => keys.expiresAt === 1
  );
  assert.equal(ttlIndex?.[1].expireAfterSeconds, 0);
});

test('a valid persisted session can access a protected route', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
  };
  mockUserLookup(t, () => user);

  const token = await createSessionToken(user);
  const result = await callProtect(token);

  assert.equal(result.continued, true);
  assert.equal(result.user.id, user._id);
  assert.equal(sessions.size, 1);
});

test('logout revokes only its JWT session while preserving another device session', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
  };
  mockUserLookup(t, () => user);

  const firstToken = await createSessionToken(user);
  const secondToken = await createSessionToken(user);
  assert.equal((await callProtect(firstToken)).continued, true);
  assert.equal((await callProtect(secondToken)).continued, true);

  const logout = await callLogout(firstToken);
  assert.equal(logout.statusCode, 204);
  assert.equal(logout.ended, true);
  assert.deepEqual(logout.clearedCookies.sort(), ['brigada_csrf', SESSION_COOKIE_NAME].sort());
  assert.equal((await callProtect(firstToken)).statusCode, 401);
  assert.equal((await callProtect(secondToken)).continued, true);
  assert.equal(sessions.size, 1);

  const repeatedLogout = await callLogout(firstToken);
  assert.equal(repeatedLogout.statusCode, 204);
  assert.equal(repeatedLogout.error, undefined);
});

test('global token-version changes still invalidate sessions after password changes', async (t) => {
  createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
    password: await bcrypt.hash('CurrentPassword123', 4),
  };
  mockUserLookup(t, () => user);

  patchMethod(t, User, 'findById', () => ({
    select: async () => user,
  }));
  patchMethod(t, User, 'startSession', async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  }));
  patchMethod(t, User, 'findOneAndUpdate', async (_filter, update) => {
    assert.equal(update.$inc.tokenVersion, 1);
    user.tokenVersion += update.$inc.tokenVersion;
    return user;
  });
  patchMethod(t, PasswordResetToken, 'deleteMany', async () => ({ deletedCount: 0 }));

  const oldToken = await createSessionToken(user);
  const result = await authService.changePassword(user._id, {
    currentPassword: 'CurrentPassword123',
    newPassword: 'NewPassword123',
  });

  assert.deepEqual(result, { updated: true });
  assert.equal(user.tokenVersion, 1);
  assert.equal((await callProtect(oldToken)).statusCode, 401);
});

test('password reset increments tokenVersion and rejects sessions issued before reset', async (t) => {
  createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
    email: 'user@example.com',
  };
  mockUserLookup(t, () => user);

  const rawResetToken = 'single-use-reset-token';
  const oldToken = await createSessionToken(user);
  const resetRecord = {
    _id: 'reset-record',
    tokenHash: await bcrypt.hash(rawResetToken, 4),
  };
  patchMethod(t, PasswordResetToken, 'findOne', async () => resetRecord);
  patchMethod(t, PasswordResetToken, 'findOneAndUpdate', async () => resetRecord);
  patchMethod(t, PasswordResetToken, 'deleteMany', async () => ({ deletedCount: 1 }));
  patchMethod(t, User, 'startSession', async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  }));
  patchMethod(t, User, 'findByIdAndUpdate', async (_id, update) => {
    assert.equal(update.$inc.tokenVersion, 1);
    user.tokenVersion += update.$inc.tokenVersion;
    return user;
  });

  const originalConsoleError = console.error;
  console.error = () => {};
  t.after(() => {
    console.error = originalConsoleError;
  });

  const response = {
    clearCookieCalled: false,
    body: undefined,
  };
  const res = {
    clearCookie() {
      response.clearCookieCalled = true;
    },
    json(body) {
      response.body = body;
      return this;
    },
  };
  let error;

  await resetPassword(
    {
      validated: {
        body: {
          uid: user._id,
          token: rawResetToken,
          newPassword: 'ResetPassword123',
        },
      },
    },
    res,
    (nextError) => {
      error = nextError;
    }
  );

  assert.equal(error, undefined);
  assert.equal(user.tokenVersion, 1);
  assert.equal(response.clearCookieCalled, true);
  assert.equal(response.body.message, 'Contraseña actualizada correctamente');
  assert.equal((await callProtect(oldToken)).statusCode, 401);
});

test('revoked, expired, invalid, and sessionless JWTs are rejected', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
  };
  mockUserLookup(t, () => user);

  const revokedToken = await createSessionToken(user);
  const revokedId = jwt.decode(revokedToken).jti;
  sessions.delete(revokedId);
  assert.equal((await callProtect(revokedToken)).statusCode, 401);

  const expiredToken = signTestToken({
    sessionId: 'expired-session',
    expiresIn: -1,
  });
  assert.equal((await callProtect(expiredToken)).statusCode, 401);
  const expiredLogout = await callLogout(expiredToken);
  assert.equal(expiredLogout.statusCode, 204);

  assert.equal((await callProtect('not-a-jwt')).statusCode, 401);
  assert.equal((await callProtect(signTestToken({ sessionId: 'missing-session' }))).statusCode, 401);
});

test('logout clears cookies but does not claim success if MongoDB revocation fails', async (t) => {
  const databaseError = new Error('database unavailable');
  patchMethod(t, Session, 'deleteOne', async () => {
    throw databaseError;
  });
  const token = signTestToken({ sessionId: 'database-error-session' });

  const result = await callLogout(token);

  assert.equal(result.error, databaseError);
  assert.deepEqual(result.clearedCookies.sort(), ['brigada_csrf', SESSION_COOKIE_NAME].sort());
  assert.equal(result.statusCode, undefined);
  assert.equal(result.ended, false);
});

test('database lookup errors are forwarded instead of treating a session as authenticated', async (t) => {
  const databaseError = new Error('database unavailable');
  patchMethod(t, Session, 'exists', async () => {
    throw databaseError;
  });
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
  };
  mockUserLookup(t, () => user);

  const result = await callProtect(signTestToken());

  assert.equal(result.continued, false);
  assert.equal(result.error, databaseError);
});

test('invalid signed-out tokens do not cause a session database deletion', async (t) => {
  let deletionCount = 0;
  patchMethod(t, Session, 'deleteOne', async () => {
    deletionCount += 1;
    return { deletedCount: 0 };
  });

  const result = await callLogout('invalid-token');

  assert.equal(result.statusCode, 204);
  assert.equal(deletionCount, 0);
});
