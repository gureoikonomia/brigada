import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getCorsOrigins } from './config/env.js';

import {
  notFound,
  errorHandler,
} from './middlewares/error.middleware.js';
import { csrfProtection } from './middlewares/csrf.middleware.js';
import {
  loginLimiter,
  registerLimiter,
} from './middlewares/rate-limiters.js';
import mongoose from 'mongoose';
import { createRateLimitStore } from './middlewares/mongo-rate-limit.store.js';

import authRoutes from './routes/auth.route.js';
import incidentRoutes from './routes/incident.route.js';
import userRoutes from './routes/user.route.js';
import authResetRoutes from './routes/authReset.route.js';
import appSettingsRoutes from './routes/app-settings.route.js';

const app = express();
const allowedOrigins = getCorsOrigins();

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
  app.set('trust proxy', trustProxyHops);
}

// 1. Seguridad con Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Rate Limiting (Seguridad anti-bruteforce y anti-DoS)
const globalLimiter = rateLimit({
  store: createRateLimitStore('global'),
  skip: (req) => req.path === '/api/health',
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // máximo 300 peticiones por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde' },
});

const authLimiter = rateLimit({
  store: createRateLimitStore('auth'),
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Inténtalo más tarde.' },
});

app.use(globalLimiter);

// 3. CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('No permitido por CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));
app.use(cookieParser());
app.use(csrfProtection(allowedOrigins));

// Liveness and readiness endpoint
app.get('/api/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    database: databaseReady ? 'connected' : 'unavailable',
  });
});

app.get('/api/legal/privacy-notice', (req, res) => {
  return res.json({
    url: process.env.PRIVACY_NOTICE_URL || null,
    version: process.env.PRIVACY_NOTICE_VERSION || null,
  });
});

// 4. Rutas de la API
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', appSettingsRoutes);
app.use('/api/auth', authResetRoutes);

// 5. Manejo de Errores
app.use(notFound);
app.use(errorHandler);

export default app;