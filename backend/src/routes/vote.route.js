import express from 'express';

import voteController from '../controllers/vote.controller.js';

import { protect } from '../middlewares/auth.middleware.js';

import { validate } from '../middlewares/validate.middleware.js';

import {
  incidentIdParamSchema,
} from '../validators/incident.validator.js';

const router = express.Router();

// ============================================
// VOTOS
// ============================================

// Votar
router.post(
  '/:incidentId/vote',
  protect,
  validate(incidentIdParamSchema, 'params'),
  voteController.vote
);

// Retirar voto
router.delete(
  '/:incidentId/vote',
  protect,
  validate(incidentIdParamSchema, 'params'),
  voteController.unvote
);

// Consultar si el usuario ha votado
router.get(
  '/:incidentId/vote',
  protect,
  validate(incidentIdParamSchema, 'params'),
  voteController.getVoteStatus
);

export default router;