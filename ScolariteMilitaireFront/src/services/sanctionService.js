import { eleveService } from './eleveService';
import { sanctionNatureLabel } from '../data/sanctionCatalog';
import { apiPaths } from './apiPaths';
import {
  apiDelete,
  apiList,
  apiPatch,
  apiPost,
  notifyChanged,
  toFormData,
  withExpectedVersion,
} from '../utils/opsApi';

export const SANCTIONS_CHANGED = 'esp-sanctions-changed';

function mapSanction(raw) {
  return {
    id: raw.id,
    eleveId: String(raw.eleve),
    code: raw.code ?? '',
    motif: raw.motif ?? '',
    nature: raw.nature ?? 'avertissement',
    dateDebut: raw.date_debut ?? '',
    dateFin: raw.date_fin ?? '',
    statut: raw.statut ?? 'en_cours',
    crPdf: raw.cr_pdf ? { url: raw.cr_pdf } : null,
    pjPdf: raw.pj_pdf ? { url: raw.pj_pdf } : null,
    rowVersion: raw.row_version ?? 1,
  };
}

function scolariteFields(eleve) {
  const s = eleve.scolarite ?? {};
  return {
    departement: s.departement ?? s.filiere ?? eleve.filiere ?? eleve.departement ?? '',
    niveau: s.niveau ?? eleve.cycle ?? eleve.niveau ?? '',
  };
}

function filterStudentRows(rows, filters = {}) {
  let list = rows ?? [];
  const q = (filters.q ?? '').toLowerCase().trim();
  if (q) {
    list = list.filter(
      (e) =>
        e.nom?.toLowerCase().includes(q) ||
        e.prenom?.toLowerCase().includes(q) ||
        String(e.matricule ?? '').toLowerCase().includes(q),
    );
  }
  if (filters.departement) {
    const d = filters.departement;
    list = list.filter(
      (e) => e.departement === d || e.departement?.startsWith(`${d} `) || e.departement?.startsWith(d),
    );
  }
  if (filters.niveau) list = list.filter((e) => e.niveau === filters.niveau);
  if (filters.sanction === 'with') list = list.filter((e) => (e.nbSanctions ?? 0) > 0);
  if (filters.sanction === 'without') list = list.filter((e) => (e.nbSanctions ?? 0) === 0);
  if (filters.statut === 'en_cours') list = list.filter((e) => (e.enCours ?? 0) > 0);
  return list;
}

export const sanctionService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.listAllPages({ q: filters.q });
    const all = (await apiList(apiPaths.sanctions.list)).map(mapSanction);
    const byEleve = {};
    all.forEach((s) => {
      const id = String(s.eleveId);
      if (!byEleve[id]) byEleve[id] = [];
      byEleve[id].push(s);
    });
    const enriched = eleves.map((eleve) => {
      const { departement, niveau } = scolariteFields(eleve);
      const items = byEleve[String(eleve.id)] ?? [];
      const last = items[0] ?? null;
      return {
        id: eleve.id,
        matricule: eleve.matricule ?? '',
        nom: eleve.nom ?? '',
        prenom: eleve.prenom ?? '',
        photoUrl: eleve.photoUrl ?? null,
        departement,
        niveau,
        nbSanctions: items.length,
        enCours: items.filter((s) => s.statut === 'en_cours').length,
        derniereDate: last?.dateDebut ?? null,
        derniereNature: last ? sanctionNatureLabel(last.nature) : '',
        derniereMotif: last?.motif ?? '',
      };
    });
    return filterStudentRows(enriched, filters);
  },

  async getStudent(eleveId, listRow = null) {
    let eleve = null;
    try {
      eleve = await eleveService.get(eleveId);
    } catch {
      eleve = null;
    }
    if (!eleve && listRow) {
      eleve = {
        id: listRow.id,
        matricule: listRow.matricule,
        nom: listRow.nom,
        prenom: listRow.prenom,
        photoUrl: listRow.photoUrl,
        scolarite: { departement: listRow.departement, niveau: listRow.niveau },
      };
    }
    if (!eleve) return null;
    const sanctions = (await apiList(apiPaths.sanctions.list, { eleve: eleveId })).map(mapSanction);
    const { departement, niveau } = scolariteFields(eleve);
    return { ...eleve, departement, niveau, sanctions, nbSanctions: sanctions.length };
  },

  async getSanctions(eleveId) {
    return (await apiList(apiPaths.sanctions.list, { eleve: eleveId })).map(mapSanction);
  },

  async addSanction(eleveId, payload, files = {}) {
    const body = toFormData({
      eleve: eleveId,
      code: payload.code ?? '',
      motif: payload.motif ?? '',
      nature: payload.nature ?? 'avertissement',
      date_debut: payload.dateDebut ?? '',
      date_fin: payload.dateFin ?? '',
      statut: payload.statut ?? 'en_cours',
      cr_pdf: files.crPdf instanceof File ? files.crPdf : undefined,
      pj_pdf: files.pjPdf instanceof File ? files.pjPdf : undefined,
    });
    const raw = await apiPost(apiPaths.sanctions.list, body, { headers: { 'Content-Type': 'multipart/form-data' } });
    notifyChanged(SANCTIONS_CHANGED);
    return mapSanction(raw);
  },

  async updateSanction(itemId, payload, files = {}) {
    const body = withExpectedVersion(
      toFormData({
        code: payload.code,
        motif: payload.motif,
        nature: payload.nature,
        date_debut: payload.dateDebut,
        date_fin: payload.dateFin,
        statut: payload.statut,
        cr_pdf: files.crPdf instanceof File ? files.crPdf : undefined,
        pj_pdf: files.pjPdf instanceof File ? files.pjPdf : undefined,
      }),
      payload.rowVersion,
    );
    const raw = await apiPatch(apiPaths.sanctions.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(SANCTIONS_CHANGED);
    return mapSanction(raw);
  },

  async deleteSanction(itemId, rowVersion) {
    await apiDelete(apiPaths.sanctions.detail(itemId), {
      data: withExpectedVersion({}, rowVersion),
    });
    notifyChanged(SANCTIONS_CHANGED);
  },

  async updateSanctionPdf(itemId, field, file, rowVersion) {
    const key = field === 'crPdf' || field === 'cr_pdf' ? 'cr_pdf' : 'pj_pdf';
    const body = withExpectedVersion(toFormData({ [key]: file }), rowVersion);
    const raw = await apiPatch(apiPaths.sanctions.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(SANCTIONS_CHANGED);
    return mapSanction(raw);
  },
};
