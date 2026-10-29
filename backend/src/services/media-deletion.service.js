import PendingMediaDeletion from '../models/pendingMediaDeletion.model.js';
import uploadService from './upload.service.js';
import { randomUUID } from 'node:crypto';

let processing = false;

export async function enqueueMediaDeletion(publicIds, session) {
  const uniqueIds = [...new Set(publicIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  const options = session ? { session } : {};
  await PendingMediaDeletion.create([{ publicIds: uniqueIds }], options);
}

export async function processPendingMediaDeletions() {
  if (processing) return;
  processing = true;

  try {
    for (let count = 0; count < 10; count += 1) {
      const now = new Date();
      const leaseId = randomUUID();
      const job = await PendingMediaDeletion.findOneAndUpdate(
        {
          nextAttemptAt: { $lte: now },
          $or: [
            { leaseUntil: null },
            { leaseUntil: { $lte: now } },
          ],
        },
        {
          $set: {
            leaseId,
            leaseUntil: new Date(now.getTime() + 15 * 60 * 1000),
          },
        },
        { sort: { createdAt: 1 }, new: true }
      ).lean();

      if (!job) break;
      const failedIds = [];
      for (const publicId of job.publicIds) {
        try {
          await uploadService.deleteImage(publicId);
        } catch (error) {
          failedIds.push(publicId);
          console.error('Cloudinary deletion failed; it will be retried:', error.message);
        }
      }

      if (!failedIds.length) {
        await PendingMediaDeletion.deleteOne({ _id: job._id, leaseId });
        continue;
      }

      const attempts = job.attempts + 1;
      const delayMs = Math.min(60 * 60 * 1000, 30_000 * (2 ** Math.min(attempts, 7)));
      const result = await PendingMediaDeletion.updateOne(
        { _id: job._id, leaseId },
        {
          $set: {
            publicIds: failedIds,
            nextAttemptAt: new Date(Date.now() + delayMs),
            leaseId: null,
            leaseUntil: null,
          },
          $inc: { attempts: 1 },
        }
      );
      if (!result.modifiedCount) {
        console.error('Media deletion job lease was lost before retry could be saved');
      } else {
        console.error(`Cloudinary deletion job will retry after failure ${attempts}`);
      }
    }
  } finally {
    processing = false;
  }
}

export function startMediaDeletionWorker() {
  const run = () => {
    processPendingMediaDeletions().catch((error) => {
      console.error('Media deletion worker failed:', error);
    });
  };

  run();
  const interval = setInterval(run, 60_000);
  interval.unref();
}
