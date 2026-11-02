import AppSettings from '../models/app-settings.model.js';
import { ServiceError } from '../errors/service.error.js';

async function getSettings() {
  const settings = await AppSettings.findOne({ key: 'global' }).select('votingEnabled').lean();

  return { votingEnabled: settings?.votingEnabled ?? false };
}

async function updateVotingEnabled(votingEnabled, adminId) {
  const settings = await AppSettings.findOneAndUpdate(
    { key: 'global' },
    {
      $set: { votingEnabled, updatedBy: adminId },
      $setOnInsert: { key: 'global' },
    },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  )
    .select('votingEnabled')
    .lean();

  return { votingEnabled: settings.votingEnabled };
}

async function requireVotingEnabled() {
  const settings = await getSettings();
  if (!settings.votingEnabled) {
    throw new ServiceError('La votación está desactivada', 403);
  }
}

export const appSettingsService = {
  getSettings,
  updateVotingEnabled,
  requireVotingEnabled,
};
