import incidentService from "../services/incident.service.js";

/**
 * POST /api/incidents
 * multipart/form-data: title, description, category, lat, lng, address, images[]
 * (el parseo de "images" lo hace upload.middleware.js antes de llegar aquí)
 */
async function create(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      lat,
      lng,
      address,
    } = req.validated.body;

    const incident = await incidentService.createIncident({
      title,
      description,
      category,
      locationInput: { lat, lng, address },
      files: req.files,
      userId: req.user.id,
    });

    return res.status(201).json(incident);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
}

/**
 * GET /api/incidents
 * query: status, category, createdBy, lat, lng, maxDistanceMeters,
 *        page, limit, sortBy=recent|popular
 * userId (para hasVoted) se saca de req.user si la ruta está protegida,
 * o queda undefined si es pública.
 */
async function list(req, res, next) {
  try {
    const {
      status,
      category,
      createdBy,
      lat,
      lng,
      maxDistanceMeters,
      page,
      limit,
      sortBy,
    } = req.validated.query;

    const result = await incidentService.listIncidents({
      status,
      category,
      createdBy,
      near: lat != null && lng != null
        ? { lat, lng, maxDistanceMeters }
        : null,
      page,
      limit,
      sortBy,
      userId: req.user?.id,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/incidents/:id
 */
async function getById(req, res, next) {
  try {
    const incident = await incidentService.getIncidentById(
      req.validated.params.id,
      req.user?.id
    );

    return res.status(200).json(incident);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        message: err.message,
      });
    }

    return next(err);
  }
}

/**
 * PATCH /api/incidents/:id/status
 * body: { status }  — restringido a moderator/admin vía restrictTo en la ruta
 */
async function updateStatus(req, res, next) {
  try {
    const { status } = req.validated.body;

    const incident = await incidentService.updateStatus(
      req.validated.params.id,
      status
    );

    return res.status(200).json(incident);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        message: err.message,
      });
    }

    return next(err);
  }
}

/**
 * DELETE /api/incidents/:id
 */
async function remove(req, res, next) {
  try {
    const result = await incidentService.deleteIncident(
      req.validated.params.id,
      req.user
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
}

export default {
  create,
  list,
  getById,
  updateStatus,
  remove,
};