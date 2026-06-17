/** Mot de passe initial imposé à la création (front démo). */
export const INITIAL_USER_PASSWORD = '123456';

const LOCAL_KEY = 'esp_local_users_v1';

function loadAll() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function toPublicUser(record) {
  if (!record) return null;
  return {
    id: record.id,
    email: record.email,
    prenom: record.prenom,
    nom: record.nom,
    phone: record.phone || '',
    matricule: record.matricule || '—',
    grade: record.grade || '—',
    fonction: record.fonction,
    mustChangePassword: !!record.mustChangePassword,
  };
}

export function findLocalUserByEmail(email) {
  const key = String(email || '').trim().toLowerCase();
  return loadAll().find((u) => u.email === key) ?? null;
}

export function findLocalUserById(id) {
  return loadAll().find((u) => u.id === id) ?? null;
}

export function createLocalUser({
  email,
  prenom,
  nom,
  telephone = '',
  matricule = '',
  grade = '',
  fonction,
}) {
  const list = loadAll();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (list.some((u) => u.email === normalizedEmail)) {
    throw new Error('Un utilisateur avec cet e-mail existe déjà.');
  }
  const entry = {
    id: `local-${Date.now()}`,
    email: normalizedEmail,
    prenom: String(prenom || '').trim(),
    nom: String(nom || '').trim(),
    phone: telephone || '',
    matricule: matricule || '',
    grade: grade || '',
    fonction,
    password: INITIAL_USER_PASSWORD,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  saveAll(list);
  return toPublicUser(entry);
}

export function authenticateLocal(email, password) {
  const user = findLocalUserByEmail(email);
  if (!user || user.password !== password) return null;
  return {
    user: toPublicUser(user),
    mustChangePassword: !!user.mustChangePassword,
  };
}

export function updateLocalUserPassword(email, newPassword) {
  const key = String(email || '').trim().toLowerCase();
  const list = loadAll();
  const idx = list.findIndex((u) => u.email === key);
  if (idx < 0) throw new Error('Utilisateur introuvable.');
  list[idx] = {
    ...list[idx],
    password: newPassword,
    mustChangePassword: false,
  };
  saveAll(list);
  return toPublicUser(list[idx]);
}

export function isLocalSessionToken(token) {
  return typeof token === 'string' && token.startsWith('local:');
}

export function localTokenForUserId(id) {
  return `local:${id}`;
}

export function userIdFromLocalToken(token) {
  if (!isLocalSessionToken(token)) return null;
  return token.slice(6);
}
