import { passwordResetService } from '../services/password-reset.service.js';
import { SESSION_COOKIE_NAME, cookieOptions } from '../utils/security.js';

const isProduction = process.env.NODE_ENV === 'production';

async function requestPasswordReset(req, res) {
  void passwordResetService.requestPasswordReset(req.validated.body.email);
  return res.json({
    message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.',
  });
}

async function resetPassword(req, res, next) {
  try {
    await passwordResetService.resetPassword(req.validated.body);
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions(isProduction));
    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    return next(error);
  }
}

export const authResetController = {
  requestPasswordReset,
  resetPassword,
};
