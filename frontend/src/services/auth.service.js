import api from './api';

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function resendVerification(email) {
  const { data } = await api.post('/auth/resend-verification', { email });
  return data;
}

export async function verifyEmail({ uid, token }) {
  const { data } = await api.post('/auth/verify-email', { uid, token });
  return data;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function deleteAccount(currentPassword) {
  const { data } = await api.delete('/auth/me', { data: { currentPassword } });
  return data;
}

export async function getPrivacyNotice() {
  const { data } = await api.get('/legal/privacy-notice');
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function updateProfile({ name }) {
  const { data } = await api.patch('/auth/me', { name });
  return data;
}

export async function requestEmailChange({ email, currentPassword }) {
  const { data } = await api.post('/auth/me/email-change', { email, currentPassword });
  return data;
}

export async function uploadProfileAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await api.patch('/auth/me/avatar', formData);
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.patch('/auth/me/password', { currentPassword, newPassword });
  return data;
}
