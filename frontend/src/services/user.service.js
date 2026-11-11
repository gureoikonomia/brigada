import api from './api';

export async function getUserStats() {
  const response = await api.get('/users/me/stats');
  return response.data;
}

export async function getAdminStats() {
  const response = await api.get('/users/admin/stats');
  return response.data;
}

export async function listUsers(params = {}) {
  const response = await api.get('/users', { params });
  return response.data;
}

export async function updateUserRole(userId, role) {
  const response = await api.patch(`/users/${userId}/role`, { role });
  return response.data;
}

export async function updateUserStatus(userId, isActive) {
  const response = await api.patch(`/users/${userId}/status`, { isActive });
  return response.data;
}

export async function listBlockedUsers() {
  const response = await api.get('/users/me/blocked');
  return response.data;
}

export async function blockUser(userId) {
  const response = await api.put(`/users/${userId}/blocked`);
  return response.data;
}

export async function unblockUser(userId) {
  const response = await api.delete(`/users/${userId}/blocked`);
  return response.data;
}

export default {
  getUserStats,
  getAdminStats,
  listUsers,
  updateUserRole,
  updateUserStatus,
  listBlockedUsers,
  blockUser,
  unblockUser,
};
