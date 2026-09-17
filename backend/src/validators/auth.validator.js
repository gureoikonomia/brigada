import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().trim().toLowerCase().email('Email no válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

// Todos los campos opcionales: se puede mandar solo el que se quiera cambiar.
// .refine() exige que llegue al menos uno, para no permitir un PATCH vacío.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80).optional(),
    email: z.string().trim().toLowerCase().email('Email no válido').optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'Debes indicar al menos un campo a actualizar (name o email)',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres').max(72),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  });
