import mongoose from 'mongoose';

const COLLECTION_NAME = 'rateLimitCounters';
const stores = new Set();
let ttlIndexPromise;

export class MongoRateLimitStore {
  constructor(namespace) {
    this.namespace = namespace;
    this.windowMs = 0;
    this.localKeys = false;
    stores.add(this);
  }

  init({ windowMs }) {
    this.windowMs = windowMs;
  }

  async initialize() {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB debe estar conectado antes de inicializar los limitadores');
    }

    if (!ttlIndexPromise) {
      ttlIndexPromise = mongoose.connection
        .collection(COLLECTION_NAME)
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }
    await ttlIndexPromise;
  }

  async increment(key) {
    await this.initialize();
    const now = new Date();
    const resetTime = new Date(now.getTime() + this.windowMs);
    const _id = `${this.namespace}:${key}`;
    const collection = mongoose.connection.collection(COLLECTION_NAME);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const client = await collection.findOneAndUpdate(
          { _id },
          [{
            $set: {
              totalHits: {
                $cond: [
                  { $gt: ['$expiresAt', now] },
                  { $add: [{ $ifNull: ['$totalHits', 0] }, 1] },
                  1,
                ],
              },
              expiresAt: {
                $cond: [
                  { $gt: ['$expiresAt', now] },
                  '$expiresAt',
                  resetTime,
                ],
              },
            },
          }],
          { upsert: true, returnDocument: 'after' }
        );

        if (!client) throw new Error('MongoDB no devolvió el contador del limitador');
        return { totalHits: client.totalHits, resetTime: client.expiresAt };
      } catch (error) {
        if (error.code !== 11000 || attempt === 1) throw error;
      }
    }

    throw new Error('No se pudo incrementar el contador del limitador');
  }

  async decrement(key) {
    await this.initialize();
    await mongoose.connection.collection(COLLECTION_NAME).updateOne(
      { _id: `${this.namespace}:${key}`, totalHits: { $gt: 0 } },
      { $inc: { totalHits: -1 } }
    );
  }

  async resetKey(key) {
    await this.initialize();
    await mongoose.connection.collection(COLLECTION_NAME).deleteOne({
      _id: `${this.namespace}:${key}`,
    });
  }
}

export function createRateLimitStore(namespace) {
  return new MongoRateLimitStore(namespace);
}

export async function initializeRateLimitStores() {
  await Promise.all([...stores].map((store) => store.initialize()));
}
