import { api } from './api';
import { clearAccessToken, getAccessToken, isRememberMeSession, setAccessToken } from '../utils/authStorage';
import {
  authenticateLocal,
  findLocalUserByEmail,
  findLocalUserById,
  INITIAL_USER_PASSWORD,
  isLocalSessionToken,
  localTokenForUserId,
  toPublicUser,
  userIdFromLocalToken,
} from '../utils/localUserStore';

export { INITIAL_USER_PASSWORD };

function mergeMustChangePassword(user) {
  const local = findLocalUserByEmail(user?.email);
  return { ...user, mustChangePassword: !!local?.mustChangePassword };
}

export async function loginRequest({ email, password, remember_me }) {
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const body = { email: normalizedEmail, password, remember_me: !!remember_me };
    const { data } = await api.post('/auth/login/', body);
    if (data.access) setAccessToken(data.access, !!remember_me);
    const user = mergeMustChangePassword(data.user);
    return { user, mustChangePassword: !!user.mustChangePassword };
  } catch (err) {
    const localAuth = authenticateLocal(normalizedEmail, password);
    if (localAuth) {
      setAccessToken(localTokenForUserId(localAuth.user.id), !!remember_me);
      return localAuth;
    }
    throw err;
  }
}

export async function logoutRequest() {
  try {
    const token = getAccessToken();
    if (!isLocalSessionToken(token)) {
      await api.post('/auth/logout/', {});
    }
  } finally {
    clearAccessToken();
  }
}

export async function fetchCurrentUser() {
  const token = getAccessToken();
  if (isLocalSessionToken(token)) {
    const id = userIdFromLocalToken(token);
    const record = findLocalUserById(id);
    if (!record) throw new Error('Session locale expirée.');
    return toPublicUser(record);
  }
  const { data } = await api.get('/auth/me/');
  const local = findLocalUserByEmail(data.email);
  return {
    ...data,
    mustChangePassword: !!local?.mustChangePassword,
  };
}

export async function refreshAccessToken() {
  const token = getAccessToken();
  if (isLocalSessionToken(token)) return token;
  const { data } = await api.post('/auth/token/refresh/', {});
  if (data?.access) setAccessToken(data.access, isRememberMeSession());
  return data?.access ?? null;
}
