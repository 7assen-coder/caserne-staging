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

export const EQUIPEMENT_CHANGED = 'esp-equipement-changed';

function mapItem(raw) {
  return {
    id: raw.id,
    eleveId: String(raw.eleve),
    code: raw.code ?? '',
    type: raw.nature ?? '',
    description: raw.description ?? '',
    quantite: raw.quantite ?? 1,
    dateRemise: raw.date_remise ?? '',
    etat: raw.etat === 'rendu' ? 'rendu' : 'en_usage',
    dateRetour: raw.date_retour ?? null,
    pdfAttachment: raw.pdf ? { url: raw.pdf, name: 'piece.pdf' } : null,
    rowVersion: raw.row_version ?? 1,
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
  if (filters.section) {
    list = list.filter((e) => (e.dossierMilitaire?.section ?? e.section) === filters.section);
  }
  if (filters.compagnie) {
    list = list.filter((e) => (e.dossierMilitaire?.compagnie ?? e.compagnie) === filters.compagnie);
  }
  return list;
}

export const equipementService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.listAllPages(filters);
    const items = await apiList(apiPaths.equipements.list);
    const countBy = {};
    items.forEach((it) => {
      const id = String(it.eleve);
      countBy[id] = (countBy[id] ?? 0) + 1;
    });
    return filterStudentRows(eleves, filters).map((e) => ({
      id: e.id,
      matricule: e.matricule ?? '',
      nom: e.nom ?? '',
      prenom: e.prenom ?? '',
      section: e.dossierMilitaire?.section ?? e.section ?? '',
      nbItems: countBy[String(e.id)] ?? 0,
      photoUrl: e.photoUrl ?? null,
    }));
  },

  async getStudent(eleveId) {
    const eleve = await eleveService.get(eleveId);
    if (!eleve) return null;
    const items = (await apiList(apiPaths.equipements.list, { eleve: eleveId })).map(mapItem);
    return {
      ...eleve,
      section: eleve.dossierMilitaire?.section ?? eleve.section ?? '',
      items,
    };
  },

  async getItems(eleveId) {
    return (await apiList(apiPaths.equipements.list, { eleve: eleveId })).map(mapItem);
  },

  async findItem(itemId) {
    const { apiGet } = await import('../utils/opsApi');
    return mapItem(await apiGet(apiPaths.equipements.detail(itemId)));
  },

  async addItem(eleveId, payload, pdfFile = null) {
    const body = toFormData({
      eleve: eleveId,
      code: payload.code ?? '',
      nature: payload.type ?? payload.nature ?? '',
      description: payload.description ?? '',
      quantite: payload.quantite ?? 1,
      date_remise: payload.dateRemise ?? '',
      etat: 'en_usage',
      pdf: pdfFile instanceof File ? pdfFile : undefined,
    });
    const raw = await apiPost(apiPaths.equipements.list, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(EQUIPEMENT_CHANGED);
    return mapItem(raw);
  },

  async updateItemPdf(itemId, pdfFile, rowVersion) {
    const body = withExpectedVersion(toFormData({ pdf: pdfFile }), rowVersion);
    const raw = await apiPatch(apiPaths.equipements.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(EQUIPEMENT_CHANGED);
    return mapItem(raw);
  },

  async deleteItem(itemId, rowVersion) {
    await apiDelete(apiPaths.equipements.detail(itemId), {
      data: withExpectedVersion({}, rowVersion),
    });
    notifyChanged(EQUIPEMENT_CHANGED);
  },

  async returnItem(itemId, dateRetour, rowVersion) {
    const raw = await apiPost(
      apiPaths.equipements.retour(itemId),
      withExpectedVersion({ date_retour: dateRetour || undefined }, rowVersion),
    );
    notifyChanged(EQUIPEMENT_CHANGED);
    return mapItem(raw);
  },
};
