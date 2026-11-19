import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import test, { after } from 'node:test';

import {
  login as loginEndpoint,
  refresh as refreshEndpoint,
} from '../src/controllers/auth.controller.js';
import Session from '../src/models/session.model.js';
import User from '../src/models/user.model.js';
import { authService } from '../src/services/auth.service.js';
import { createSession, refreshSessionToken } from '../src/services/session.service.js';
import { REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME } from '../src/utils/security.js';

const originalJwtSecret = process.env.JWT_SECRET;
const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;
const originalRefreshTtl = process.env.REFRESH_TTL;
process.env.JWT_SECRET = 'session-refresh-test-secret-that-is-long-enough';
process.env.JWT_EXPIRES_IN = '30m';
process.env.REFRESH_TTL = '30d';
after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalJwtExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN;
  else process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
  if (originalRefreshTtl === undefined) delete process.env.REFRESH_TTL;
  else process.env.REFRESH_TTL = originalRefreshTtl;
});

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

function createSessionStore(t) {
  const records = new Map();
  patchMethod(t, Session, 'create', async (record) => {
    records.set(record.sessionId, record);
    return record;
  });
  patchMethod(t, Session, 'findOne', async (query) => {
    const [field, value] = Object.entries(query)[0];
    return [...records.values()].find((record) => record[field] === value) || null;
  });
  patchMethod(t, Session, 'findOneAndUpdate', async (query, update) => {
    const record = records.get(query.sessionId);
    if (!record) return null;

    for (const [field, expected] of Object.entries(query)) {
      if (field === 'sessionId') continue;
      if (expected && typeof expected === 'object' && '$gt' in expected) {
        if (!(record[field] > expected.$gt)) return null;
      } else if (record[field] instanceof Date && expected instanceof Date) {
        if (record[field].getTime() !== expected.getTime()) return null;
      } else if (record[field] !== expected) {
        return null;
      }
    }

    Object.assign(record, update.$set);
    return record;
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
    if (!record) return { deletedCount: 0 };
    records.delete(record.sessionId);
    return { deletedCount: 1 };
  });

  return records;
}

function mockUser(t, user) {
  patchMethod(t, User, 'findById', () => ({
    select: async () => user,
  }));
}

function sessionFailure(promise) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, 'SESSION_INVALID');
    return true;
  });
}

function createResponse() {
  const response = {
    cookies: [],
    clearedCookies: [],
    statusCode: undefined,
    body: undefined,
    ended: false,
  };
  return {
    response,
    res: {
      set() {
        return this;
      },
      cookie(name, value, options) {
        response.cookies.push({ name, value, options });
        return this;
      },
      clearCookie(name, options) {
        response.clearedCookies.push({ name, options });
        return this;
      },
      status(statusCode) {
        response.statusCode = statusCode;
        return this;
      },
      json(body) {
        response.body = body;
        return this;
      },
      end() {
        response.ended = true;
        return this;
      },
    },
  };
}

function userFixture(tokenVersion = 0) {
  return {
    _id: '507f1f77bcf86cd799439011',
    role: 'user',
    isActive: true,
    tokenVersion,
  };
}

test('refresh rotates the opaque token, stores only its SHA-256 hash, and keeps the same session id', async (t) => {
  const sessions = createSessionStore(t);
  const user = userFixture(3);
  mockUser(t, user);

  const initial = await createSession(user, 'Initial browser');
  const initialExpiry = sessions.values().next().value.refreshExpiresAt.getTime();
  assert.match(initial.refreshToken, /^[A-Za-z0-9_-]{43}$/);
  const rotated = await refreshSessionToken(initial.refreshToken, 'Updated browser');
  const sessionId = [...sessions.keys()][0];
  const session = sessions.get(sessionId);

  assert.notEqual(rotated.refreshToken, initial.refreshToken);
  assert.equal(
    session.refreshTokenHash,
    createHash('sha256').update(rotated.refreshToken).digest('hex'),
  );
  assert.notEqual(session.refreshTokenHash, rotated.refreshToken);
  assert.equal('refreshToken' in session, false);
  assert.equal(
    session.previousRefreshTokenHash,
    createHash('sha256').update(initial.refreshToken).digest('hex'),
  );
  assert.equal(session.userAgent, 'Updated browser');
  assert.ok(session.rotatedAt instanceof Date);
  assert.ok(session.lastUsedAt instanceof Date);
  assert.ok(session.refreshExpiresAt.getTime() > initialExpiry);
  assert.ok(session.refreshExpiresAt < session.absoluteExpiresAt);
  assert.equal(rotated.accessMaxAge, 30 * 60 * 1000);
  assert.equal(rotated.refreshMaxAge, 30 * 24 * 60 * 60 * 1000);
  assert.equal(jwt.decode(rotated.accessToken).jti, sessionId);
});

test('reuse of the previous refresh token after ten seconds revokes the session', async (t) => {
  const sessions = createSessionStore(t);
  const user = userFixture();
  mockUser(t, user);

  const initial = await createSession(user);
  await refreshSessionToken(initial.refreshToken);
  const session = sessions.values().next().value;
  session.rotatedAt = new Date(Date.now() - 10_001);

  await sessionFailure(refreshSessionToken(initial.refreshToken));
  assert.equal(sessions.size, 0);
});

test('reuse of the previous refresh token within ten seconds only issues an access token', async (t) => {
  const sessions = createSessionStore(t);
  const user = userFixture();
  mockUser(t, user);

  const initial = await createSession(user);
  const rotated = await refreshSessionToken(initial.refreshToken);
  const session = sessions.values().next().value;
  const currentRefreshHash = session.refreshTokenHash;
  session.rotatedAt = new Date(Date.now() - 5_000);

  const concurrent = await refreshSessionToken(initial.refreshToken);

  assert.equal(concurrent.refreshToken, null);
  assert.equal(session.refreshTokenHash, currentRefreshHash);
  assert.equal(sessions.size, 1);
  assert.equal(jwt.decode(concurrent.accessToken).jti, session.sessionId);
  assert.notEqual(concurrent.accessToken, rotated.accessToken);
});

test('refresh cannot extend a session past its absolute expiration', async (t) => {
  const sessions = createSessionStore(t);
  const user = userFixture();
  mockUser(t, user);

  const initial = await createSession(user);
  const session = sessions.values().next().value;
  session.absoluteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  session.refreshExpiresAt = new Date(session.absoluteExpiresAt);

  const rotated = await refreshSessionToken(initial.refreshToken);

  assert.equal(session.refreshExpiresAt.getTime(), session.absoluteExpiresAt.getTime());
  assert.ok(rotated.refreshToken);
});

test('refresh rejects and deletes a session past the absolute expiration', async (t) => {
  const sessions = createSessionStore(t);
  const user = userFixture();
  mockUser(t, user);

  const initial = await createSession(user);
  const session = sessions.values().next().value;
  session.absoluteExpiresAt = new Date(Date.now() - 1);

  await sessionFailure(refreshSessionToken(initial.refreshToken));
  assert.equal(sessions.size, 0);
});

test('refresh rejects and deletes sessions for disabled users or changed token versions', async (t) => {
  const sessions = createSessionStore(t);
  const user = userFixture();
  mockUser(t, user);

  const disabledSession = await createSession(user);
  user.isActive = false;
  await sessionFailure(refreshSessionToken(disabledSession.refreshToken));
  assert.equal(sessions.size, 0);

  user.isActive = true;
  const outdatedSession = await createSession(user);
  user.tokenVersion += 1;
  await sessionFailure(refreshSessionToken(outdatedSession.refreshToken));
  assert.equal(sessions.size, 0);
});

test('refresh endpoint sets both cookies on rotation and clears both on invalid refresh', async (t) => {
  createSessionStore(t);
  const user = userFixture();
  mockUser(t, user);
  const initial = await createSession(user);

  const success = createResponse();
  await refreshEndpoint(
    {
      cookies: { [REFRESH_COOKIE_NAME]: initial.refreshToken },
      get: () => 'Browser',
    },
    success.res,
    (error) => {
      throw error;
    },
  );

  assert.equal(success.response.statusCode, 200);
  assert.deepEqual(
    success.response.cookies.map(({ name }) => name).sort(),
    [REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME].sort(),
  );
  assert.equal(
    success.response.cookies.find(({ name }) => name === REFRESH_COOKIE_NAME).options.path,
    '/api/auth',
  );
  assert.equal(
    success.response.cookies.find(({ name }) => name === REFRESH_COOKIE_NAME).options.maxAge,
    30 * 24 * 60 * 60 * 1000,
  );
  assert.equal(
    success.response.cookies.find(({ name }) => name === SESSION_COOKIE_NAME).options.path,
    '/api',
  );

  const failure = createResponse();
  await refreshEndpoint({ cookies: {}, get: () => 'Browser' }, failure.res, (error) => {
    throw error;
  });

  assert.equal(failure.response.statusCode, 401);
  assert.equal(failure.response.body.code, 'SESSION_INVALID');
  assert.ok(failure.response.clearedCookies.some(({ name }) => name === SESSION_COOKIE_NAME));
  assert.ok(failure.response.clearedCookies.some(({ name }) => name === REFRESH_COOKIE_NAME));
  assert.equal(
    failure.response.clearedCookies.find(({ name }) => name === REFRESH_COOKIE_NAME).options.path,
    '/api/auth',
  );
  assert.equal(
    failure.response.clearedCookies.find(({ name }) => name === SESSION_COOKIE_NAME).options.path,
    '/api',
  );
});

test('login sets access and refresh cookies with their configured lifetimes', async (t) => {
  const session = {
    accessToken: 'access-token',
    refreshToken: 'opaque-refresh-token',
    accessMaxAge: 30 * 60 * 1000,
    refreshMaxAge: 30 * 24 * 60 * 60 * 1000,
    user: { id: 'user-id', name: 'Test', email: 'test@example.com', role: 'user' },
  };
  patchMethod(t, authService, 'login', async () => session);

  const response = createResponse();
  await loginEndpoint(
    {
      validated: { body: { email: 'test@example.com', password: 'Password123' } },
      get: () => 'Browser',
    },
    response.res,
    (error) => {
      throw error;
    },
  );

  assert.equal(response.response.statusCode, 200);
  assert.deepEqual(
    response.response.cookies.map(({ name }) => name).sort(),
    [REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME].sort(),
  );
  assert.equal(
    response.response.cookies.find(({ name }) => name === SESSION_COOKIE_NAME).options.maxAge,
    session.accessMaxAge,
  );
  assert.equal(
    response.response.cookies.find(({ name }) => name === REFRESH_COOKIE_NAME).options.maxAge,
    session.refreshMaxAge,
  );
  assert.equal('refreshToken' in response.response.body, false);
});
