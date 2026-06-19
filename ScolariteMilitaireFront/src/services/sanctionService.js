import { eleveService } from './eleveService';
import {
  addSanction,
  countSanctionsByEleveId,
  deleteSanction,
  findSanctionById,
  getLastSanctionByEleveId,
  getSanctionsByEleveId,
  updateSanction,
} from '../utils/sanctionStore';
import { sanctionNatureLabel } from '../data/sanctionCatalog';

function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        mimeType: file.type || 'application/pdf',
        dataUrl: reader.result,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier PDF.'));
    reader.readAsDataURL(file);
  });
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
      (e) =>
        e.departement === d
        || e.departement?.startsWith(`${d} `)
        || e.departement?.startsWith(d),
    );
  }
  if (filters.niveau) {
    list = list.filter((e) => e.niveau === filters.niveau);
  }
  if (filters.sanction === 'with') {
    list = list.filter((e) => (e.nbSanctions ?? 0) > 0);
  }
  if (filters.sanction === 'without') {
    list = list.filter((e) => (e.nbSanctions ?? 0) === 0);
  }
  if (filters.statut === 'en_cours') {
    list = list.filter((e) => (e.enCours ?? 0) > 0);
  }
  return list;
}

function toListRow(eleve) {
  const { departement, niveau } = scolariteFields(eleve);
  const last = getLastSanctionByEleveId(eleve.id);
  const items = getSanctionsByEleveId(eleve.id);
  const enCours = items.filter((s) => s.statut === 'en_cours').length;
  return {
    id: eleve.id,
    matricule: eleve.matricule ?? '',
    nom: eleve.nom ?? '',
    prenom: eleve.prenom ?? '',
    photoUrl: eleve.photoUrl ?? null,
    departement,
    niveau,
    nbSanctions: countSanctionsByEleveId(eleve.id),
    enCours,
    derniereDate: last?.dateDebut ?? null,
    derniereNature: last ? sanctionNatureLabel(last.nature) : '',
    derniereMotif: last?.motif ?? '',
  };
}

export const sanctionService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.list({ q: filters.q });
    const enriched = eleves.map((e) => toListRow(e));
    return filterStudentRows(enriched, filters);
  },

  async getStudent(eleveId, listRow = null) {
    let eleve = null;
    try {
      eleve = await eleveService.get(eleveId);
    } catch {
      eleve = null;
    }

    if (!eleve && listRow && String(listRow.id) === String(eleveId)) {
      eleve = {
        id: listRow.id,
        matricule: listRow.matricule,
        nom: listRow.nom,
        prenom: listRow.prenom,
        photoUrl: listRow.photoUrl,
        scolarite: {
          departement: listRow.departement,
          niveau: listRow.niveau,
        },
      };
    }

    if (!eleve) return null;

    const { departement, niveau } = scolariteFields(eleve);
    return {
      ...eleve,
      departement,
      niveau,
      sanctions: getSanctionsByEleveId(eleveId),
    };
  },

  getSanctions(eleveId) {
    return getSanctionsByEleveId(eleveId);
  },

  async addSanction(eleveId, payload, { crFile = null, pjFile = null } = {}) {
    let crPdf = null;
    let pjPdf = null;
    if (crFile instanceof File) crPdf = await fileToAttachment(crFile);
    if (pjFile instanceof File) pjPdf = await fileToAttachment(pjFile);
    return addSanction({ ...payload, eleveId, crPdf, pjPdf });
  },

  async updateSanction(
    sanctionId,
    payload,
    { crFile, pjFile, clearCr = false, clearPj = false } = {},
  ) {
    const patch = { ...payload };
    if (clearCr) patch.crPdf = null;
    else if (crFile instanceof File) patch.crPdf = await fileToAttachment(crFile);
    if (clearPj) patch.pjPdf = null;
    else if (pjFile instanceof File) patch.pjPdf = await fileToAttachment(pjFile);
    return updateSanction(sanctionId, patch);
  },

  async updateSanctionPdf(sanctionId, field, file) {
    if (field !== 'crPdf' && field !== 'pjPdf') return null;
    if (!(file instanceof File)) {
      return updateSanction(sanctionId, { [field]: null });
    }
    const attachment = await fileToAttachment(file);
    return updateSanction(sanctionId, { [field]: attachment });
  },

  deleteSanction(sanctionId) {
    return deleteSanction(sanctionId);
  },

  findSanction(sanctionId) {
    return findSanctionById(sanctionId);
  },
};
