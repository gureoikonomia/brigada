import express from 'express';

import incidentController from '../controllers/incident.controller.js';
import voteRoutes from './vote.route.js';

import {
  protect,
  restrictTo,
  attachUserIfPresent,
} from '../middlewares/auth.middleware.js';

import { handleUploadErrors } from '../middlewares/upload.middleware.js';

import { validate } from '../middlewares/validate.middleware.js';

import {
  createIncidentSchema,
  updateStatusSchema,
  listIncidentsQuerySchema,
  mongoIdParamSchema,
} from '../validators/incident.validator.js';

const router = express.Router();

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Listar incidencias
// Si existe un token válido, req.user queda disponible
// para poder calcular hasVoted.
router.get(
  '/',
  attachUserIfPresent,
  validate(listIncidentsQuerySchema, 'query'),
  incidentController.list
);

// Obtener incidencias votadas por el usuario logueado
router.get(
  '/user/voted',
  protect,
  incidentController.listVoted
);

// Obtener una incidencia concreta
router.get(
  '/:id',
  attachUserIfPresent,
  validate(mongoIdParamSchema, 'params'),
  incidentController.getById
);

// ============================================
// RUTAS AUTENTICADAS
// ============================================

// Crear incidencia
//
// IMPORTANTE:
// multer debe ejecutarse antes de validate,
// porque procesa multipart/form-data y crea req.body.
router.post(
  '/',
  protect,
  handleUploadErrors,
  validate(createIncidentSchema),
  incidentController.create
);

// Eliminar incidencia
router.delete(
  '/:id',
  protect,
  validate(mongoIdParamSchema, 'params'),
  incidentController.remove
);

// ============================================
// RUTAS DE MODERACIÓN
// ============================================

// Cambiar estado de una incidencia
router.patch(
  '/:id/status',
  protect,
  restrictTo('admin', 'moderator'),
  validate(mongoIdParamSchema, 'params'),
  validate(updateStatusSchema),
  incidentController.updateStatus
);

// ============================================
// VOTOS
// ============================================

router.use('/', voteRoutes);

export default router;