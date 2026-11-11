import { z } from 'zod';

export const createIncidentReportSchema = z.object({
  reason: z.enum(['spam', 'inappropriate', 'personal_data', 'misinformation', 'other']),
  details: z.string().trim().max(1000).optional().default(''),
});

export const resolveIncidentReportSchema = z.object({
  status: z.enum(['actioned', 'dismissed']),
});

export const incidentReportIdParamSchema = z.object({
  reportId: z.string().regex(/^[0-9a-f]{24}$/i, 'ID de denuncia no válido'),
});
