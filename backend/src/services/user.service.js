import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Incident from '../models/incident.model.js';
import Vote from '../models/vote.model.js';
import PasswordResetToken from '../models/passwordResetToken.model.js';
import EmailVerificationToken from '../models/emailVerificationToken.model.js';
import PendingMediaDeletion from '../models/pendingMediaDeletion.model.js';
import { ServiceError } from '../errors/service.error.js';
import appSettingsService from './app-settings.service.js';
import {
  enqueueMediaDeletion,
  processPendingMediaDeletions,
} from './media-deletion.service.js';

/**
 * Obtiene métricas y estadísticas del usuario autenticado.
 */
async function getUserStats(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  const [{ votingEnabled }, incidentsCount, resolvedCount] = await Promise.all([
    appSettingsService.getSettings(),
    Incident.countDocuments({ createdBy: userId }),
    Incident.countDocuments({ createdBy: userId, status: 'resuelta' }),
  ]);
  const votesCount = votingEnabled ? await Vote.countDocuments({ user: userId }) : 0;

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
    ...(votingEnabled && { votesCount }),
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
    { votingEnabled },
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    Incident.countDocuments(),
    Incident.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    appSettingsService.getSettings(),
  ]);
  const totalVotes = votingEnabled ? await Vote.countDocuments() : undefined;

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
    ...(votingEnabled && { totalVotes }),
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
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');
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
    { $set: { isActive }, $inc: { tokenVersion: 1 } },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updated) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  return updated;
}

async function deleteAccount(userId, currentPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new ServiceError('Usuario no encontrado', 404);

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new ServiceError('La contraseña actual no es correcta', 401);
  }

  const session = await mongoose.startSession();
  let publicIds = [];

  try {
    await session.withTransaction(async () => {
      const activeUser = await User.findOneAndUpdate(
        { _id: userId, isActive: true },
        { $set: { isActive: false }, $inc: { tokenVersion: 1 } },
        { new: true, session }
      ).select('+avatarPublicId');

      if (!activeUser) {
        throw new ServiceError('La cuenta ya no está activa', 409);
      }

      const ownedIncidents = await Incident.find({ createdBy: userId })
        .select('_id images')
        .session(session)
        .lean();
      const ownedIncidentIds = ownedIncidents.map((incident) => incident._id);
      const ownedIdSet = new Set(ownedIncidentIds.map((id) => id.toString()));

      publicIds = [
        activeUser.avatarPublicId,
        ...ownedIncidents.flatMap((incident) =>
          incident.images.map((image) => image.publicId)
        ),
      ].filter(Boolean);

      const votesByIncident = await Vote.aggregate([
        { $match: { user: activeUser._id } },
        { $group: { _id: '$incident', count: { $sum: 1 } } },
      ]).session(session);

      for (const voteGroup of votesByIncident) {
        if (ownedIdSet.has(voteGroup._id.toString())) continue;

        const update = await Incident.updateOne(
          { _id: voteGroup._id, votesCount: { $gte: voteGroup.count } },
          { $inc: { votesCount: -voteGroup.count } },
          { session }
        );
        if (update.matchedCount !== 1) {
          throw new ServiceError('No se pudo reconciliar el contador de votos', 409);
        }
      }

      await Vote.deleteMany({ user: activeUser._id }, { session });
      if (ownedIncidentIds.length) {
        await Vote.deleteMany({ incident: { $in: ownedIncidentIds } }, { session });
      }
      await Incident.deleteMany({ createdBy: activeUser._id }, { session });
      await PasswordResetToken.deleteMany({ userId: activeUser._id }, { session });
      await EmailVerificationToken.deleteMany({ userId: activeUser._id }, { session });
      await enqueueMediaDeletion(publicIds, session);
      await User.deleteOne({ _id: activeUser._id }, { session });
    });
  } finally {
    await session.endSession();
  }

  try {
    await processPendingMediaDeletions();
  } catch (error) {
    console.error('La limpieza de medios seguirá reintentándose:', error.message);
  }

  const mediaCleanupPending = publicIds.length
    ? Boolean(await PendingMediaDeletion.exists({ publicIds: { $in: publicIds } }))
    : false;

  return { deleted: true, mediaCleanupPending };
}

export default {
  getUserStats,
  getAdminStats,
  listUsers,
  updateUserRole,
  updateUserStatus,
  deleteAccount,
};
