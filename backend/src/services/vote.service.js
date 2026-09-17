import mongoose from 'mongoose';

import Vote from '../models/vote.model.js';
import Incident from '../models/incident.model.js';

import { ServiceError } from '../errors/service.error.js';

/**
 * Emite un voto.
 */
async function castVote(
  userId,
  incidentId
) {
  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const incident =
      await Incident.findById(
        incidentId
      ).session(session);

    if (!incident) {
      throw new ServiceError(
        'Incidencia no encontrada',
        404
      );
    }

    await Vote.create(
      [
        {
          incident: incidentId,
          user: userId,
        },
      ],
      { session }
    );

    await Incident.updateOne(
      {
        _id: incidentId,
      },
      {
        $inc: {
          votesCount: 1,
        },
      },
      { session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();

    if (err.code === 11000) {
      throw new ServiceError(
        'Ya has votado esta incidencia',
        409
      );
    }

    throw err;
  } finally {
    await session.endSession();
  }

  return {
    incidentId,
    userId,
    voted: true,
  };
}

/**
 * Retira un voto.
 */
async function removeVote(
  userId,
  incidentId
) {
  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const deleted =
      await Vote.findOneAndDelete(
        {
          incident: incidentId,
          user: userId,
        },
        { session }
      );

    if (!deleted) {
      throw new ServiceError(
        'No habías votado esta incidencia',
        404
      );
    }

    const updated =
      await Incident.updateOne(
        {
          _id: incidentId,
          votesCount: {
            $gt: 0,
          },
        },
        {
          $inc: {
            votesCount: -1,
          },
        },
        { session }
      );

    if (
      updated.matchedCount === 0
    ) {
      throw new ServiceError(
        'Incidencia no encontrada',
        404
      );
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  return {
    incidentId,
    userId,
    voted: false,
  };
}

/**
 * Comprueba si un usuario ha votado.
 */
async function hasVoted(
  userId,
  incidentId
) {
  const vote =
    await Vote.findOne({
      incident: incidentId,
      user: userId,
    }).lean();

  return Boolean(vote);
}

/**
 * Obtiene las incidencias votadas por un usuario
 * dentro de una lista concreta.
 */
async function getVotedIncidentIds(
  userId,
  incidentIds
) {
  const votes =
    await Vote.find({
      user: userId,
      incident: {
        $in: incidentIds,
      },
    })
      .select('incident')
      .lean();

  return new Set(
    votes.map((vote) =>
      vote.incident.toString()
    )
  );
}

export default {
  castVote,
  removeVote,
  hasVoted,
  getVotedIncidentIds,
};