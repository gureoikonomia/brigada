import rateLimit from 'express-rate-limit';
import { createRateLimitStore } from './mongo-rate-limit.store.js';

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const registerLimiter = rateLimit({
  ...commonOptions,
  store: createRateLimitStore('register'),
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { message: 'Demasiadas solicitudes. Inténtalo más tarde.' },
});

export const loginLimiter = rateLimit({
  ...commonOptions,
  store: createRateLimitStore('login'),
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: 'Demasiados intentos. Inténtalo más tarde.' },
});

export const uploadLimiter = rateLimit({
  ...commonOptions,
  store: createRateLimitStore('upload'),
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { message: 'Has alcanzado el límite temporal de subidas.' },
});

export const voteLimiter = rateLimit({
  ...commonOptions,
  store: createRateLimitStore('vote'),
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { message: 'Has alcanzado el límite temporal de votos.' },
});

export const emailChangeLimiter = rateLimit({
  ...commonOptions,
  store: createRateLimitStore('email-change'),
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: { message: 'Demasiadas solicitudes. Inténtalo más tarde.' },
});
