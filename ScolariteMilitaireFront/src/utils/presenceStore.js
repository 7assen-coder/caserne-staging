const STORAGE_KEY = 'esp_presence_appels_v1';
export const PRESENCE_CHANGED = 'esp-presence-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PRESENCE_CHANGED));
  }
}

export function loadAppels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAppels(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

function newId() {
  return `appel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listAppels(filters = {}) {
  let list = [...loadAppels()].sort((a, b) =>
    String(b.date ?? '').localeCompare(String(a.date ?? '')),
  );
  const q = (filters.q ?? '').toLowerCase().trim();
  if (q) {
    list = list.filter(
      (a) =>
        a.section?.toLowerCase().includes(q) ||
        a.superviseur?.toLowerCase().includes(q) ||
        a.compagnie?.toLowerCase().includes(q),
    );
  }
  if (filters.section) {
    list = list.filter((a) => a.section === filters.section);
  }
  if (filters.type) {
    list = list.filter((a) => a.type === filters.type);
  }
  return list;
}

export function getAppel(id) {
  return loadAppels().find((a) => String(a.id) === String(id)) ?? null;
}

export function addAppel(payload) {
  const item = {
    id: newId(),
    date: new Date().toISOString(),
    statut: payload.statut ?? 'transmis',
    section: payload.section ?? '',
    type: payload.type ?? 'matin',
    compagnie: payload.compagnie ?? '',
    superviseur: payload.superviseur ?? '',
    total: payload.total ?? 0,
    presents: payload.presents ?? 0,
    absents: payload.absents ?? 0,
    detail: Array.isArray(payload.detail) ? payload.detail : [],
  };
  saveAppels([item, ...loadAppels()]);
  return item;
}

/** Taux de présence par section (derniers appels enregistrés). */
export function computePresenceParSection() {
  const appels = loadAppels();
  if (!appels.length) return [];

  const bySection = {};
  appels.forEach((a) => {
    if (!a.section) return;
    if (!bySection[a.section]) {
      bySection[a.section] = { section: a.section, totalP: 0, totalE: 0, count: 0 };
    }
    bySection[a.section].totalP += a.presents ?? 0;
    bySection[a.section].totalE += a.total ?? 0;
    bySection[a.section].count += 1;
  });

  return Object.values(bySection).map((row) => ({
    section: row.section,
    taux: row.totalE ? Math.round((row.totalP / row.totalE) * 100) : 0,
  }));
}

/** Évolution sur 7 jours glissants à partir des appels enregistrés. */
export function computePresenceTrend() {
  const appels = loadAppels();
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayAppels = appels.filter((a) => String(a.date ?? '').slice(0, 10) === key);
    const presents = dayAppels.reduce((s, a) => s + (a.presents ?? 0), 0);
    const total = dayAppels.reduce((s, a) => s + (a.total ?? 0), 0);
    const absents = dayAppels.reduce((s, a) => s + (a.absents ?? 0), 0);
    days.push({
      jour: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      date: key,
      taux: total ? Math.round((presents / total) * 100) : 0,
      presents,
      absents,
    });
  }
  return days;
}

/** Top absences agrégées depuis l'historique des appels. */
export function computeTopAbsences(limit = 10) {
  const counts = {};
  loadAppels().forEach((appel) => {
    (appel.detail ?? []).forEach((d) => {
      if (d.statut !== 'absent') return;
      const key = String(d.eleveId ?? d.matricule);
      if (!counts[key]) {
        counts[key] = {
          eleveId: d.eleveId,
          eleve: d.nom ?? '—',
          matricule: d.matricule ?? '—',
          section: appel.section ?? '—',
          absences: 0,
          nonJustifiees: 0,
        };
      }
      counts[key].absences += 1;
      if (!d.motif || d.motif === 'non_justifie') {
        counts[key].nonJustifiees += 1;
      }
    });
  });

  return Object.values(counts)
    .sort((a, b) => b.absences - a.absences)
    .slice(0, limit);
}
