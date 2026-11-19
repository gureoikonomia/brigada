import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import test, { after } from 'node:test';

import { logout, refresh } from '../src/controllers/auth.controller.js';
import { authService } from '../src/services/auth.service.js';
import { attachUserIfPresent, protect } from '../src/middlewares/auth.middleware.js';
import PasswordResetToken from '../src/models/passwordResetToken.model.js';
import Session from '../src/models/session.model.js';
import User from '../src/models/user.model.js';
import { authResetController } from '../src/controllers/auth-reset.controller.js';
import { createPasswordResetLink } from '../src/services/password-reset.service.js';
import { createSession, revokeSessionToken } from '../src/services/session.service.js';
import {
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../src/utils/security.js';

const originalJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'session-revocation-test-secret-that-is-long-enough';
after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

test('password reset link uses the frontend route without duplicate slashes', () => {
  const link = createPasswordResetLink(
    'https://appbrigada.netlify.app/',
    'dummy-reset-token',
    '507f1f77bcf86cd799439011',
  );
  const url = new URL(link);

  assert.equal(url.origin, 'https://appbrigada.netlify.app');
  assert.equal(url.pathname, '/recuperar-contrasena');
  assert.equal(url.searchParams.get('token'), 'dummy-reset-token');
  assert.equal(url.searchParams.get('uid'), '507f1f77bcf86cd799439011');
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
  algorithm = 'HS256',
} = {}) {
  return jwt.sign({ id, role: 'user', tokenVersion }, process.env.JWT_SECRET, {
    algorithm,
    jwtid: sessionId,
    expiresIn,
  });
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
      !record ||
      record.userId.toString() !== query.userId ||
      record.tokenVersion !== query.tokenVersion ||
      record.refreshExpiresAt <= query.refreshExpiresAt.$gt ||
      record.absoluteExpiresAt <= query.absoluteExpiresAt.$gt
    ) {
      return null;
    }
    return { _id: record.sessionId };
  });
  patchMethod(t, Session, 'deleteOne', async (query) => {
    const record = query.sessionId
      ? records.get(query.sessionId)
      : [...records.values()].find((candidate) =>
          query.$or.some(
            (condition) =>
              candidate.refreshTokenHash === condition.refreshTokenHash ||
              candidate.previousRefreshTokenHash === condition.previousRefreshTokenHash,
          ),
        );
    if (
      record &&
      (!query.userId || record.userId.toString() === query.userId) &&
      (query.tokenVersion === undefined || record.tokenVersion === query.tokenVersion)
    ) {
      records.delete(record.sessionId);
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

async function callLogout(token, refreshToken) {
  const response = { clearedCookies: [], statusCode: undefined, ended: false };
  const res = {
    clearCookie(name, options) {
      response.clearedCookies.push({ name, options });
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

  await logout(
    {
      cookies: {
        [SESSION_COOKIE_NAME]: token,
        [REFRESH_COOKIE_NAME]: refreshToken,
      },
    },
    res,
    (nextError) => {
      error = nextError;
    },
  );

  return { ...response, error };
}

async function callRefresh(refreshToken) {
  const response = { clearedCookies: [], statusCode: undefined, body: undefined };
  const res = {
    set() {
      return this;
    },
    cookie() {
      return this;
    },
    clearCookie(name, options) {
      response.clearedCookies.push({ name, options });
      return this;
    },
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
  };
  let error;

  await refresh(
    {
      cookies: { [REFRESH_COOKIE_NAME]: refreshToken },
      get: () => undefined,
    },
    res,
    (nextError) => {
      error = nextError;
    },
  );

  return { ...response, error };
}

test('unverified accounts can log in and receive a session', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    tokenVersion: 4,
    name: 'Test User',
    email: 'user@example.com',
    emailVerified: false,
    isActive: true,
    password: await bcrypt.hash('ValidPassword123', 4),
  };
  patchMethod(t, User, 'findOne', () => ({
    select: async () => user,
  }));
  patchMethod(t, User, 'updateOne', async () => ({ matchedCount: 1 }));

  const result = await authService.login({ email: user.email, password: 'ValidPassword123' });

  assert.equal(result.user.email, user.email);
  assert.ok(result.accessToken);
  assert.equal(sessions.size, 1);
});

test('verified login creates a persisted session token', async (t) => {
  const sessions = createSessionStore(t);
  const passwordHash = await bcrypt.hash('ValidPassword123', 4);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    tokenVersion: 4,
    name: 'Test User',
    email: 'user@example.com',
    emailVerified: true,
    isActive: true,
    password: passwordHash,
  };
  patchMethod(t, User, 'findOne', () => ({
    select: async () => user,
  }));
  patchMethod(t, User, 'updateOne', async (filter, update) => {
    assert.equal(filter.password, passwordHash);
    user.password = update.$set.password;
    return { matchedCount: 1 };
  });

  const result = await authService.login({
    email: user.email,
    password: 'ValidPassword123',
  });
  const token = result.accessToken;
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  const session = sessions.get(decoded.jti);

  assert.equal(jwt.decode(token, { complete: true }).header.alg, 'HS256');
  assert.ok(decoded.jti);
  assert.equal(decoded.tokenVersion, 4);
  assert.equal(bcrypt.getRounds(user.password), 12);
  assert.equal(session.userId, user._id);
  assert.equal(session.tokenVersion, 4);
  assert.equal(
    session.refreshTokenHash,
    createHash('sha256').update(result.refreshToken).digest('hex'),
  );
  assert.notEqual(session.refreshTokenHash, result.refreshToken);
  assert.equal(session.previousRefreshTokenHash, null);
  assert.ok(session.refreshExpiresAt instanceof Date);
  assert.ok(session.absoluteExpiresAt instanceof Date);
  assert.ok(session.lastUsedAt instanceof Date);
  assert.equal(session.userAgent, null);

  const ttlIndex = Session.schema.indexes().find(([keys]) => keys.refreshExpiresAt === 1);
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

  const session = await createSession(user);
  const result = await callProtect(session.accessToken);

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

  const firstSession = await createSession(user);
  const secondSession = await createSession(user);
  assert.equal((await callProtect(firstSession.accessToken)).continued, true);
  assert.equal((await callProtect(secondSession.accessToken)).continued, true);

  const logout = await callLogout(firstSession.accessToken, firstSession.refreshToken);
  assert.equal(logout.statusCode, 204);
  assert.equal(logout.ended, true);
  assert.deepEqual(
    logout.clearedCookies.map(({ name }) => name).sort(),
    [CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME].sort(),
  );
  assert.equal(
    logout.clearedCookies.find(({ name }) => name === REFRESH_COOKIE_NAME).options.path,
    '/api/auth',
  );
  assert.equal(
    logout.clearedCookies.find(({ name }) => name === SESSION_COOKIE_NAME).options.path,
    '/api',
  );
  assert.equal((await callProtect(firstSession.accessToken)).statusCode, 401);
  assert.equal((await callProtect(secondSession.accessToken)).continued, true);
  assert.equal(sessions.size, 1);

  const repeatedLogout = await callLogout(firstSession.accessToken, firstSession.refreshToken);
  assert.equal(repeatedLogout.statusCode, 204);
  assert.equal(repeatedLogout.error, undefined);
});

test('logout revokes a session using its refresh token when the access token has expired', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
  };
  const session = await createSession(user);
  const sessionId = jwt.decode(session.accessToken).jti;
  const expiredAccessToken = signTestToken({
    id: user._id,
    sessionId,
    tokenVersion: user.tokenVersion,
    expiresIn: -1,
  });

  const result = await callLogout(expiredAccessToken, session.refreshToken);

  assert.equal(result.statusCode, 204);
  assert.equal(result.error, undefined);
  assert.equal(sessions.has(sessionId), false);
});

test('logout falls back to the refresh token when the access token is invalid', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
  };
  const session = await createSession(user);
  const sessionId = jwt.decode(session.accessToken).jti;

  const result = await callLogout('invalid-access-token', session.refreshToken);

  assert.equal(result.statusCode, 204);
  assert.equal(result.error, undefined);
  assert.equal(sessions.has(sessionId), false);
});

test('logout without cookies completes successfully', async () => {
  const result = await callLogout();

  assert.equal(result.statusCode, 204);
  assert.equal(result.ended, true);
  assert.equal(result.error, undefined);
});

test('refresh rejects the old token after logout revokes its session', async (t) => {
  const sessions = createSessionStore(t);
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
  };
  const session = await createSession(user);
  patchMethod(t, Session, 'findOne', async (query) => {
    if (query.refreshTokenHash) {
      return (
        [...sessions.values()].find(
          (record) => record.refreshTokenHash === query.refreshTokenHash,
        ) || null
      );
    }
    return (
      [...sessions.values()].find(
        (record) => record.previousRefreshTokenHash === query.previousRefreshTokenHash,
      ) || null
    );
  });

  const logoutResult = await callLogout(session.accessToken, session.refreshToken);
  const refreshResult = await callRefresh(session.refreshToken);

  assert.equal(logoutResult.statusCode, 204);
  assert.equal(refreshResult.statusCode, 401);
  assert.equal(refreshResult.body.code, 'SESSION_INVALID');
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
    newPasswordHash = update.$set.password;
    user.tokenVersion += update.$inc.tokenVersion;
    return user;
  });
  patchMethod(t, PasswordResetToken, 'deleteMany', async () => ({ deletedCount: 0 }));

  const oldToken = (await createSession(user)).accessToken;
  let newPasswordHash;
  const result = await authService.changePassword(user._id, {
    currentPassword: 'CurrentPassword123',
    newPassword: 'NewPassword123',
  });

  assert.deepEqual(result, { updated: true });
  assert.equal(bcrypt.getRounds(newPasswordHash), 12);
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
  const oldToken = (await createSession(user)).accessToken;
  const resetRecord = {
    _id: 'reset-record',
    tokenHash: await bcrypt.hash(rawResetToken, 4),
  };
  let resetPasswordHash;
  patchMethod(t, PasswordResetToken, 'findOne', async () => resetRecord);
  patchMethod(t, PasswordResetToken, 'findOneAndUpdate', async () => resetRecord);
  patchMethod(t, PasswordResetToken, 'deleteMany', async () => ({ deletedCount: 1 }));
  patchMethod(t, User, 'startSession', async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  }));
  patchMethod(t, User, 'findByIdAndUpdate', async (_id, update) => {
    assert.equal(update.$inc.tokenVersion, 1);
    resetPasswordHash = update.$set.password;
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

  await authResetController.resetPassword(
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
    },
  );

  assert.equal(error, undefined);
  assert.equal(user.tokenVersion, 1);
  assert.equal(bcrypt.getRounds(resetPasswordHash), 12);
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

  const revokedToken = (await createSession(user)).accessToken;
  const revokedId = jwt.decode(revokedToken).jti;
  sessions.delete(revokedId);
  const revokedResult = await callProtect(revokedToken);
  assert.equal(revokedResult.statusCode, 401);
  assert.equal(revokedResult.body.code, 'SESSION_INVALID');

  const expiredToken = signTestToken({
    sessionId: 'expired-session',
    expiresIn: -1,
  });
  const expiredResult = await callProtect(expiredToken);
  assert.equal(expiredResult.statusCode, 401);
  assert.equal(expiredResult.body.code, 'SESSION_EXPIRED');
  const expiredLogout = await callLogout(expiredToken);
  assert.equal(expiredLogout.statusCode, 204);

  const invalidResult = await callProtect('not-a-jwt');
  assert.equal(invalidResult.statusCode, 401);
  assert.equal(invalidResult.body.code, 'SESSION_INVALID');
  const missingSessionResult = await callProtect(signTestToken({ sessionId: 'missing-session' }));
  assert.equal(missingSessionResult.statusCode, 401);
  assert.equal(missingSessionResult.body.code, 'SESSION_INVALID');
  const noTokenResult = await callProtect();
  assert.equal(noTokenResult.statusCode, 401);
  assert.equal(noTokenResult.body.code, 'SESSION_INVALID');
});

test('JWT verification only accepts HS256 for protected, optional, and logout sessions', async (t) => {
  let userLookups = 0;
  patchMethod(t, User, 'findById', () => {
    userLookups += 1;
    throw new Error('Rejected JWT must not trigger a user lookup');
  });

  const token = signTestToken({ sessionId: 'wrong-algorithm-session', algorithm: 'HS384' });
  const protectedResult = await callProtect(token);
  assert.equal(protectedResult.statusCode, 401);
  assert.equal(protectedResult.body.code, 'SESSION_INVALID');

  let continued = false;
  let forwardedError;
  await attachUserIfPresent({ cookies: { [SESSION_COOKIE_NAME]: token } }, {}, (error) => {
    forwardedError = error;
    continued = true;
  });
  assert.equal(continued, true);
  assert.equal(forwardedError, undefined);
  assert.equal(userLookups, 0);

  assert.equal(await revokeSessionToken(token), false);
  assert.equal(userLookups, 0);
});

test('logout clears cookies but does not claim success if MongoDB revocation fails', async (t) => {
  const databaseError = new Error('database unavailable');
  patchMethod(t, Session, 'deleteOne', async () => {
    throw databaseError;
  });
  const token = signTestToken({ sessionId: 'database-error-session' });

  const result = await callLogout(token);

  assert.equal(result.error, databaseError);
  assert.deepEqual(
    result.clearedCookies.map(({ name }) => name).sort(),
    [CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME].sort(),
  );
  assert.equal(
    result.clearedCookies.find(({ name }) => name === REFRESH_COOKIE_NAME).options.path,
    '/api/auth',
  );
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
