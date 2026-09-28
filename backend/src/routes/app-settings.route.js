import express from 'express';
import appSettingsController from '../controllers/app-settings.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateVotingSettingSchema } from '../validators/app-settings.validator.js';

const router = express.Router();

router.get('/', appSettingsController.getSettings);

router.patch(
  '/voting',
  protect,
  restrictTo('admin'),
  validate(updateVotingSettingSchema),
  appSettingsController.updateVoting
);

export default router;