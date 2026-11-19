import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { isSessionActive } from '../services/session.service.js';
import { SESSION_COOKIE_NAME, sessionVersionMatches } from '../utils/security.js';

function getSessionToken(req) {
  return req.cookies?.[SESSION_COOKIE_NAME];
}

/**
 * Protege una ruta: exige un JWT válido en la cookie de sesión.
 * Si es correcto, deja el usuario autenticado en req.user (id + role).
 *
 * Espera la cookie brigada_session.
 * Espera variable de entorno: JWT_SECRET
 */
export async function protect(req, res, next) {
  try {
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({
        message: 'No autenticado',
        code: 'SESSION_INVALID',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'El token ha expirado',
          code: 'SESSION_EXPIRED',
        });
      }
      return res.status(401).json({
        message: 'Token inválido',
        code: 'SESSION_INVALID',
      });
    }

    // Comprobamos que el usuario todavía existe y está activo
    // (por si se borró la cuenta o se desactivó después de emitir el token)
    const [user, activeSession] = await Promise.all([
      User.findById(decoded.id).select('_id role isActive +tokenVersion'),
      isSessionActive(decoded),
    ]);
    if (
      !user ||
      !user.isActive ||
      !activeSession ||
      !sessionVersionMatches(decoded.tokenVersion, user.tokenVersion || 0)
    ) {
      return res.status(401).json({
        message: 'Usuario no válido o inactivo',
        code: 'SESSION_INVALID',
      });
    }

    req.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Restringe una ruta a ciertos roles. Debe usarse SIEMPRE después de `protect`.
 * Ejemplo: router.delete('/:id', protect, restrictTo('admin'), ...)
 */
export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permiso para esta acción' });
    }
    return next();
  };
}

/**
 * Igual que `protect`, pero NO bloquea si no hay token: simplemente sigue
 * con req.user = undefined. Pensado para rutas públicas (ej. listar
 * incidencias) que quieren saber "¿este usuario ya votó esto?" si está
 * logueado, pero deben seguir funcionando para visitantes anónimos.
 */
export async function attachUserIfPresent(req, res, next) {
  try {
    const token = getSessionToken(req);
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return next(); // token inválido/expirado -> seguimos como anónimo, sin romper la petición
    }

    const [user, activeSession] = await Promise.all([
      User.findById(decoded.id).select('_id role isActive +tokenVersion'),
      isSessionActive(decoded),
    ]);
    if (
      user &&
      user.isActive &&
      activeSession &&
      sessionVersionMatches(decoded.tokenVersion, user.tokenVersion || 0)
    ) {
      req.user = { id: user._id.toString(), role: user.role };
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

export default {
  protect,
  restrictTo,
  attachUserIfPresent,
};
