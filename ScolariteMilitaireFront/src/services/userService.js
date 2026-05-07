import { api } from './api';
import { roleToBackendFonction } from '../utils/userRole';

const LOCAL_KEY = 'esp_local_users_v1';

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* localStorage indisponible : silencieux */
  }
}

function isMissingEndpoint(err) {
  const status = err?.response?.status;
  return status === 404 || status === 405 || status === 501;
}

export const userService = {
  async createUser(payload) {
    const body = {
      email: String(payload.email || '').trim().toLowerCase(),
      password: payload.password || '',
      first_name: payload.prenom || '',
      last_name: payload.nom || '',
      phone: payload.telephone || '',
      matricule: payload.matricule || '',
      grade: payload.grade || '',
      role: payload.role || '',
      fonction: roleToBackendFonction(payload.role),
    };
    try {
      const { data } = await api.post('/auth/register/', body);
      return { user: data, persistence: 'backend' };
    } catch (err) {
      if (isMissingEndpoint(err)) {
        const list = loadLocal();
        if (list.find((u) => u.email && u.email === body.email)) {
          throw new Error('Un utilisateur avec cet e-mail existe déjà (mode démo).', { cause: err });
        }
        const entry = {
          id: `local-${Date.now()}`,
          email: body.email,
          prenom: body.first_name,
          nom: body.last_name,
          phone: body.phone,
          matricule: body.matricule,
          grade: body.grade,
          role: body.role,
          fonction: body.fonction,
          createdAt: new Date().toISOString(),
        };
        list.unshift(entry);
        saveLocal(list);
        return { user: entry, persistence: 'local' };
      }
      throw err;
    }
  },

  async listUsers() {
    try {
      const { data } = await api.get('/auth/users/');
      return { users: Array.isArray(data) ? data : [], persistence: 'backend' };
    } catch (err) {
      if (isMissingEndpoint(err)) {
        return { users: loadLocal(), persistence: 'local' };
      }
      throw err;
    }
  },

  removeLocalUser(id) {
    const list = loadLocal().filter((u) => u.id !== id);
    saveLocal(list);
  },
};
