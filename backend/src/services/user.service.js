import User from '../models/user.model.js';
import Incident from '../models/incident.model.js';
import Vote from '../models/vote.model.js';
import { ServiceError } from '../errors/service.error.js';

/**
 * Obtiene métricas y estadísticas del usuario autenticado.
 */
async function getUserStats(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  const [incidentsCount, resolvedCount, votesCount] = await Promise.all([
    Incident.countDocuments({ createdBy: userId }),
    Incident.countDocuments({ createdBy: userId, status: 'resuelta' }),
    Vote.countDocuments({ user: userId }),
  ]);

  const resolutionRate = incidentsCount > 0 
    ? Math.round((resolvedCount / incidentsCount) * 100) 
    : 0;

  const activityTotal = incidentsCount + votesCount;
  let rank = 'novice';
  if (activityTotal >= 20) {
    rank = 'legend';
  } else if (activityTotal >= 10) {
    rank = 'honor';
  } else if (activityTotal >= 3) {
    rank = 'active';
  }

  return {
    incidentsCount,
    resolvedCount,
    votesCount,
    resolutionRate,
    memberSince: user.createdAt,
    rank,
    role: user.role,
  };
}

/**
 * Obtiene métricas globales del sistema para el panel de administración.
 */
async function getAdminStats() {
  const [
    totalUsers,
    usersByRole,
    activeUsersCount,
    inactiveUsersCount,
    totalIncidents,
    incidentsByStatus,
    totalVotes,
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    Incident.countDocuments(),
    Incident.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Vote.countDocuments(),
  ]);

  const rolesMap = { user: 0, moderator: 0, admin: 0 };
  usersByRole.forEach((item) => {
    if (item._id) rolesMap[item._id] = item.count;
  });

  const statusMap = { pendiente: 0, en_revision: 0, resuelta: 0, rechazada: 0 };
  incidentsByStatus.forEach((item) => {
    if (item._id) statusMap[item._id] = item.count;
  });

  return {
    users: {
      total: totalUsers,
      active: activeUsersCount,
      inactive: inactiveUsersCount,
      byRole: rolesMap,
    },
    incidents: {
      total: totalIncidents,
      byStatus: statusMap,
    },
    totalVotes,
  };
}

/**
 * Lista usuarios con paginación, filtro por rol y búsqueda de texto.
 */
async function listUsers({ page = 1, limit = 20, role, search }) {
  const query = {};

  if (role) {
    query.role = role;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Cambia el rol de un usuario (solo ADMIN).
 */
async function updateUserRole(adminUserId, targetUserId, newRole) {
  if (adminUserId === targetUserId && newRole !== 'admin') {
    throw new ServiceError('No puedes degradar tu propio rol de Administrador', 400);
  }

  const updated = await User.findByIdAndUpdate(
    targetUserId,
    { role: newRole },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updated) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  return updated;
}

/**
 * Activa o desactiva la cuenta de un usuario (solo ADMIN).
 */
async function updateUserStatus(adminUserId, targetUserId, isActive) {
  if (adminUserId === targetUserId && !isActive) {
    throw new ServiceError('No puedes desactivar tu propia cuenta de Administrador', 400);
  }

  const updated = await User.findByIdAndUpdate(
    targetUserId,
    { isActive },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updated) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  return updated;
}

export default {
  getUserStats,
  getAdminStats,
  listUsers,
  updateUserRole,
  updateUserStatus,
};
