import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import {
  notFound,
  errorHandler,
} from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.route.js';
import incidentRoutes from './routes/incident.route.js';
import userRoutes from './routes/user.route.js';
import authResetRoutes from './routes/authReset.route.js';

const app = express();

// 1. Seguridad con Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Rate Limiting (Seguridad anti-bruteforce y anti-DoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // máximo 300 peticiones por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // máximo 30 intentos de login/registro por IP en 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de autenticación, intente de nuevo en 15 minutos' },
});

app.use(globalLimiter);

// 3. CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origen (como Postman o apps móviles) y cualquier origen de netlify
      if (!origin || origin.startsWith('https://appbrigada.netlify.app')) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running with security headers & rate limits active',
  });
});

// 4. Rutas de la API
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authResetRoutes);

// 5. Manejo de Errores
app.use(notFound);
app.use(errorHandler);

export default app;