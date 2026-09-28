import appSettingsService from '../services/app-settings.service.js';

async function getSettings(req, res, next) {
  try {
    const settings = await appSettingsService.getSettings();
    return res.status(200).json(settings);
  } catch (err) {
    return next(err);
  }
}

async function updateVoting(req, res, next) {
  try {
    const { votingEnabled } = req.validated.body;
    const settings = await appSettingsService.updateVotingEnabled(votingEnabled, req.user.id);
    return res.status(200).json(settings);
  } catch (err) {
    return next(err);
  }
}

export default { getSettings, updateVoting };