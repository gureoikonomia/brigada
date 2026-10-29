import express from 'express';

import authController from '../controllers/auth.controller.js';

import { protect } from '../middlewares/auth.middleware.js';
import {
  handleAvatarUploadErrors,
  validateImageContent,
} from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  emailChangeLimiter,
  uploadLimiter,
} from '../middlewares/rate-limiters.js';

import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  resendVerificationSchema,
  verifyEmailSchema,
  deleteAccountSchema,
  requestEmailChangeSchema,
} from '../validators/auth.validator.js';

const router = express.Router();

router.get('/csrf', authController.csrf);

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

router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  authController.resendVerification
);

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  authController.verifyEmail
);

router.post('/logout', authController.logout);

router.get(
  '/me',
  protect,
  authController.me
);

router.patch('/me', protect, validate(updateProfileSchema), authController.updateProfile);
router.post(
  '/me/email-change',
  protect,
  emailChangeLimiter,
  validate(requestEmailChangeSchema),
  authController.requestEmailChange
);
router.patch(
  '/me/avatar',
  protect,
  uploadLimiter,
  handleAvatarUploadErrors,
  validateImageContent,
  authController.updateAvatar
);
router.patch('/me/password', protect, validate(changePasswordSchema), authController.changePassword);
router.delete('/me', protect, validate(deleteAccountSchema), authController.deleteAccount);

export default router;