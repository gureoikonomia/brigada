import api from './api';

export async function getAppSettings() {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateVotingSetting(votingEnabled) {
  const { data } = await api.patch('/settings/voting', { votingEnabled });
  return data;
}