import api from './api';

export async function listIncidents(params = {}) {
  // El backend valida los query params con Zod usando .optional(), que
  // permite que el campo esté AUSENTE pero no que llegue como "" (cadena
  // vacía) — por eso quitamos aquí cualquier valor vacío antes de mandarlo,
  // en vez de dejar que viaje como status=&category=.
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );

  const { data } = await api.get('/incidents', { params: cleanParams });
  return data;
}

export async function getIncident(id) {
  const { data } = await api.get(`/incidents/${id}`);
  return data;
}

export async function createIncident(formData) {
  // formData debe ser un objeto FormData (por las imágenes), no JSON
  const { data } = await api.post('/incidents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateIncidentStatus(id, status) {
  const { data } = await api.patch(`/incidents/${id}/status`, { status });
  return data;
}

export async function deleteIncident(id) {
  const { data } = await api.delete(`/incidents/${id}`);
  return data;
}

export async function voteIncident(id) {
  const { data } = await api.post(`/incidents/${id}/vote`);
  return data;
}

export async function unvoteIncident(id) {
  const { data } = await api.delete(`/incidents/${id}/vote`);
  return data;
}

export async function listVotedIncidents(params = {}) {
  const { data } = await api.get('/incidents/user/voted', { params });
  return data;
}