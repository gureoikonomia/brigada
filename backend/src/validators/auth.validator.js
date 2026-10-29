import { z } from 'zod';
import { isPasswordStrong } from '../utils/validation.js';

const strongPassword = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'La contraseña no puede superar 72 bytes UTF-8',
  })
  .refine(isPasswordStrong, {
    message: 'La contraseña debe incluir mayúscula, minúscula y número',
  });

const emailAddress = z.string().trim().toLowerCase().email('Email no válido').max(254);
const currentPassword = z
  .string()
  .min(1, 'La contraseña actual es obligatoria')
  .max(72)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'La contraseña no puede superar 72 bytes UTF-8',
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: emailAddress,
  password: strongPassword,
  privacyNoticeAcknowledged: z.boolean().optional(),
  privacyNoticeVersion: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: emailAddress,
  password: z.string().min(1, 'La contraseña es obligatoria').max(72)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'La contraseña no puede superar 72 bytes UTF-8',
    }),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80).optional(),
  })
  .refine((data) => data.name !== undefined, {
    message: 'Debes indicar un nombre para actualizar',
  });

export const requestEmailChangeSchema = z.object({
  email: emailAddress,
  currentPassword,
});

export const changePasswordSchema = z
  .object({
    currentPassword,
    newPassword: strongPassword,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailAddress,
});

export const resetPasswordSchema = z.object({
  uid: z.string().regex(/^[0-9a-f]{24}$/i, 'Enlace inválido o expirado'),
  token: z.string().regex(/^[0-9a-f]{64}$/i, 'Enlace inválido o expirado'),
  newPassword: strongPassword,
});

export const verifyEmailSchema = z.object({
  uid: z.string().regex(/^[0-9a-f]{24}$/i, 'Enlace inválido o expirado'),
  token: z.string().regex(/^[0-9a-f]{64}$/i, 'Enlace inválido o expirado'),
});

export const resendVerificationSchema = z.object({
  email: emailAddress,
});

export const deleteAccountSchema = z.object({
  currentPassword,
});
