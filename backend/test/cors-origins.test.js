import assert from 'node:assert/strict';
import test from 'node:test';

import { getCorsOrigins } from '../src/config/env.js';

test('CORS includes the deployed Netlify frontend as an explicit origin', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousCorsOrigins = process.env.CORS_ORIGINS;
  process.env.CORS_ORIGINS = 'https://another-explicit-origin.example';

  try {
    process.env.NODE_ENV = 'production';
    const origins = getCorsOrigins();
    assert.equal(origins.has('https://appbrigada.netlify.app'), true);
    assert.equal(origins.has('https://another-explicit-origin.example'), true);
    assert.equal(origins.has('*'), false);

    process.env.NODE_ENV = 'development';
    const developmentOrigins = getCorsOrigins();
    assert.equal(developmentOrigins.has('https://appbrigada.netlify.app'), true);
    assert.equal(developmentOrigins.has('http://localhost:5173'), true);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousCorsOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = previousCorsOrigins;
  }
});

test('CORS allows the default Capacitor iOS and Android origins', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = 'production';
    const origins = getCorsOrigins();
    assert.equal(origins.has('capacitor://localhost'), true);
    assert.equal(origins.has('https://localhost'), true);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
