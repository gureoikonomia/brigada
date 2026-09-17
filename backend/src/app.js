import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import {
  notFound,
  errorHandler,
} from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.route.js';
import incidentRoutes from './routes/incident.route.js';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;