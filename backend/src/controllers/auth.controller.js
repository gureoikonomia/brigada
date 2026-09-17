import authService from '../services/auth.service.js';

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const {
      name,
      email,
      password,
    } = req.validated.body;

    const result = await authService.register({
      name,
      email,
      password,
    });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const {
      email,
      password,
    } = req.validated.body;

    const result = await authService.login({
      email,
      password,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res, next) {
  try {
    const profile = await authService.getProfile(
      req.user.id
    );

    return res.status(200).json(profile);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/auth/me
 * body: { name?, email? } — ya validado por Zod (updateProfileSchema)
 */
async function updateProfile(req, res, next) {
  try {
    const updated = await authService.updateProfile(req.user.id, req.body);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
}

/**
 * PATCH /api/auth/me/password
 * body: { currentPassword, newPassword }
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, { currentPassword, newPassword });
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
}

export default {
  register,
  login,
  me,
  updateProfile,
  changePassword,
};