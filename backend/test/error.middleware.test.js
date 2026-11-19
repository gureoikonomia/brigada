import assert from 'node:assert/strict';
import test from 'node:test';

import { errorHandler } from '../src/middlewares/error.middleware.js';
import { ServiceError } from '../src/errors/service.error.js';

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
      () => {},
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

test('business error codes are included in HTTP responses', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousConsoleError = console.error;
  let responseBody;
  let responseStatus;

  process.env.NODE_ENV = 'development';
  console.error = () => {};

  try {
    errorHandler(
      new ServiceError('La contraseña actual no es correcta', 403, 'INVALID_CURRENT_PASSWORD'),
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
      () => {},
    );
  } finally {
    console.error = previousConsoleError;
    if (previousEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnvironment;
    }
  }

  assert.equal(responseStatus, 403);
  assert.deepEqual(responseBody, {
    message: 'La contraseña actual no es correcta',
    code: 'INVALID_CURRENT_PASSWORD',
  });
});
