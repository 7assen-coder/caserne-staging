import { eleveService } from './eleveService';
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

export const JOURNAL_CHANGED = 'esp-journal-changed';

function mapEntry(raw) {
  return {
    id: raw.id,
    eleveId: String(raw.eleve),
    code: raw.code ?? '',
    type: raw.type ?? 'observation',
    date: raw.date ?? '',
    titre: raw.titre ?? '',
    contenu: raw.contenu ?? '',
    auteur: raw.auteur ?? '',
    pjPdf: raw.pj_pdf ? { url: raw.pj_pdf } : null,
    rowVersion: raw.row_version ?? 1,
  };
}

export const journalService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.listAllPages({ q: filters.q });
    const all = (await apiList(apiPaths.journal.list)).map(mapEntry);
    const byEleve = {};
    all.forEach((e) => {
      const id = String(e.eleveId);
      if (!byEleve[id]) byEleve[id] = [];
      byEleve[id].push(e);
    });
    return eleves.map((el) => {
      const items = byEleve[String(el.id)] ?? [];
      return {
        id: el.id,
        matricule: el.matricule ?? '',
        nom: el.nom ?? '',
        prenom: el.prenom ?? '',
        photoUrl: el.photoUrl ?? null,
        departement: el.scolarite?.departement ?? '',
        niveau: el.scolarite?.niveau ?? '',
        nbEvenements: items.length,
        derniereDate: items[0]?.date ?? null,
        derniereTitre: items[0]?.titre ?? '',
      };
    });
  },

  async getStudent(eleveId) {
    const eleve = await eleveService.get(eleveId);
    if (!eleve) return null;
    const evenements = (await apiList(apiPaths.journal.list, { eleve: eleveId })).map(mapEntry);
    return { ...eleve, evenements };
  },

  async addEntry(eleveId, payload, files = {}) {
    const pdfFile = files?.pjPdf instanceof File ? files.pjPdf : files instanceof File ? files : null;
    const body = toFormData({
      eleve: eleveId,
      code: payload.code ?? '',
      type: payload.type ?? 'observation',
      date: payload.date || new Date().toISOString(),
      titre: payload.titre ?? '',
      contenu: payload.contenu ?? '',
      auteur: payload.auteur ?? '',
      source: 'manuel',
      pj_pdf: pdfFile || undefined,
    });
    const raw = await apiPost(apiPaths.journal.list, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(JOURNAL_CHANGED);
    return mapEntry(raw);
  },

  async updateEntry(itemId, payload, files = {}) {
    const pdfFile = files?.pjPdf instanceof File ? files.pjPdf : files instanceof File ? files : null;
    const body = withExpectedVersion(
      toFormData({
        code: payload.code,
        type: payload.type,
        date: payload.date,
        titre: payload.titre,
        contenu: payload.contenu,
        auteur: payload.auteur,
        pj_pdf: pdfFile || undefined,
      }),
      payload.rowVersion,
    );
    const raw = await apiPatch(apiPaths.journal.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(JOURNAL_CHANGED);
    return mapEntry(raw);
  },

  async deleteEntry(itemId, rowVersion) {
    await apiDelete(apiPaths.journal.detail(itemId), {
      data: withExpectedVersion({}, rowVersion),
    });
    notifyChanged(JOURNAL_CHANGED);
  },

  async updateEntryPdf(itemId, file, rowVersion) {
    const body = withExpectedVersion(toFormData({ pj_pdf: file }), rowVersion);
    const raw = await apiPatch(apiPaths.journal.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(JOURNAL_CHANGED);
    return mapEntry(raw);
  },
};
