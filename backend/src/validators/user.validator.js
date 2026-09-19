import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['user', 'moderator', 'admin']).optional(),
  search: z.string().trim().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin'], {
    required_error: 'El rol es obligatorio',
  }),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'El estado isActive es obligatorio',
  }),
});
