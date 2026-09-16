import { api } from './api';
import { apiPaths } from './apiPaths';
import {
  authenticateLocal,
  createLocalUser,
  findLocalUserByEmail,
  findLocalUserById,
  localTokenForUserId,
  toPublicUser,
  updateLocalUserPassword,
  userIdFromLocalToken,
} from '../utils/localUserStore';
import { sanitizeMrPhoneDigits } from '../utils/mrPhone';

const LOCAL_KEY = 'esp_local_users_v1';

function isMissingEndpoint(err) {
  const status = err?.response?.status;
  return status === 404 || status === 405 || status === 501;
}

export const userService = {
  async createUser(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = sanitizeMrPhoneDigits(payload.telephone || payload.phone || '');
    const body = {
      email,
      password: phone,
      first_name: payload.prenom || '',
      last_name: payload.nom || '',
      phone,
      grade: payload.grade || '',
      fonction: payload.fonction || '',
      scope_compagnie: payload.scope_compagnie || '',
      scope_section: payload.scope_section || '',
    };

    try {
      const { data } = await api.post(apiPaths.auth.users, body);
      createLocalUser({
        email,
        prenom: body.first_name,
        nom: body.last_name,
        telephone: body.phone,
        grade: body.grade,
        fonction: body.fonction,
        password: phone,
      });
      return { user: data, persistence: 'backend' };
    } catch (err) {
      if (isMissingEndpoint(err)) {
        const entry = createLocalUser({
          email,
          prenom: body.first_name,
          nom: body.last_name,
          telephone: body.phone,
          grade: body.grade,
          fonction: body.fonction,
          password: phone,
        });
        return { user: entry, persistence: 'local' };
      }
      if (err?.response?.status === 400 || err?.response?.status === 409) {
        throw err;
      }
      const entry = createLocalUser({
        email,
        prenom: body.first_name,
        nom: body.last_name,
        telephone: body.phone,
        grade: body.grade,
        fonction: body.fonction,
        password: phone,
      });
      return { user: entry, persistence: 'local-fallback' };
    }
  },

  async listUsers() {
    try {
      const { data } = await api.get(apiPaths.auth.users);
      return { users: Array.isArray(data) ? data : [], persistence: 'backend' };
    } catch (err) {
      if (isMissingEndpoint(err)) {
        const raw = localStorage.getItem(LOCAL_KEY);
        const users = raw ? JSON.parse(raw) : [];
        return { users: Array.isArray(users) ? users.map(toPublicUser) : [], persistence: 'local' };
      }
      throw err;
    }
  },

  async updateUser(id, payload = {}) {
    const body = {};
    if (payload.fonction != null) body.fonction = payload.fonction;
    if (payload.is_active_access != null) body.is_active_access = payload.is_active_access;
    if (payload.prenom != null) body.first_name = payload.prenom;
    if (payload.nom != null) body.last_name = payload.nom;
    if (payload.telephone != null) body.phone = payload.telephone;
    if (payload.grade != null) body.grade = payload.grade;
    if (payload.scope_compagnie != null) body.scope_compagnie = payload.scope_compagnie;
    if (payload.scope_section != null) body.scope_section = payload.scope_section;
    const { data } = await api.patch(apiPaths.auth.user(id), body);
    return data;
  },

  findLocalByEmail: findLocalUserByEmail,
  updateLocalPassword: updateLocalUserPassword,
  authenticateLocal,
  findLocalUserById,
  localTokenForUserId,
  userIdFromLocalToken,
};
