import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import User from '../models/user.model.js';
import PasswordResetToken from '../models/passwordResetToken.model.js';
import { sendResetEmail, sendPasswordChangedNotification } from '../utils/email.js';
import { isPasswordStrong } from '../utils/validation.js';

const router = express.Router();

// Rate limiter específico para rutas de recuperación de contraseña
// (5 intentos por IP en 15 minutos)
const resetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, prueba más tarde' },
});

/**
 * POST /api/auth/forgot-password
 * Recibe un email y, si existe, envía un enlace de recuperación.
 * Siempre responde igual para no revelar si el email existe (anti-enumeration).
 */
router.post('/forgot-password', resetRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'El email es obligatorio' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // Generar token aleatorio seguro y guardarlo hasheado
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

      // Borrar tokens anteriores de este usuario (solo uno válido a la vez)
      await PasswordResetToken.deleteMany({ userId: user._id });

      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        expiresAt,
      });

      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/recuperar-contrasena?token=${rawToken}&uid=${user._id}`;
      try {
        await sendResetEmail(user.email, resetLink);
      } catch (emailError) {
        console.error('No se pudo enviar el email de recuperación:', emailError);
      }
    }

    // Siempre la misma respuesta (no revela si el email existe)
    return res.json({
      message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.',
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Valida el token y actualiza la contraseña del usuario.
 */
router.post('/reset-password', resetRateLimiter, async (req, res, next) => {
  try {
    const { uid, token, newPassword } = req.body;

    if (!uid || !token || !newPassword || typeof newPassword !== 'string' || newPassword.length > 72) {
      return res.status(400).json({ message: 'Faltan parámetros obligatorios' });
    }

    if (!mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({ message: 'Enlace inválido o expirado' });
    }

    // Buscar token activo (no usado y no expirado)
    const record = await PasswordResetToken.findOne({
      userId: uid,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({ message: 'Enlace inválido o expirado' });
    }

    // Comparar el token enviado con el hash guardado
    const isValid = await bcrypt.compare(token, record.tokenHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Enlace inválido o expirado' });
    }

    // Validar fortaleza de la nueva contraseña
    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
      });
    }

    // Reclamar el token de forma atómica para impedir dos resets simultáneos.
    const claimedToken = await PasswordResetToken.findOneAndUpdate(
      { _id: record._id, usedAt: null, expiresAt: { $gt: new Date() } },
      { usedAt: new Date() },
      { new: true }
    );

    if (!claimedToken) {
      return res.status(400).json({ message: 'Enlace inválido o expirado' });
    }

    // Actualizar contraseña (el hash se guarda directamente, sin pasar por el hook de Mongoose)
    const newHash = await bcrypt.hash(newPassword, 12);
    const user = await User.findByIdAndUpdate(uid, { password: newHash }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // El token ya quedó invalidado al reclamarlo; el TTL limpiará el registro.

    // Notificar al usuario por email
    try {
      await sendPasswordChangedNotification(user.email);
    } catch (emailError) {
      console.error('No se pudo enviar la notificación de cambio de contraseña:', emailError);
    }

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    return next(err);
  }
});

export default router;