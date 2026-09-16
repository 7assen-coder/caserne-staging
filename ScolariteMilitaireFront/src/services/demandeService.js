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

export const DEMANDES_CHANGED = 'esp-demandes-changed';

function mapDemande(raw) {
  return {
    id: raw.id,
    eleveId: String(raw.eleve),
    code: raw.code ?? '',
    description: raw.description ?? '',
    nature: raw.nature ?? 'divers',
    dateDepot: raw.date_depot ?? '',
    statut: raw.statut ?? 'en_cours',
    demandePdf: raw.demande_pdf ? { url: raw.demande_pdf } : null,
    pjPdf: raw.pj_pdf ? { url: raw.pj_pdf } : null,
    rowVersion: raw.row_version ?? 1,
  };
}

function scolariteFields(eleve) {
  const s = eleve.scolarite ?? {};
  return {
    departement: s.departement ?? s.filiere ?? eleve.filiere ?? '',
    niveau: s.niveau ?? eleve.cycle ?? '',
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
  return list;
}

export const demandeService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.listAllPages({ q: filters.q });
    const all = (await apiList(apiPaths.demandes.list)).map(mapDemande);
    const byEleve = {};
    all.forEach((d) => {
      const id = String(d.eleveId);
      if (!byEleve[id]) byEleve[id] = [];
      byEleve[id].push(d);
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
        nbDemandes: items.length,
        enCours: items.filter((d) => d.statut === 'en_cours').length,
        derniereDate: last?.dateDepot ?? null,
        derniereNature: last?.nature ?? '',
        derniereDescription: last?.description ?? '',
        derniereLabel: last
          ? `${last.dateDepot ?? ''} · ${last.nature ?? ''}`.trim()
          : '',
      };
    });
    return filterStudentRows(enriched, filters);
  },

  async getStudent(eleveId, listRow = null) {
    let eleve = await eleveService.get(eleveId).catch(() => null);
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
    const demandes = (await apiList(apiPaths.demandes.list, { eleve: eleveId })).map(mapDemande);
    const { departement, niveau } = scolariteFields(eleve);
    return { ...eleve, departement, niveau, demandes, nbDemandes: demandes.length };
  },

  async addDemande(eleveId, payload, files = {}) {
    const body = toFormData({
      eleve: eleveId,
      code: payload.code ?? '',
      description: payload.description ?? '',
      nature: payload.nature ?? 'divers',
      date_depot: payload.dateDepot ?? '',
      statut: payload.statut ?? 'en_cours',
      demande_pdf: files.demandePdf instanceof File ? files.demandePdf : undefined,
      pj_pdf: files.pjPdf instanceof File ? files.pjPdf : undefined,
    });
    const raw = await apiPost(apiPaths.demandes.list, body, { headers: { 'Content-Type': 'multipart/form-data' } });
    notifyChanged(DEMANDES_CHANGED);
    return mapDemande(raw);
  },

  async updateDemande(itemId, payload, files = {}) {
    const body = withExpectedVersion(
      toFormData({
        code: payload.code,
        description: payload.description,
        nature: payload.nature,
        date_depot: payload.dateDepot,
        statut: payload.statut,
        demande_pdf: files.demandePdf instanceof File ? files.demandePdf : undefined,
        pj_pdf: files.pjPdf instanceof File ? files.pjPdf : undefined,
      }),
      payload.rowVersion,
    );
    const raw = await apiPatch(apiPaths.demandes.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(DEMANDES_CHANGED);
    return mapDemande(raw);
  },

  async deleteDemande(itemId, rowVersion) {
    await apiDelete(apiPaths.demandes.detail(itemId), {
      data: withExpectedVersion({}, rowVersion),
    });
    notifyChanged(DEMANDES_CHANGED);
  },

  async updateDemandePdf(itemId, field, file, rowVersion) {
    const key = field === 'demandePdf' || field === 'demande_pdf' ? 'demande_pdf' : 'pj_pdf';
    const body = withExpectedVersion(toFormData({ [key]: file }), rowVersion);
    const raw = await apiPatch(apiPaths.demandes.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(DEMANDES_CHANGED);
    return mapDemande(raw);
  },
};
