/**
 * Local fallback store for military users when the API is unavailable.
 * Key must stay in sync with AuthContext / userService.
 */

const LOCAL_KEY = 'esp_local_users_v1';
const TOKEN_PREFIX = 'local-user:';

function readAll() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(users) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(users));
}

function nextId(users) {
  const max = users.reduce((m, u) => Math.max(m, Number(u.id) || 0), 0);
  return String(max + 1);
}

export function toPublicUser(entry) {
  if (!entry) return null;
  return {
    id: String(entry.id),
    email: entry.email || '',
    prenom: entry.prenom || entry.first_name || '',
    nom: entry.nom || entry.last_name || '',
    phone: entry.telephone || entry.phone || '',
    telephone: entry.telephone || entry.phone || '',
    matricule: entry.matricule || '',
    grade: entry.grade || '',
    fonction: entry.fonction || '',
    is_active_access: entry.is_active_access !== false,
    must_change_password: !!entry.must_change_password,
  };
}

export function findLocalUserByEmail(email) {
  const needle = String(email || '').trim().toLowerCase();
  if (!needle) return null;
  return readAll().find((u) => String(u.email || '').toLowerCase() === needle) || null;
}

export function findLocalUserById(id) {
  const sid = String(id ?? '');
  return readAll().find((u) => String(u.id) === sid) || null;
}

export function createLocalUser({
  email,
  prenom = '',
  nom = '',
  telephone = '',
  matricule = '',
  grade = '',
  fonction = '',
  password = '',
} = {}) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new Error('E-mail requis.');
  const phone = String(telephone || '').trim();
  const pwd = String(password || phone || '').trim();
  if (!pwd) throw new Error('Mot de passe (téléphone) requis.');
  const users = readAll();
  if (users.some((u) => String(u.email || '').toLowerCase() === normalized)) {
    const err = new Error('Un utilisateur avec cet e-mail existe déjà.');
    err.response = { status: 409 };
    throw err;
  }
  const entry = {
    id: nextId(users),
    email: normalized,
    prenom,
    nom,
    telephone: phone,
    phone,
    matricule,
    grade,
    fonction,
    password: pwd,
    is_active_access: true,
    must_change_password: true,
    created_at: new Date().toISOString(),
  };
  users.push(entry);
  writeAll(users);
  return toPublicUser(entry);
}

export function updateLocalUserPassword(emailOrId, newPassword) {
  const users = readAll();
  const needle = String(emailOrId || '').trim().toLowerCase();
  const idx = users.findIndex(
    (u) =>
      String(u.email || '').toLowerCase() === needle || String(u.id) === String(emailOrId),
  );
  if (idx < 0) return null;
  users[idx] = {
    ...users[idx],
    password: String(newPassword),
    must_change_password: false,
  };
  writeAll(users);
  return toPublicUser(users[idx]);
}

export function authenticateLocal(email, password) {
  const user = findLocalUserByEmail(email);
  if (!user) return null;
  const raw = readAll().find((u) => String(u.id) === String(user.id));
  if (!raw || raw.is_active_access === false) return null;
  if (String(raw.password) !== String(password)) return null;
  return {
    user: toPublicUser(raw),
    token: localTokenForUserId(raw.id),
    mustChangePassword: !!raw.must_change_password,
  };
}

export function localTokenForUserId(id) {
  return `${TOKEN_PREFIX}${id}`;
}

export function userIdFromLocalToken(token) {
  const t = String(token || '');
  if (!t.startsWith(TOKEN_PREFIX)) return null;
  return t.slice(TOKEN_PREFIX.length) || null;
}
