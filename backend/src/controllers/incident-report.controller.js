import { incidentReportService } from '../services/incident-report.service.js';

async function create(req, res, next) {
  try {
    const result = await incidentReportService.reportIncident(
      req.validated.params.id,
      req.user.id,
      req.validated.body,
    );
    return res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
  }
}

async function listPending(req, res, next) {
  try {
    const reports = await incidentReportService.listPendingIncidentReports();
    return res.status(200).json(reports);
  } catch (error) {
    return next(error);
  }
}

async function resolve(req, res, next) {
  try {
    const report = await incidentReportService.resolveIncidentReport(
      req.validated.params.reportId,
      req.user.id,
      req.validated.body.status,
    );
    return res.status(200).json(report);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
  }
}

export { create, listPending, resolve };
