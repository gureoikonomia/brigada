import 'dotenv/config';

import app from './app.js';
import connectDB from './config/db.js';
import { validateEnvironment } from './config/env.js';
import mongoose from 'mongoose';
import { startMediaDeletionWorker } from './services/media-deletion.service.js';
import { initializeRateLimitStores } from './middlewares/mongo-rate-limit.store.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.createIndexes())
    );
    await initializeRateLimitStores();
    startMediaDeletionWorker();

    const server = app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });

    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`Received ${signal}; shutting down`);

      const forceExit = setTimeout(() => {
        console.error('Graceful shutdown timed out');
        process.exit(1);
      }, 10_000);
      forceExit.unref();

      server.close(async (error) => {
        clearTimeout(forceExit);
        try {
          await mongoose.disconnect();
          process.exitCode = error ? 1 : 0;
        } catch (disconnectError) {
          console.error('Error closing MongoDB connection:', disconnectError);
          process.exitCode = 1;
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(
      'Error starting server:',
      error
    );

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error closing MongoDB after startup failure:', disconnectError);
    }
    process.exitCode = 1;
  }
};

startServer();