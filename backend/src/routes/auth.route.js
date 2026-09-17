import express from 'express';

import authController from '../controllers/auth.controller.js';

import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = express.Router();

router.post(
  '/register',
  validate(registerSchema),
  authController.register
);

router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

router.get(
  '/me',
  protect,
  authController.me
);

router.patch('/me', protect, validate(updateProfileSchema), authController.updateProfile);
router.patch('/me/password', protect, validate(changePasswordSchema), authController.changePassword);

export default router;