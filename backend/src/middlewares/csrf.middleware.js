import { CSRF_COOKIE_NAME, csrfTokenMatches } from '../utils/security.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PREAUTH_JSON_ROUTES = new Set([
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/resend-verification',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]);

export function csrfProtection(allowedOrigins) {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get('Origin');
    if (!origin || !allowedOrigins.has(origin)) {
      return res.status(403).json({
        code: 'CSRF_INVALID',
        message: 'Solicitud no válida',
      });
    }

    if (req.method === 'POST' && PREAUTH_JSON_ROUTES.has(req.path)) {
      if (!req.is('application/json')) {
        return res.status(415).json({
          message: 'Esta operación requiere Content-Type application/json',
        });
      }
      return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.get('X-CSRF-Token');

    if (!csrfTokenMatches(cookieToken, headerToken)) {
      return res.status(403).json({
        code: 'CSRF_INVALID',
        message: 'Solicitud no válida',
      });
    }

    return next();
  };
}
