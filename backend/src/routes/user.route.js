import express from 'express';
import userController from '../controllers/user.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { mongoIdParamSchema } from '../validators/incident.validator.js';
import {
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../validators/user.validator.js';

const router = express.Router();

// Estadísticas del usuario logueado
router.get('/me/stats', protect, userController.getStats);

// Métricas de administrador
router.get('/admin/stats', protect, restrictTo('admin'), userController.getAdminStats);

// Listado de usuarios para administración
router.get(
  '/',
  protect,
  restrictTo('admin'),
  validate(listUsersQuerySchema, 'query'),
  userController.listUsers
);

// Cambiar rol de usuario (solo ADMIN)
router.patch(
  '/:id/role',
  protect,
  restrictTo('admin'),
  validate(mongoIdParamSchema, 'params'),
  validate(updateUserRoleSchema),
  userController.updateRole
);

// Activar/desactivar usuario (solo ADMIN)
router.patch(
  '/:id/status',
  protect,
  restrictTo('admin'),
  validate(mongoIdParamSchema, 'params'),
  validate(updateUserStatusSchema),
  userController.updateStatus
);

export default router;
