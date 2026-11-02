import assert from 'node:assert/strict';
import test from 'node:test';

import { getEmailConfiguration } from '../src/config/email.js';

test('Gmail is the only email provider and requires application credentials', () => {
  assert.throws(
    () => getEmailConfiguration({}),
    /GMAIL_USER y GMAIL_APP_PASSWORD/
  );

  assert.throws(
    () => getEmailConfiguration({
      GMAIL_USER: 'not-an-email',
      GMAIL_APP_PASSWORD: 'test-app-password',
    }),
    /GMAIL_USER debe ser una dirección/
  );

  assert.deepEqual(
    getEmailConfiguration({
      GMAIL_USER: 'brigada@example.com',
      GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
    }),
    {
      user: 'brigada@example.com',
      password: 'abcdefghijklmnop',
    }
  );
});
