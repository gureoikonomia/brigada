import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createIndexesWithDiagnostics,
  INVALID_REFRESH_SESSION_QUERY,
  migrateSessionRefreshIndex,
} from '../src/services/index-maintenance.service.js';

function bsonType(value) {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'string') return 'string';
  return typeof value;
}

function matchesInvalidRefreshSessionQuery(document, query) {
  return query.$or.some((condition) => {
    const [[field, expression]] = Object.entries(condition);
    const value = document[field];
    const expectedType = expression.$not?.$type || expression.$type;
    const matchesType =
      bsonType(value) === expectedType ||
      (Array.isArray(value) && value.some((entry) => bsonType(entry) === expectedType));
    return expression.$not ? !matchesType : matchesType;
  });
}

function createMigrationHarness({
  collectionExists = true,
  indexes = [],
  documents = [],
  dropError,
} = {}) {
  let deleteFilter;
  let deleteCalls = 0;
  const collection = {
    name: 'sessions',
    listIndexes() {
      return { toArray: async () => indexes.slice() };
    },
    async dropIndex(name) {
      if (dropError) throw dropError;
      const indexPosition = indexes.findIndex((index) => index.name === name);
      if (indexPosition === -1) {
        const error = new Error('Index not found');
        error.code = 27;
        throw error;
      }
      indexes.splice(indexPosition, 1);
      return name;
    },
  };
  const model = {
    collection,
    async deleteMany(filter) {
      deleteCalls += 1;
      deleteFilter = filter;
      const previousCount = documents.length;
      for (let index = documents.length - 1; index >= 0; index -= 1) {
        if (matchesInvalidRefreshSessionQuery(documents[index], filter)) {
          documents.splice(index, 1);
        }
      }
      return { deletedCount: previousCount - documents.length };
    },
  };
  const database = {
    listCollections({ name }) {
      return {
        toArray: async () => (collectionExists ? [{ name }] : []),
      };
    },
  };

  return {
    collection,
    database,
    documents,
    indexes,
    model,
    get deleteCalls() {
      return deleteCalls;
    },
    get deleteFilter() {
      return deleteFilter;
    },
  };
}

test('migration drops exact legacy TTL indexes with any expireAfterSeconds value', async () => {
  const harness = createMigrationHarness({
    indexes: [
      { name: 'expiresAt_1', key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      { name: 'old_duration', key: { expiresAt: 1 }, expireAfterSeconds: 3600 },
      { name: 'not_ttl', key: { expiresAt: 1 } },
      { name: 'compound', key: { expiresAt: 1, sessionId: 1 }, expireAfterSeconds: 0 },
      { name: 'refresh_ttl', key: { refreshExpiresAt: 1 }, expireAfterSeconds: 0 },
    ],
  });

  await migrateSessionRefreshIndex(harness.model, harness.database);

  assert.deepEqual(
    harness.indexes.map(({ name }) => name),
    ['not_ttl', 'compound', 'refresh_ttl'],
  );
  assert.equal(harness.deleteCalls, 1);
});

test('migration tolerates IndexNotFound when another instance already dropped the index', async (t) => {
  for (const dropError of [
    Object.assign(new Error('Index not found'), { code: 27 }),
    Object.assign(new Error('Index not found'), { codeName: 'IndexNotFound' }),
  ]) {
    await t.test(dropError.code === 27 ? 'code 27' : 'codeName', async () => {
      const harness = createMigrationHarness({
        indexes: [{ name: 'expiresAt_1', key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
        dropError,
      });

      await migrateSessionRefreshIndex(harness.model, harness.database);

      assert.equal(harness.deleteCalls, 1);
    });
  }
});

test('migration propagates other dropIndex errors without cleaning sessions', async () => {
  const dropError = Object.assign(new Error('Index options conflict'), { code: 85 });
  const harness = createMigrationHarness({
    indexes: [{ name: 'expiresAt_1', key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
    dropError,
  });

  await assert.rejects(migrateSessionRefreshIndex(harness.model, harness.database), (error) => {
    assert.equal(error, dropError);
    return true;
  });
  assert.equal(harness.deleteCalls, 0);
});

test('cleanup deletes missing, null, and wrong-type refresh fields but keeps valid sessions', async () => {
  const validSession = {
    refreshTokenHash: 'a'.repeat(64),
    refreshExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
    absoluteExpiresAt: new Date('2027-01-01T00:00:00.000Z'),
  };
  const invalidSessions = [
    { ...validSession, refreshTokenHash: null },
    { ...validSession, refreshTokenHash: 123 },
    { ...validSession, refreshTokenHash: ['a'.repeat(64)] },
    {
      refreshExpiresAt: validSession.refreshExpiresAt,
      absoluteExpiresAt: validSession.absoluteExpiresAt,
    },
    { ...validSession, refreshExpiresAt: null },
    { ...validSession, refreshExpiresAt: '2026-12-01' },
    { ...validSession, refreshExpiresAt: [validSession.refreshExpiresAt] },
    { ...validSession, absoluteExpiresAt: null },
    { ...validSession, absoluteExpiresAt: '2027-01-01' },
    { ...validSession, absoluteExpiresAt: [validSession.absoluteExpiresAt] },
    { ...validSession, absoluteExpiresAt: undefined },
  ];
  const harness = createMigrationHarness({
    documents: [validSession, ...invalidSessions],
  });

  await migrateSessionRefreshIndex(harness.model, harness.database);

  assert.deepEqual(harness.deleteFilter, INVALID_REFRESH_SESSION_QUERY);
  assert.deepEqual(harness.documents, [validSession]);
});

test('clean existing collection runs cleanup without requiring a legacy index', async () => {
  const harness = createMigrationHarness({
    indexes: [{ name: '_id_', key: { _id: 1 } }],
  });

  await migrateSessionRefreshIndex(harness.model, harness.database);

  assert.equal(harness.deleteCalls, 1);
  assert.deepEqual(harness.indexes, [{ name: '_id_', key: { _id: 1 } }]);
});

test('missing sessions collection is a no-op', async () => {
  const harness = createMigrationHarness({ collectionExists: false });

  await migrateSessionRefreshIndex(harness.model, harness.database);

  assert.equal(harness.deleteCalls, 0);
});

test('index creation logs the failing model and index before rethrowing', async (t) => {
  const failure = new Error('Duplicate key');
  const logs = [];
  const originalConsoleError = console.error;
  console.error = (...args) => logs.push(args);
  t.after(() => {
    console.error = originalConsoleError;
  });

  const model = {
    modelName: 'Incident',
    schema: {
      indexes: () => [
        [{ title: 1 }, {}],
        [{ slug: 1 }, { unique: true }],
      ],
    },
    collection: {
      async createIndex(keys) {
        if (keys.slug) throw failure;
      },
    },
  };

  await assert.rejects(createIndexesWithDiagnostics([model]), (error) => {
    assert.equal(error, failure);
    return true;
  });
  assert.match(logs[0][0], /slug_1.*Incident/);
});
