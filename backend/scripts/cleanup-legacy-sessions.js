import 'dotenv/config';

import mongoose from 'mongoose';
import Session from '../src/models/session.model.js';
import {
  INVALID_REFRESH_SESSION_QUERY,
  isLegacySessionTtlIndex,
} from '../src/services/index-maintenance.service.js';

function parseMode(args) {
  const allowedArgs = new Set(['--yes', '--dry-run']);
  const unknownArgs = args.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  }
  if (args.includes('--yes') && args.includes('--dry-run')) {
    throw new Error('Use either --yes or --dry-run, not both');
  }
  return args.includes('--yes') ? 'apply' : 'dry-run';
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured');
  }

  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });

  const [collectionInfo] = await mongoose.connection.db
    .listCollections({ name: Session.collection.name })
    .toArray();
  if (!collectionInfo) {
    console.log('The sessions collection does not exist; nothing to clean.');
    return;
  }

  const indexes = await Session.collection.listIndexes().toArray();
  const legacyTtlIndexes = indexes.filter(isLegacySessionTtlIndex);
  const invalidCount = await Session.collection.countDocuments(INVALID_REFRESH_SESSION_QUERY);
  console.log(`Invalid sessions: ${invalidCount}`);
  console.log(
    `Legacy expiresAt TTL indexes: ${
      legacyTtlIndexes.length ? legacyTtlIndexes.map(({ name }) => name).join(', ') : 'none'
    }`,
  );

  if (mode === 'dry-run') {
    console.log('Dry run only. Pass --yes to delete invalid sessions after old instances stop.');
    return;
  }

  if (legacyTtlIndexes.length) {
    throw new Error('Legacy expiresAt TTL index is present; refusing to clean sessions');
  }

  const result = await Session.deleteMany(INVALID_REFRESH_SESSION_QUERY);
  const remainingInvalidCount = await Session.collection.countDocuments(
    INVALID_REFRESH_SESSION_QUERY,
  );
  const indexesAfterCleanup = await Session.collection.listIndexes().toArray();
  const legacyIndexesAfterCleanup = indexesAfterCleanup.filter(isLegacySessionTtlIndex);

  if (remainingInvalidCount || legacyIndexesAfterCleanup.length) {
    throw new Error(
      `Cleanup verification failed: ${remainingInvalidCount} invalid sessions remain; ` +
        `${legacyIndexesAfterCleanup.length} legacy TTL indexes are present`,
    );
  }

  console.log(`Deleted ${result.deletedCount} invalid session(s).`);
  console.log('Verified that no legacy expiresAt TTL index is present.');
}

async function run() {
  try {
    await main();
  } catch (error) {
    console.error('Legacy session cleanup failed:', error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch (error) {
        console.error('Failed to disconnect from MongoDB:', error);
        process.exitCode = 1;
      }
    }
  }
}

run();
