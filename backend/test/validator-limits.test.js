import assert from 'node:assert/strict';
import test from 'node:test';

import {
  listIncidentsQuerySchema,
  listVotedIncidentsQuerySchema,
} from '../src/validators/incident.validator.js';
import { listUsersQuerySchema } from '../src/validators/user.validator.js';
import {
  loginSchema,
  requestEmailChangeSchema,
  updateProfileSchema,
} from '../src/validators/auth.validator.js';
import { validateJwtExpiry } from '../src/config/env.js';

test('incident list bounds pagination and geographic search', () => {
  assert.equal(listIncidentsQuerySchema.safeParse({ page: '1000', maxDistanceMeters: '50000' }).success, true);
  assert.equal(listIncidentsQuerySchema.safeParse({ page: '1001' }).success, false);
  assert.equal(listIncidentsQuerySchema.safeParse({ maxDistanceMeters: '50001' }).success, false);
  assert.equal(listVotedIncidentsQuerySchema.safeParse({ page: '1001' }).success, false);
  assert.equal(listUsersQuerySchema.safeParse({ page: '1001' }).success, false);
});

test('profile updates cannot directly change the email address', async () => {
  const profileUpdate = updateProfileSchema.safeParse({
    name: 'Vecina',
    email: 'new@example.com',
    role: 'admin',
  });
  assert.equal(profileUpdate.success, true);
  assert.deepEqual(profileUpdate.data, { name: 'Vecina' });
  assert.equal(updateProfileSchema.safeParse({ email: 'new@example.com' }).success, false);
  assert.equal(requestEmailChangeSchema.safeParse({
    email: 'new@example.com',
    currentPassword: 'a-valid-current-password',
  }).success, true);
  assert.equal(requestEmailChangeSchema.safeParse({
    email: 'new@example.com',
  }).success, false);
});

test('password validation respects bcrypt UTF-8 byte limit', () => {
  assert.equal(loginSchema.safeParse({
    email: 'person@example.com',
    password: 'á'.repeat(37),
  }).success, false);
  assert.equal(loginSchema.safeParse({
    email: 'person@example.com',
    password: 'ValidPass123',
  }).success, true);
});

test('JWT expiration accepts bounded unit durations only', () => {
  assert.doesNotThrow(() => validateJwtExpiry('1h'));
  assert.doesNotThrow(() => validateJwtExpiry('24h'));
  assert.throws(() => validateJwtExpiry('25h'));
  assert.throws(() => validateJwtExpiry('100'));
});
