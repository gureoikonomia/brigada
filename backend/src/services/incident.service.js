import mongoose from 'mongoose';

import Incident from '../models/incident.model.js';
import Vote from '../models/vote.model.js';

import uploadService from './upload.service.js';
import voteService from './vote.service.js';

import { ServiceError } from '../errors/service.error.js';

/**
 * Crea una incidencia.
 */
async function createIncident({
  title,
  description,
  category,
  locationInput,
  files,
  userId,
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

  const incident = await Incident.create({
    title,
    description,
    category,
    location: {
      type: 'Point',
      coordinates,
      address: locationInput.address || null,
    },
    images,
    createdBy: userId,
  });

  return incident;
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
  const baseQuery = {};

  const isPrivileged = user && ['admin', 'moderator'].includes(user.role);
  const isSelfListing = createdBy && user && user.id === createdBy.toString();

  if (isPrivileged || isSelfListing) {
    if (status) {
      baseQuery.status = status;
    }
  } else {
    // Para usuarios públicos o estándar, solo se muestran los estados pendientes y resueltas
    if (status === 'pendiente' || status === 'resuelta') {
      baseQuery.status = status;
    } else {
      baseQuery.status = { $in: ['pendiente', 'resuelta'] };
    }
  }

  if (category) {
    baseQuery.category = category;
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
      sortBy === 'popular'
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

  if (userId && items.length) {
    votedIds =
      await voteService.getVotedIncidentIds(
        userId,
        items.map((item) => item._id)
      );
  }

  const enriched = items.map((incident) => ({
    ...incident,

    hasVoted: votedIds.has(
      incident._id.toString()
    ),
  }));

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
  const isOwner = user && user.id === incident.createdBy._id.toString();

  // Si la incidencia está en estado 'en_revision' o 'rechazada', solo el autor o un admin/moderador pueden verla.
  if (['en_revision', 'rechazada'].includes(incident.status) && !isOwner && !isPrivileged) {
    throw new ServiceError(
      'Esta incidencia está en revisión o no está publicada',
      403
    );
  }

  const userId = user?.id;
  const hasVoted = userId
    ? await voteService.hasVoted(
        userId,
        incidentId
      )
    : false;

  return {
    ...incident,
    hasVoted,
  };
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
    // Si la incidencia está en 'en_revision', el moderador solo puede cambiarla a 'pendiente' o 'rechazada'
    if (existing.status === 'en_revision') {
      if (!['pendiente', 'rechazada'].includes(status)) {
        throw new ServiceError(
          'Los moderadores solo pueden cambiar el estado de incidencias En Revisión a Pendiente o Rechazada',
          403
        );
      }
    } else if (existing.status === 'pendiente') {
      if (!['en_revision', 'rechazada'].includes(status)) {
        throw new ServiceError(
          'Los moderadores solo pueden cambiar incidencias Pendientes a En Revisión o Rechazada',
          403
        );
      }
    } else {
      throw new ServiceError(
        'Los moderadores solo pueden moderar incidencias en revisión o pendientes',
        403
      );
    }
  }

  existing.status = status;
  await existing.save();

  return existing;
}

/**
 * Elimina una incidencia.
 */
async function deleteIncident(
  incidentId,
  requestingUser
) {
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

  const isPrivileged =
    ['admin', 'moderator'].includes(
      requestingUser.role
    );

  if (!isOwner && !isPrivileged) {
    throw new ServiceError(
      'No tienes permiso para borrar esta incidencia',
      403
    );
  }

  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    await Vote.deleteMany(
      {
        incident: incidentId,
      },
      { session }
    );

    await Incident.deleteOne(
      {
        _id: incidentId,
      },
      { session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  const publicIds = (
    incident.images || []
  )
    .map((image) => image.publicId)
    .filter(Boolean);

  if (publicIds.length) {
    await uploadService.deleteImages(
      publicIds
    );
  }

  return {
    deleted: true,
  };
}

/**
 * Obtiene las incidencias a las que un usuario ha votado.
 */
async function listVotedIncidents({ userId, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const [votes, total] = await Promise.all([
    Vote.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('incident')
      .lean(),
    Vote.countDocuments({ user: userId }),
  ]);

  const incidentIds = votes.map((v) => v.incident);
  if (!incidentIds.length) {
    return {
      items: [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        totalPages: 0,
      },
    };
  }

  const items = await Incident.find({ _id: { $in: incidentIds } })
    .populate('createdBy', 'name avatarUrl')
    .lean();

  const itemsMap = new Map(items.map((i) => [i._id.toString(), i]));
  const orderedItems = incidentIds
    .map((id) => itemsMap.get(id.toString()))
    .filter(Boolean)
    .map((incident) => ({
      ...incident,
      hasVoted: true,
    }));

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
  deleteIncident,
  listVotedIncidents,
};