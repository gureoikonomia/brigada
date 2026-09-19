import userService from '../services/user.service.js';

/**
 * GET /api/users/me/stats
 */
async function getStats(req, res, next) {
  try {
    const stats = await userService.getUserStats(req.user.id);
    return res.status(200).json(stats);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/users/admin/stats
 */
async function getAdminStats(req, res, next) {
  try {
    const stats = await userService.getAdminStats();
    return res.status(200).json(stats);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/users
 */
async function listUsers(req, res, next) {
  try {
    const result = await userService.listUsers(req.validated.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/users/:id/role
 */
async function updateRole(req, res, next) {
  try {
    const { role } = req.validated.body;
    const updated = await userService.updateUserRole(req.user.id, req.params.id, role);
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/users/:id/status
 */
async function updateStatus(req, res, next) {
  try {
    const { isActive } = req.validated.body;
    const updated = await userService.updateUserStatus(req.user.id, req.params.id, isActive);
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
}

export default {
  getStats,
  getAdminStats,
  listUsers,
  updateRole,
  updateStatus,
};
