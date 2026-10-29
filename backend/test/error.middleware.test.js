import assert from 'node:assert/strict';
import test from 'node:test';

import { errorHandler } from '../src/middlewares/error.middleware.js';

test('unexpected errors never expose stack traces in HTTP responses', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousConsoleError = console.error;
  let responseBody;
  let responseStatus;

  process.env.NODE_ENV = 'development';
  console.error = () => {};

  try {
    errorHandler(
      new Error('internal detail'),
      {},
      {
        status(status) {
          responseStatus = status;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
      },
      () => {}
    );
  } finally {
    console.error = previousConsoleError;
    if (previousEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnvironment;
    }
  }

  assert.equal(responseStatus, 500);
  assert.deepEqual(responseBody, { message: 'Error interno del servidor' });
});
