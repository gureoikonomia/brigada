import assert from 'node:assert/strict';
import test from 'node:test';

import { createAccountDeletionLink } from '../src/services/account-deletion.service.js';
import Incident from '../src/models/incident.model.js';
import IncidentReport from '../src/models/incidentReport.model.js';
import User from '../src/models/user.model.js';
import { incidentReportService } from '../src/services/incident-report.service.js';
import { incidentService, presentIncident } from '../src/services/incident.service.js';
import { appSettingsService } from '../src/services/app-settings.service.js';
import {
  confirmAccountDeletionSchema,
  requestAccountDeletionSchema,
} from '../src/validators/auth.validator.js';
import {
  createIncidentReportSchema,
  resolveIncidentReportSchema,
} from '../src/validators/incident-report.validator.js';

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

test('public account deletion links use the deployed frontend route and one-time values', () => {
  const link = new URL(createAccountDeletionLink(
    'https://appbrigada.netlify.app/',
    'a'.repeat(64),
    '507f1f77bcf86cd799439011',
  ));

  assert.equal(link.origin, 'https://appbrigada.netlify.app');
  assert.equal(link.pathname, '/eliminar-cuenta');
  assert.equal(link.searchParams.get('uid'), '507f1f77bcf86cd799439011');
  assert.equal(link.searchParams.get('token'), 'a'.repeat(64));
});

test('account deletion schemas validate request emails and confirmation tokens', () => {
  assert.equal(requestAccountDeletionSchema.safeParse({ email: 'user@example.com' }).success, true);
  assert.equal(requestAccountDeletionSchema.safeParse({ email: 'not-an-email' }).success, false);
  assert.equal(confirmAccountDeletionSchema.safeParse({
    uid: '507f1f77bcf86cd799439011',
    token: 'a'.repeat(64),
  }).success, true);
  assert.equal(confirmAccountDeletionSchema.safeParse({
    uid: 'invalid',
    token: 'short',
  }).success, false);
});

test('incident reports accept only supported reasons and moderator outcomes', () => {
  assert.equal(createIncidentReportSchema.safeParse({
    reason: 'personal_data',
    details: 'Incluye información privada.',
  }).success, true);
  assert.equal(createIncidentReportSchema.safeParse({ reason: 'unknown' }).success, false);
  assert.equal(resolveIncidentReportSchema.safeParse({ status: 'actioned' }).success, true);
  assert.equal(resolveIncidentReportSchema.safeParse({ status: 'pending' }).success, false);
});

test('authenticated incident responses expose only the author identity needed for blocking', () => {
  const result = presentIncident(
    {
      _id: 'incident-id',
      createdBy: { _id: 'author-id', name: 'Author', avatarUrl: null },
    },
    { id: 'reporter-id', role: 'user' },
  );

  assert.equal(result.createdBy, undefined);
  assert.deepEqual(result.creator, {
    id: 'author-id',
    name: 'Author',
    avatarUrl: null,
  });
});

test('incidents retained after account deletion have no exposed author identity', () => {
  const result = presentIncident(
    { _id: 'incident-id', createdBy: null },
    { id: 'viewer-id', role: 'user' },
  );

  assert.equal(result.creator, undefined);
  assert.equal(result.createdBy, undefined);
  assert.equal(result.isOwner, false);
});

test('anonymized incident reports allow another user to report the retained content', async (t) => {
  let savedReport;
  patchMethod(t, Incident, 'findById', () => ({
    select: () => ({ lean: async () => ({ createdBy: null }) }),
  }));
  patchMethod(t, IncidentReport, 'create', async (report) => {
    savedReport = report;
  });

  assert.deepEqual(
    await incidentReportService.reportIncident('incident-id', 'reporter-id', { reason: 'other' }),
    { reported: true },
  );
  assert.equal(savedReport.incident, 'incident-id');
  assert.equal(savedReport.reporter, 'reporter-id');
});

test('report indexes allow anonymized reporters and expire resolved reports after 365 days', () => {
  const indexes = IncidentReport.schema.indexes();
  const reporterIndex = indexes.find(([keys]) => keys.incident === 1 && keys.reporter === 1);
  const retentionIndex = indexes.find(([keys]) => keys.reviewedAt === 1);

  assert.equal(reporterIndex[1].unique, true);
  assert.deepEqual(reporterIndex[1].partialFilterExpression, {
    reporter: { $type: 'objectId' },
  });
  assert.equal(retentionIndex[1].expireAfterSeconds, 365 * 24 * 60 * 60);
});

test('moderators can reject public incidents but cannot change them to other states', async (t) => {
  const incident = {
    status: 'resuelta',
    async save() {},
  };
  patchMethod(t, Incident, 'findById', async () => incident);

  await incidentService.updateStatus('incident-id', 'rechazada', {
    id: 'moderator-id',
    role: 'moderator',
  });
  assert.equal(incident.status, 'rechazada');

  incident.status = 'pendiente';
  await assert.rejects(
    incidentService.updateStatus('incident-id', 'resuelta', {
      id: 'moderator-id',
      role: 'moderator',
    }),
    (error) => error.statusCode === 403,
  );
});

test('authenticated incident listings exclude authors blocked by the current user', async (t) => {
  const blockedUserId = '507f1f77bcf86cd799439012';
  let incidentQuery;
  patchMethod(t, appSettingsService, 'getSettings', async () => ({ votingEnabled: false }));
  patchMethod(t, User, 'findById', () => ({
    select: () => ({ lean: async () => ({ blockedUsers: [blockedUserId] }) }),
  }));
  patchMethod(t, Incident, 'find', (query) => {
    incidentQuery = query;
    return {
      populate() { return this; },
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      async lean() { return []; },
    };
  });
  patchMethod(t, Incident, 'countDocuments', async () => 0);

  await incidentService.listIncidents({
    user: { id: 'viewer-id', role: 'user' },
  });

  assert.deepEqual(incidentQuery.createdBy, { $nin: [blockedUserId] });
});
