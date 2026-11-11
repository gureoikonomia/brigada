import { userService } from '../services/user.service.js';

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
    const updated = await userService.updateUserRole(req.user.id, req.validated.params.id, role);
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
    const updated = await userService.updateUserStatus(
      req.user.id,
      req.validated.params.id,
      isActive,
    );
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
}

async function listBlockedUsers(req, res, next) {
  try {
    const users = await userService.listBlockedUsers(req.user.id);
    return res.status(200).json(users);
  } catch (error) {
    return next(error);
  }
}

async function blockUser(req, res, next) {
  try {
    const result = await userService.blockUser(req.user.id, req.validated.params.id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
  }
}

async function unblockUser(req, res, next) {
  try {
    const result = await userService.unblockUser(req.user.id, req.validated.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export {
  getStats,
  getAdminStats,
  listUsers,
  updateRole,
  updateStatus,
  listBlockedUsers,
  blockUser,
  unblockUser,
};
