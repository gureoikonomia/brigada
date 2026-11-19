import { randomBytes } from 'node:crypto';
import { authService } from '../services/auth.service.js';
import { refreshSessionToken, revokeSessionToken } from '../services/session.service.js';
import { userService } from '../services/user.service.js';
import {
  clearAuthCookies,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  cookieOptions,
  refreshCookieOptions,
} from '../utils/security.js';

const isProduction = process.env.NODE_ENV === 'production';

function setSessionCookies(res, session) {
  res.set('Cache-Control', 'no-store');
  res.cookie(
    SESSION_COOKIE_NAME,
    session.accessToken,
    cookieOptions(isProduction, session.accessMaxAge),
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    session.refreshToken,
    refreshCookieOptions(isProduction, session.refreshMaxAge),
  );
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
    const { name, email, password, ageConfirmed } = req.validated.body;

    const result = await authService.register({
      name,
      email,
      password,
      ageConfirmed,
    });

    if (result.accessToken && result.refreshToken) setSessionCookies(res, result);
    const {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
      accessMaxAge: _accessMaxAge,
      refreshMaxAge: _refreshMaxAge,
      ...response
    } = result;
    return res.status(202).json(response);
  } catch (err) {
    return next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const result = await authService.resendVerification(req.validated.body.email);
    return res.status(202).json(result);
  } catch (err) {
    return next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const result = await authService.verifyEmail(req.validated.body);
    if (result.emailChanged) {
      clearAuthCookies(res, isProduction);
    }
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const result = await userService.deleteAccount(req.user.id, req.validated.body.currentPassword);
    clearAuthCookies(res, isProduction);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.validated.body;

    const result = await authService.login({
      email,
      password,
      userAgent: req.get('User-Agent'),
    });

    setSessionCookies(res, result);
    const {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
      accessMaxAge: _accessMaxAge,
      refreshMaxAge: _refreshMaxAge,
      ...response
    } = result;
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
    const profile = await authService.getProfile(req.user.id);

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
    return next(err);
  }
}

async function requestEmailChange(req, res, next) {
  try {
    const result = await authService.requestEmailChange(req.user.id, req.validated.body);
    return res.status(202).json(result);
  } catch (err) {
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
    clearAuthCookies(res, isProduction);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await refreshSessionToken(
      req.cookies?.[REFRESH_COOKIE_NAME],
      req.get('User-Agent'),
    );
    res.set('Cache-Control', 'no-store');
    res.cookie(
      SESSION_COOKIE_NAME,
      result.accessToken,
      cookieOptions(isProduction, result.accessMaxAge),
    );
    if (result.refreshToken) {
      res.cookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        refreshCookieOptions(isProduction, result.refreshMaxAge),
      );
    }
    return res.status(200).json({ refreshed: true });
  } catch (error) {
    if (error.statusCode === 401 && error.code === 'SESSION_INVALID') {
      clearAuthCookies(res, isProduction);
      res.set('Cache-Control', 'no-store');
      return res.status(401).json({
        message: error.message,
        code: 'SESSION_INVALID',
      });
    }
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    await revokeSessionToken(
      req.cookies?.[SESSION_COOKIE_NAME],
      req.cookies?.[REFRESH_COOKIE_NAME],
    );
  } catch (err) {
    clearAuthCookies(res, isProduction);
    return next(err);
  }

  clearAuthCookies(res, isProduction);
  return res.status(204).end();
}

export {
  csrf,
  register,
  resendVerification,
  verifyEmail,
  deleteAccount,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  requestEmailChange,
  updateAvatar,
  changePassword,
};
