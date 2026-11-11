import express from 'express';
import rateLimit from 'express-rate-limit';

import { accountDeletionService } from '../services/account-deletion.service.js';
import { authResetController } from '../controllers/auth-reset.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  requestAccountDeletionSchema,
  confirmAccountDeletionSchema,
} from '../validators/auth.validator.js';
import { createRateLimitStore } from '../middlewares/mongo-rate-limit.store.js';

const router = express.Router();

// Rate limiter específico para rutas de recuperación de contraseña
// (5 intentos por IP en 15 minutos)
const resetRateLimiter = rateLimit({
  store: createRateLimitStore('password-reset'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, prueba más tarde' },
});

const accountDeletionRateLimiter = rateLimit({
  store: createRateLimitStore('account-deletion'),
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Inténtalo más tarde.' },
});

router.post(
  '/forgot-password',
  resetRateLimiter,
  validate(forgotPasswordSchema),
  authResetController.requestPasswordReset,
);

router.post(
  '/request-account-deletion',
  accountDeletionRateLimiter,
  validate(requestAccountDeletionSchema),
  async (req, res, next) => {
    try {
      const result = await accountDeletionService.requestAccountDeletion(req.validated.body.email);
      return res.status(202).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/confirm-account-deletion',
  accountDeletionRateLimiter,
  validate(confirmAccountDeletionSchema),
  async (req, res, next) => {
    try {
      const result = await accountDeletionService.confirmAccountDeletion(req.validated.body);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/reset-password',
  resetRateLimiter,
  validate(resetPasswordSchema),
  authResetController.resetPassword,
);

export default router;
