import assert from 'node:assert/strict';
import test from 'node:test';

import { getCorsOrigins } from '../src/config/env.js';

test('production CORS includes the deployed Netlify frontend as an explicit origin', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousCorsOrigins = process.env.CORS_ORIGINS;
  process.env.NODE_ENV = 'production';
  process.env.CORS_ORIGINS = 'https://another-explicit-origin.example';

  try {
    const origins = getCorsOrigins();
    assert.equal(origins.has('https://appbrigada.netlify.app'), true);
    assert.equal(origins.has('https://another-explicit-origin.example'), true);
    assert.equal(origins.has('*'), false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousCorsOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = previousCorsOrigins;
  }
});
