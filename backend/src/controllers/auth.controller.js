import { randomBytes } from 'node:crypto';
import authService from '../services/auth.service.js';
import { revokeSessionToken } from '../services/session.service.js';
import userService from '../services/user.service.js';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  cookieOptions,
} from '../utils/security.js';

const isProduction = process.env.NODE_ENV === 'production';

function setSessionCookie(res, token) {
  res.set('Cache-Control', 'no-store');
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions(isProduction));
}

function clearSessionCookies(res) {
  const options = cookieOptions(isProduction);
  res.clearCookie(SESSION_COOKIE_NAME, options);
  res.clearCookie(CSRF_COOKIE_NAME, options);
}

function csrf(req, res) {
  const token = randomBytes(32).toString('hex');
  res.set('Cache-Control', 'no-store');
  res.cookie(CSRF_COOKIE_NAME, token, cookieOptions(isProduction));
  return res.json({ csrfToken: token });
}

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      privacyNoticeAcknowledged,
      privacyNoticeVersion,
    } = req.validated.body;

    const result = await authService.register({
      name,
      email,
      password,
      privacyNoticeAcknowledged,
      privacyNoticeVersion,
    });

    if (result.token) setSessionCookie(res, result.token);
    const { token, ...response } = result;
    return res.status(result.token ? 201 : 202).json(response);
  } catch (err) {
    return next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const result = await authService.resendVerification(
      req.validated.body.email
    );
    return res.status(202).json(result);
  } catch (err) {
    return next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const result = await authService.verifyEmail(req.validated.body);
    if (result.emailChanged) {
      res.clearCookie(SESSION_COOKIE_NAME, cookieOptions(isProduction));
    }
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const result = await userService.deleteAccount(
      req.user.id,
      req.validated.body.currentPassword
    );
    clearSessionCookies(res);
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
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

    setSessionCookie(res, result.token);
    const { token, ...response } = result;
    return res.status(200).json(response);
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
 * body: { name } — ya validado por Zod (updateProfileSchema)
 */
async function updateProfile(req, res, next) {
  try {
    const updated = await authService.updateProfile(req.user.id, req.validated.body);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
}

async function requestEmailChange(req, res, next) {
  try {
    const result = await authService.requestEmailChange(req.user.id, req.validated.body);
    return res.status(202).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
}

/**
 * PATCH /api/auth/me/avatar
 * multipart/form-data: avatar
 */
async function updateAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Selecciona una imagen de perfil' });
    }

    const updated = await authService.updateAvatar(req.user.id, req.file);
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
    const { currentPassword, newPassword } = req.validated.body;
    const result = await authService.changePassword(req.user.id, { currentPassword, newPassword });
    clearSessionCookies(res);
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    await revokeSessionToken(req.cookies?.[SESSION_COOKIE_NAME]);
  } catch (err) {
    clearSessionCookies(res);
    return next(err);
  }

  clearSessionCookies(res);
  return res.status(204).end();
}

export default {
  csrf,
  register,
  resendVerification,
  verifyEmail,
  deleteAccount,
  login,
  logout,
  me,
  updateProfile,
  requestEmailChange,
  updateAvatar,
  changePassword,
};