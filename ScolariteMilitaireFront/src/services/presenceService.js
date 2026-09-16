import { apiGet, apiList, apiPost, notifyChanged } from '../utils/opsApi';
import { apiPaths } from './apiPaths';

export const PRESENCE_CHANGED = 'esp-presence-changed';

function mapAppel(raw) {
  const lignes = (raw.lignes ?? []).map((l) => ({
    eleveId: String(l.eleve),
    matricule: l.eleve_matricule ?? '',
    nom: l.eleve_nom ?? '',
    statut: l.statut,
    motif: l.motif,
  }));
  return {
    id: raw.id,
    date: raw.date,
    statut: raw.statut,
    section: raw.section,
    type: raw.type,
    compagnie: raw.compagnie,
    superviseur: raw.superviseur,
    total: raw.total ?? lignes.length,
    presents: raw.presents ?? lignes.filter((l) => l.statut === 'present').length,
    absents: raw.absents ?? lignes.filter((l) => l.statut === 'absent').length,
    detail: lignes,
  };
}

export const presenceService = {
  async list(filters = {}) {
    const params = {};
    if (filters.compagnie) params.compagnie = filters.compagnie;
    if (filters.section) params.section = filters.section;
    return (await apiList(apiPaths.appels.list, params)).map(mapAppel);
  },

  async get(id) {
    if (!id) return null;
    return mapAppel(await apiGet(apiPaths.appels.detail(id)));
  },

  async create(data) {
    const appel = await apiPost(apiPaths.appels.list, {
      date: data.date || new Date().toISOString(),
      statut: data.statut || 'transmis',
      section: data.section || '',
      type: data.type || 'matin',
      compagnie: data.compagnie || '',
      superviseur: data.superviseur || '',
    });
    const lignes = (data.detail ?? []).map((d) => ({
      eleve: d.eleveId,
      statut: d.statut || 'present',
      motif: d.motif || null,
    }));
    if (lignes.length) {
      await apiPost(apiPaths.appels.lignes(appel.id), { lignes });
    }
    notifyChanged(PRESENCE_CHANGED);
    return this.get(appel.id);
  },

  async trend() {
    const appels = await this.list();
    return appels.slice(0, 12).map((a) => ({
      date: a.date,
      presents: a.presents,
      absents: a.absents,
      total: a.total,
    }));
  },

  async parSection() {
    const appels = await this.list();
    const map = {};
    appels.forEach((a) => {
      const key = a.section || '—';
      if (!map[key]) map[key] = { section: key, presents: 0, absents: 0, total: 0 };
      map[key].presents += a.presents;
      map[key].absents += a.absents;
      map[key].total += a.total;
    });
    return Object.values(map);
  },

  async topAbsences() {
    const appels = await this.list();
    const counts = {};
    appels.forEach((a) => {
      (a.detail ?? []).forEach((d) => {
        if (d.statut !== 'absent') return;
        const key = d.eleveId;
        if (!counts[key]) counts[key] = { eleveId: key, matricule: d.matricule, nom: d.nom, absences: 0 };
        counts[key].absences += 1;
      });
    });
    return Object.values(counts).sort((a, b) => b.absences - a.absences).slice(0, 20);
  },
};
