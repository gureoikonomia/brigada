import api from './api';

export async function register({ name, email, password }) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data;
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function updateProfile({ name, email }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (email !== undefined) payload.email = email;
  const { data } = await api.patch('/auth/me', payload);
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.patch('/auth/me/password', { currentPassword, newPassword });
  return data;
}
