import { api } from './api';
import {
  authenticateLocal,
  createLocalUser,
  findLocalUserByEmail,
  findLocalUserById,
  INITIAL_USER_PASSWORD,
  localTokenForUserId,
  toPublicUser,
  updateLocalUserPassword,
  userIdFromLocalToken,
} from '../utils/localUserStore';

export { INITIAL_USER_PASSWORD };

const LOCAL_KEY = 'esp_local_users_v1';

function isMissingEndpoint(err) {
  const status = err?.response?.status;
  return status === 404 || status === 405 || status === 501;
}

export const userService = {
  async createUser(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    const body = {
      email,
      password: INITIAL_USER_PASSWORD,
      first_name: payload.prenom || '',
      last_name: payload.nom || '',
      phone: payload.telephone || '',
      matricule: payload.matricule || '',
      grade: payload.grade || '',
      fonction: payload.fonction || '',
    };

    try {
      const { data } = await api.post('/auth/register/', body);
      createLocalUser({
        email,
        prenom: body.first_name,
        nom: body.last_name,
        telephone: body.phone,
        matricule: body.matricule,
        grade: body.grade,
        fonction: body.fonction,
      });
      return { user: data, persistence: 'backend' };
    } catch (err) {
      if (isMissingEndpoint(err)) {
        const entry = createLocalUser({
          email,
          prenom: body.first_name,
          nom: body.last_name,
          telephone: body.phone,
          matricule: body.matricule,
          grade: body.grade,
          fonction: body.fonction,
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
        matricule: body.matricule,
        grade: body.grade,
        fonction: body.fonction,
      });
      return { user: entry, persistence: 'local-fallback' };
    }
  },

  async listUsers() {
    try {
      const { data } = await api.get('/auth/users/');
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

  findLocalByEmail: findLocalUserByEmail,
  updateLocalPassword: updateLocalUserPassword,
  authenticateLocal,
  findLocalUserById,
  localTokenForUserId,
  userIdFromLocalToken,
};
