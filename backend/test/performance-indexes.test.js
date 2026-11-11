import assert from 'node:assert/strict';
import test from 'node:test';

import PasswordResetToken from '../src/models/passwordResetToken.model.js';
import Vote from '../src/models/vote.model.js';

function hasIndex(schema, expectedKeys) {
  return schema
    .indexes()
    .some(
      ([keys]) =>
        Object.keys(keys).length === Object.keys(expectedKeys).length &&
        Object.entries(expectedKeys).every(([field, direction]) => keys[field] === direction),
    );
}

test('vote and password-reset lookups have supporting compound indexes', () => {
  assert.equal(hasIndex(Vote.schema, { user: 1, incident: 1 }), true);
  assert.equal(hasIndex(Vote.schema, { user: 1, createdAt: -1 }), true);
  assert.equal(hasIndex(PasswordResetToken.schema, { userId: 1, usedAt: 1 }), true);
});
