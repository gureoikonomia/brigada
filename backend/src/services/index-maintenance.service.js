import mongoose from 'mongoose';
import Session from '../models/session.model.js';

export const INVALID_REFRESH_SESSION_QUERY = {
  $or: [
    { refreshTokenHash: { $not: { $type: 'string' } } },
    { refreshTokenHash: { $type: 'array' } },
    { refreshExpiresAt: { $not: { $type: 'date' } } },
    { refreshExpiresAt: { $type: 'array' } },
    { absoluteExpiresAt: { $not: { $type: 'date' } } },
    { absoluteExpiresAt: { $type: 'array' } },
  ],
};

export function isLegacySessionTtlIndex(index) {
  const indexKeys = Object.entries(index.key ?? {});
  return (
    indexKeys.length === 1 &&
    indexKeys[0][0] === 'expiresAt' &&
    indexKeys[0][1] === 1 &&
    index.expireAfterSeconds !== undefined
  );
}

export async function migrateSessionRefreshIndex(
  SessionModel = Session,
  database = mongoose.connection.db,
) {
  const collection = SessionModel.collection;
  const [collectionInfo] = await database.listCollections({ name: collection.name }).toArray();
  if (!collectionInfo) return;

  const indexes = await collection.listIndexes().toArray();
  for (const index of indexes) {
    if (!isLegacySessionTtlIndex(index)) continue;

    try {
      await collection.dropIndex(index.name);
    } catch (error) {
      if (error.code !== 27 && error.codeName !== 'IndexNotFound') throw error;
    }
  }

  await SessionModel.deleteMany(INVALID_REFRESH_SESSION_QUERY);
}

export async function createIndexesWithDiagnostics(models = Object.values(mongoose.models)) {
  for (const model of models) {
    for (const [keys, options] of model.schema.indexes()) {
      const indexName =
        options.name ||
        Object.entries(keys)
          .map(([field, direction]) => `${field}_${direction}`)
          .join('_');

      try {
        await model.collection.createIndex(keys, options);
      } catch (error) {
        console.error(
          `Failed to create MongoDB index "${indexName}" for model "${model.modelName}":`,
          error,
        );
        throw error;
      }
    }
  }
}
