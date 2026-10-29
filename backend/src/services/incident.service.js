import mongoose from 'mongoose';

import Incident from '../models/incident.model.js';
import Vote from '../models/vote.model.js';

import uploadService from './upload.service.js';
import voteService from './vote.service.js';
import appSettingsService from './app-settings.service.js';
import { votedIncidentVisibilityMatch } from '../utils/security.js';
import {
  enqueueMediaDeletion,
  processPendingMediaDeletions,
} from './media-deletion.service.js';

import { ServiceError } from '../errors/service.error.js';

export function presentIncident(incident, user) {
  const result = { ...incident };
  const isPrivileged = ['admin', 'moderator'].includes(user?.role);

  if (!isPrivileged) {
    const creatorId = result.createdBy?._id || result.createdBy;
    result.isOwner = Boolean(
      user?.id &&
      creatorId &&
      user.id === creatorId.toString()
    );
    delete result.createdBy;
  }

  return result;
}

async function cleanupUploadedImages(images, originalError, message) {
  const publicIds = images.map((image) => image.publicId).filter(Boolean);
  if (!publicIds.length) return;

  try {
    await uploadService.deleteImages(publicIds);
  } catch (cleanupError) {
    try {
      await enqueueMediaDeletion(publicIds);
    } catch (queueError) {
      throw new AggregateError([originalError, cleanupError, queueError], message);
    }
    throw new AggregateError([originalError, cleanupError], message);
  }
}

/**
 * Crea una incidencia.
 */
async function createIncident({
  title,
  description,
  category,
  locationInput,
  files,
  user,
}) {
  if (!locationInput) {
    throw new ServiceError(
      'La ubicación es obligatoria',
      400
    );
  }

  let coordinates;

  if (Array.isArray(locationInput.coordinates)) {
    coordinates = locationInput.coordinates;
  } else if (
    locationInput.lat != null &&
    locationInput.lng != null
  ) {
    coordinates = [
      Number(locationInput.lng),
      Number(locationInput.lat),
    ];
  } else {
    throw new ServiceError(
      'Formato de ubicación inválido',
      400
    );
  }

  const images =
    files && files.length
      ? await uploadService.uploadIncidentImages(files)
      : [];

  let incident;
  try {
    incident = await Incident.create({
      title,
      description,
      category,
      location: {
        type: 'Point',
        coordinates,
        address: locationInput.address || null,
      },
      images,
      createdBy: user.id,
    });
  } catch (error) {
    await cleanupUploadedImages(
      images,
      error,
      'No se pudo guardar la incidencia ni limpiar las imágenes subidas'
    );
    throw error;
  }

  return presentIncident(incident.toObject(), user);
}

/**
 * Lista incidencias.
 */
async function listIncidents({
  status,
  category,
  createdBy,
  near,
  page = 1,
  limit = 20,
  sortBy = 'recent',
  user,
}) {
  const { votingEnabled } = await appSettingsService.getSettings();
  const baseQuery = {};

  const isPrivileged = user && ['admin', 'moderator'].includes(user.role);
  const isSelfListing = createdBy && user && user.id === createdBy.toString();

  const selectedStatuses = Array.isArray(status) ? status : status ? [status] : [];
  const selectedCategories = Array.isArray(category) ? category : category ? [category] : [];

  if (isPrivileged || isSelfListing) {
    if (selectedStatuses.length) {
      baseQuery.status = { $in: selectedStatuses };
    }
  } else {
    // Para usuarios públicos o estándar, solo se muestran los estados pendientes y resueltas
    const publicStatuses = selectedStatuses.filter((value) => ['pendiente', 'resuelta'].includes(value));
    if (publicStatuses.length) {
      baseQuery.status = { $in: publicStatuses };
    } else {
      baseQuery.status = { $in: ['pendiente', 'resuelta'] };
    }
  }

  if (selectedCategories.length) {
    baseQuery.category = { $in: selectedCategories };
  }

  if (createdBy) {
    baseQuery.createdBy = createdBy;
  }

  const findQuery = { ...baseQuery };

  // Búsqueda geográfica.
  if (
    near &&
    near.lng != null &&
    near.lat != null
  ) {
    findQuery.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [
            Number(near.lng),
            Number(near.lat),
          ],
        },
        $maxDistance:
          Number(near.maxDistanceMeters) || 5000,
      },
    };
  }

  // Si estamos buscando por cercanía,
  // MongoDB ordena por distancia.
  //
  // En caso contrario utilizamos el criterio solicitado.
  let findOperation = Incident.find(findQuery);

  if (!near) {
    const sort =
      votingEnabled && sortBy === 'popular'
        ? {
            votesCount: -1,
            createdAt: -1,
          }
        : {
            createdAt: -1,
          };

    findOperation = findOperation.sort(sort);
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    findOperation
      .populate(
        'createdBy',
        'name avatarUrl'
      )
      .skip(skip)
      .limit(limit)
      .lean(),

    Incident.countDocuments(baseQuery),
  ]);

  let votedIds = new Set();
  const userId = user?.id;

  if (votingEnabled && userId && items.length) {
    votedIds =
      await voteService.getVotedIncidentIds(
        userId,
        items.map((item) => item._id)
      );
  }

  const enriched = items.map((incident) => {
    const { votesCount, ...incidentData } = incident;
    return presentIncident({
      ...incidentData,
      ...(votingEnabled && {
        votesCount,
        hasVoted: votedIds.has(incident._id.toString()),
      }),
    }, user);
  });

  return {
    items: enriched,

    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(
        total / limit
      ),
    },
  };
}

/**
 * Obtiene una incidencia concreta.
 */
async function getIncidentById(
  incidentId,
  user
) {
  const { votingEnabled } = await appSettingsService.getSettings();
  const incident = await Incident.findById(
    incidentId
  )
    .populate(
      'createdBy',
      'name avatarUrl'
    )
    .lean();

  if (!incident) {
    throw new ServiceError(
      'Incidencia no encontrada',
      404
    );
  }

  const isPrivileged = user && ['admin', 'moderator'].includes(user.role);
  const creatorId = incident.createdBy?._id || incident.createdBy;
  const isOwner = Boolean(user && creatorId && user.id === creatorId.toString());

  // Si la incidencia está en estado 'en_revision' o 'rechazada', solo el autor o un admin/moderador pueden verla.
  if (['en_revision', 'rechazada'].includes(incident.status) && !isOwner && !isPrivileged) {
    throw new ServiceError(
      'Esta incidencia está en revisión o no está publicada',
      403
    );
  }

  const userId = user?.id;
  const hasVoted = votingEnabled && userId
    ? await voteService.hasVoted(
        userId,
        incidentId
      )
    : false;

  const { votesCount, ...incidentData } = incident;
  return presentIncident({
    ...incidentData,
    ...(votingEnabled && { votesCount, hasVoted }),
  }, user);
}

/**
 * Cambia el estado de una incidencia.
 */
async function updateStatus(
  incidentId,
  status,
  requestingUser
) {
  const existing = await Incident.findById(incidentId);

  if (!existing) {
    throw new ServiceError(
      'Incidencia no encontrada',
      404
    );
  }

  const isModerator = requestingUser?.role === 'moderator';

  if (isModerator) {
    if (existing.status !== 'en_revision' || !['pendiente', 'rechazada'].includes(status)) {
      throw new ServiceError(
        'Los moderadores solo pueden decidir si una incidencia en revisión queda pendiente o se rechaza',
        403
      );
    }
  }

  existing.status = status;
  await existing.save();

  return existing;
}

/**
 * Actualiza el contenido de una incidencia. Solo los administradores pueden hacerlo.
 */
async function updateIncident(incidentId, updates, files = [], requestingUser) {
  if (requestingUser?.role !== 'admin') {
    throw new ServiceError('Solo los administradores pueden editar incidencias', 403);
  }

  const incident = await Incident.findById(incidentId);

  if (!incident) {
    throw new ServiceError('Incidencia no encontrada', 404);
  }

  if (incident.images.length + files.length > 5) {
    throw new ServiceError('Cada incidencia puede tener como máximo 5 fotos', 400);
  }

  if (updates.title !== undefined) incident.title = updates.title;
  if (updates.description !== undefined) incident.description = updates.description;
  if (updates.category !== undefined) incident.category = updates.category;
  if (updates.address !== undefined) incident.location.address = updates.address || null;

  const newImages = files.length
    ? await uploadService.uploadIncidentImages(files)
    : [];

  try {
    incident.images.push(...newImages);
    await incident.save();
  } catch (error) {
    await cleanupUploadedImages(
      newImages,
      error,
      'No se pudo guardar la incidencia ni limpiar las imágenes nuevas'
    );
    throw error;
  }

  const updated = await Incident.findById(incidentId)
    .populate('createdBy', 'name avatarUrl')
    .lean();
  return presentIncident(updated, requestingUser);
}

/**
 * Elimina una incidencia.
 */
async function deleteIncident(
  incidentId,
  requestingUser
) {
  if (requestingUser.role === 'moderator') {
    throw new ServiceError(
      'Los moderadores no pueden borrar incidencias',
      403
    );
  }

  const incident =
    await Incident.findById(incidentId);

  if (!incident) {
    throw new ServiceError(
      'Incidencia no encontrada',
      404
    );
  }

  const isOwner =
    incident.createdBy.toString() ===
    requestingUser.id;

  const isPrivileged = requestingUser.role === 'admin';

  if (!isOwner && !isPrivileged) {
    throw new ServiceError(
      'No tienes permiso para borrar esta incidencia',
      403
    );
  }

  const session =
    await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Vote.deleteMany({ incident: incidentId }, { session });
      await Incident.deleteOne({ _id: incidentId }, { session });
      await enqueueMediaDeletion(
        (incident.images || []).map((image) => image.publicId),
        session
      );
    });
  } finally {
    await session.endSession();
  }

  await processPendingMediaDeletions();

  return {
    deleted: true,
  };
}

/**
 * Obtiene las incidencias a las que un usuario ha votado.
 */
async function listVotedIncidents({ userId, user, page = 1, limit = 20 }) {
  await appSettingsService.requireVotingEnabled();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const visibilityMatch = votedIncidentVisibilityMatch(userObjectId, user?.role);
  const visibilityStages = visibilityMatch ? [{ $match: visibilityMatch }] : [];
  const [result] = await Vote.aggregate([
    { $match: { user: userObjectId } },
    {
      $lookup: {
        from: Incident.collection.name,
        localField: 'incident',
        foreignField: '_id',
        as: 'incident',
      },
    },
    { $unwind: '$incident' },
    ...visibilityStages,
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $replaceRoot: { newRoot: '$incident' } },
        ],
      },
    },
  ]);
  const total = result?.metadata[0]?.total || 0;
  const items = await Incident.populate(result?.items || [], {
    path: 'createdBy',
    select: 'name avatarUrl',
  });
  const orderedItems = items.map((incident) => presentIncident({
    ...incident,
    hasVoted: true,
  }, user));

  return {
    items: orderedItems,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default {
  createIncident,
  listIncidents,
  getIncidentById,
  updateStatus,
  updateIncident,
  deleteIncident,
  listVotedIncidents,
};