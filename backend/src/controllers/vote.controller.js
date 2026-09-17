import voteService from '../services/vote.service.js';

/**
 * POST /api/incidents/:incidentId/vote
 */
async function vote(req, res, next) {
  try {
    const { incidentId } = req.validated.params;

    const result = await voteService.castVote(
      req.user.id,
      incidentId
    );

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/incidents/:incidentId/vote
 */
async function unvote(req, res, next) {
  try {
    const { incidentId } = req.validated.params;

    const result = await voteService.removeVote(
      req.user.id,
      incidentId
    );

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/incidents/:incidentId/vote
 */
async function getVoteStatus(req, res, next) {
  try {
    const { incidentId } = req.validated.params;

    const voted = await voteService.hasVoted(
      req.user.id,
      incidentId
    );

    return res.status(200).json({ voted });
  } catch (err) {
    return next(err);
  }
}

export default {
  vote,
  unvote,
  getVoteStatus,
};