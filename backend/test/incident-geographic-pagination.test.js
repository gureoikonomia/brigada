import assert from 'node:assert/strict';
import test from 'node:test';

import Incident from '../src/models/incident.model.js';
import { appSettingsService } from '../src/services/app-settings.service.js';
import { incidentService } from '../src/services/incident.service.js';

function patchMethod(t, target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

test('geographic pagination counts incidents within the requested radius', async (t) => {
  const coordinates = [-73, 40];
  const maxDistanceMeters = 2000;
  let findQuery;
  let countQuery;

  patchMethod(t, appSettingsService, 'getSettings', async () => ({ votingEnabled: false }));
  patchMethod(t, Incident, 'find', (query) => {
    findQuery = query;
    return {
      populate() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return this;
      },
      async lean() {
        return [];
      },
    };
  });
  patchMethod(t, Incident, 'countDocuments', async (query) => {
    countQuery = query;
    return 17;
  });

  const result = await incidentService.listIncidents({
    near: { lng: coordinates[0], lat: coordinates[1], maxDistanceMeters },
    page: 1,
    limit: 10,
  });

  assert.deepEqual(findQuery.location.$near, {
    $geometry: { type: 'Point', coordinates },
    $maxDistance: maxDistanceMeters,
  });
  assert.deepEqual(countQuery.location.$geoWithin.$centerSphere, [
    coordinates,
    maxDistanceMeters / 6378100,
  ]);
  assert.equal(result.pagination.total, 17);
  assert.equal(result.pagination.totalPages, 2);
});
