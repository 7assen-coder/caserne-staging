import { api } from './api';
import { apiPaths } from './apiPaths';
import { clearAccessToken, setRememberMePreference } from '../utils/authStorage';
import { ensureCsrfToken } from '../utils/csrf';

function normalizeUser(user) {
  if (!user) return user;
  const mustChangePassword = !!(user.must_change_password ?? user.mustChangePassword);
  return { ...user, mustChangePassword, must_change_password: mustChangePassword };
}

export async function loginRequest({ email, password, remember_me }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  await ensureCsrfToken(api);
  const body = { email: normalizedEmail, password, remember_me: !!remember_me };
  const { data } = await api.post(apiPaths.auth.login, body);
  setRememberMePreference(!!remember_me);
  const user = normalizeUser(data.user);
  return { user, mustChangePassword: !!user.mustChangePassword };
}

export async function logoutRequest() {
  try {
    await ensureCsrfToken(api);
    await api.post(apiPaths.auth.logout, {});
  } finally {
    clearAccessToken();
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get(apiPaths.auth.me);
  return normalizeUser(data);
}

export async function refreshAccessToken() {
  await ensureCsrfToken(api);
  await api.post(
    apiPaths.auth.refresh,
    {},
    { _skipAuthRefresh: true, _skipTransientRetry: true },
  );
  return true;
}

export async function changePasswordRequest({ current_password, new_password }) {
  const body = { new_password };
  if (current_password) body.current_password = current_password;
  const { data } = await api.post(apiPaths.auth.password, body);
  return normalizeUser(data);
}

export async function requestPasswordReset(email, source = 'login_recovery', lang = 'fr') {
  const normalizedLang = String(lang || 'fr').toLowerCase().startsWith('ar') ? 'ar' : 'fr';
  const { data } = await api.post(apiPaths.auth.passwordReset, {
    email: String(email).trim().toLowerCase(),
    source,
    lang: normalizedLang,
  });
  return data;
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const { data } = await api.post(apiPaths.auth.passwordResetVerify, {
    email: String(email).trim().toLowerCase(),
    otp: String(otp).replace(/\s/g, ''),
  });
  return data;
}

export async function confirmPasswordReset({ reset_token, new_password }) {
  const { data } = await api.post(apiPaths.auth.passwordResetConfirm, {
    reset_token,
    new_password,
  });
  return data;
}
