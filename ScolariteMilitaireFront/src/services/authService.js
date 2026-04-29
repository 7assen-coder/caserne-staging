import { api } from './api';

export async function loginRequest({ email, phone, password, remember_me }) {
  const body = { password, remember_me: !!remember_me };
  if (email) body.email = String(email).trim().toLowerCase();
  if (phone) body.phone = String(phone).trim();
  const { data } = await api.post('/auth/login/', body);
  if (data.access) localStorage.setItem('esp_token', data.access);
  return data.user;
}

export async function logoutRequest() {
  try {
    await api.post('/auth/logout/', {});
  } finally {
    localStorage.removeItem('esp_token');
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me/');
  return data;
}
