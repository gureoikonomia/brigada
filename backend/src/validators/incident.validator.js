import { z } from 'zod';

const CATEGORIES = [
  'infraestructura',
  'seguridad',
  'limpieza',
  'ruido',
  'trafico',
  'otros',
];

const STATUSES = [
  'pendiente',
  'en_revision',
  'resuelta',
  'rechazada',
];

// POST /api/incidents
// req.body llega de multipart/form-data,
// por lo que lat y lng llegan como strings.
export const createIncidentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(150, 'El título no puede superar los 150 caracteres'),

  description: z
    .string()
    .trim()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(3000, 'La descripción no puede superar los 3000 caracteres'),

  category: z
    .enum(CATEGORIES)
    .optional()
    .default('otros'),

  lat: z
    .coerce
    .number()
    .min(-90, 'Latitud no válida')
    .max(90, 'Latitud no válida'),

  lng: z
    .coerce
    .number()
    .min(-180, 'Longitud no válida')
    .max(180, 'Longitud no válida'),

  address: z
    .string()
    .trim()
    .max(300, 'La dirección no puede superar los 300 caracteres')
    .optional(),
});

// PATCH /api/incidents/:id/status
export const updateStatusSchema = z.object({
  status: z.enum(STATUSES, {
    error: `status debe ser uno de: ${STATUSES.join(', ')}`,
  }),
});

// GET /api/incidents
export const listIncidentsQuerySchema = z.object({
  status: z
    .enum(STATUSES)
    .optional(),

  category: z
    .enum(CATEGORIES)
    .optional(),

  createdBy: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'createdBy debe ser un ObjectId válido'
    )
    .optional(),

  lat: z
    .coerce
    .number()
    .min(-90, 'Latitud no válida')
    .max(90, 'Latitud no válida')
    .optional(),

  lng: z
    .coerce
    .number()
    .min(-180, 'Longitud no válida')
    .max(180, 'Longitud no válida')
    .optional(),

  maxDistanceMeters: z
    .coerce
    .number()
    .positive('maxDistanceMeters debe ser positivo')
    .optional(),

  page: z
    .coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(1),

  limit: z
    .coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(20),

  sortBy: z
    .enum(['recent', 'popular'])
    .optional()
    .default('recent'),
});

// GET /api/incidents/:id
export const mongoIdParamSchema = z.object({
  id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'id debe ser un ObjectId válido'
    ),
});

// /api/incidents/:incidentId/vote
export const incidentIdParamSchema = z.object({
  incidentId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'incidentId debe ser un ObjectId válido'
    ),
});