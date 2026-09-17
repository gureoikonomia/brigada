import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * Protege una ruta: exige un JWT válido en el header Authorization.
 * Si es correcto, deja el usuario autenticado en req.user (id + role).
 *
 * Espera header: Authorization: Bearer <token>
 * Espera variable de entorno: JWT_SECRET
 */
export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No autenticado: falta el token' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError' ? 'El token ha expirado' : 'Token inválido';
      return res.status(401).json({ message });
    }

    // Comprobamos que el usuario todavía existe y está activo
    // (por si se borró la cuenta o se desactivó después de emitir el token)
    const user = await User.findById(decoded.id).select('_id role isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuario no válido o inactivo' });
    }

    req.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Restringe una ruta a ciertos roles. Debe usarse SIEMPRE después de `protect`.
 * Ejemplo: router.delete('/:id', protect, restrictTo('admin', 'moderator'), ...)
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(); // token inválido/expirado -> seguimos como anónimo, sin romper la petición
    }

    const user = await User.findById(decoded.id).select('_id role isActive');
    if (user && user.isActive) {
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