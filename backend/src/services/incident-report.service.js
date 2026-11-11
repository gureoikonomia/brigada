import Incident from '../models/incident.model.js';
import IncidentReport from '../models/incidentReport.model.js';
import { ServiceError } from '../errors/service.error.js';

async function reportIncident(incidentId, reporterId, { reason, details = '' }) {
  const incident = await Incident.findById(incidentId).select('createdBy').lean();
  if (!incident) throw new ServiceError('Incidencia no encontrada', 404);
  if (incident.createdBy && incident.createdBy.toString() === reporterId) {
    throw new ServiceError('No puedes denunciar tu propia incidencia', 400);
  }

  try {
    await IncidentReport.create({ incident: incidentId, reporter: reporterId, reason, details });
  } catch (error) {
    if (error.code === 11000) {
      throw new ServiceError('Ya has denunciado esta incidencia', 409);
    }
    throw error;
  }
  return { reported: true };
}

async function listPendingIncidentReports() {
  return IncidentReport.find({ status: 'pending' })
    .populate('incident', 'title status createdAt')
    .populate('reporter', 'name')
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();
}

async function resolveIncidentReport(reportId, reviewerId, status) {
  const report = await IncidentReport.findOneAndUpdate(
    { _id: reportId, status: 'pending' },
    { $set: { status, reviewedBy: reviewerId, reviewedAt: new Date() } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!report) throw new ServiceError('La denuncia ya se ha revisado o no existe', 404);
  return report;
}

export const incidentReportService = {
  reportIncident,
  listPendingIncidentReports,
  resolveIncidentReport,
};
