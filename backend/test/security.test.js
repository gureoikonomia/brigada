import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cookieOptions,
  csrfTokenMatches,
  sessionVersionMatches,
  votedIncidentVisibilityMatch,
} from '../src/utils/security.js';
import { csrfProtection } from '../src/middlewares/csrf.middleware.js';

test('session tokens must carry the current session version', async (t) => {
  await t.test('accepts a current token', () => {
    assert.equal(sessionVersionMatches(2, 2), true);
  });

  await t.test('rejects a token after password or account status changes', () => {
    assert.equal(sessionVersionMatches(1, 2), false);
  });

  await t.test('rejects legacy tokens without a version claim', () => {
    assert.equal(sessionVersionMatches(undefined, 0), false);
  });

  await t.test('supports users whose stored version defaults to zero', () => {
    assert.equal(sessionVersionMatches(0), true);
  });
});

test('CSRF cookies and headers must contain the same token', () => {
  assert.equal(csrfTokenMatches('same-token', 'same-token'), true);
  assert.equal(csrfTokenMatches('cookie-token', 'header-token'), false);
  assert.equal(csrfTokenMatches(undefined, 'header-token'), false);
  assert.equal(csrfTokenMatches('', ''), false);
});

test('authentication cookies are HttpOnly and secure in production', () => {
  assert.deepEqual(cookieOptions(true), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api',
  });
  assert.equal(cookieOptions(false).sameSite, 'lax');
});

test('CSRF protection rejects unsafe requests without a trusted origin and matching token', () => {
  const middleware = csrfProtection(new Set(['https://brigada.example']));
  const req = {
    method: 'POST',
    get: (name) => ({
      Origin: 'https://brigada.example',
      'X-CSRF-Token': 'header-token',
    })[name],
    cookies: { brigada_csrf: 'cookie-token' },
  };
  let status;
  let body;
  let continued = false;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  middleware(req, res, () => {
    continued = true;
  });

  test('pre-auth JSON endpoints require a trusted origin but not a cross-site CSRF cookie', () => {
    const middleware = csrfProtection(new Set(['https://brigada.example']));
    const req = {
      method: 'POST',
      path: '/api/auth/verify-email',
      is: (contentType) => contentType === 'application/json',
      get: (name) => ({
        Origin: 'https://brigada.example',
      })[name],
      cookies: {},
    };
    let continued = false;
    const res = {
      status() {
        return this;
      },
      json() {},
    };

    middleware(req, res, () => {
      continued = true;
    });
    assert.equal(continued, true);

    continued = false;
    req.path = '/api/auth/logout';
    middleware(req, res, () => {
      continued = true;
    });
    assert.equal(continued, false);

    req.path = '/api/auth/verify-email';
    req.is = () => false;
    let responseStatus;
    res.status = (status) => {
      responseStatus = status;
      return res;
    };
    middleware(req, res, () => {
      continued = true;
    });
    assert.equal(continued, false);
    assert.equal(responseStatus, 415);
  });

  assert.equal(continued, false);
  assert.equal(status, 403);
  assert.equal(body.code, 'CSRF_INVALID');
});

test("voted incidents are limited to public items and the current user's own items", async (t) => {
  const userId = 'user-object-id';
  const expectedMatch = {
    $or: [
      { 'incident.status': { $in: ['pendiente', 'resuelta'] } },
      { 'incident.createdBy': userId },
    ],
  };

  await t.test('allows public statuses and private incidents owned by the user', () => {
    assert.deepEqual(votedIncidentVisibilityMatch(userId, 'user'), expectedMatch);
  });

  await t.test('lets administrators and moderators use their existing review access', () => {
    assert.equal(votedIncidentVisibilityMatch(userId, 'admin'), null);
    assert.equal(votedIncidentVisibilityMatch(userId, 'moderator'), null);
  });
});
