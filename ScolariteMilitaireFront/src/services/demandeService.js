import { eleveService } from './eleveService';
import { demandeNatureLabel } from '../data/demandeCatalog';
import {
  addDemande,
  countDemandesByEleveId,
  deleteDemande,
  findDemandeById,
  getDemandesByEleveId,
  getLastDemandeByEleveId,
  updateDemande,
} from '../utils/demandeStore';

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
  if (filters.demande === 'with') {
    list = list.filter((e) => (e.nbDemandes ?? 0) > 0);
  }
  if (filters.demande === 'without') {
    list = list.filter((e) => (e.nbDemandes ?? 0) === 0);
  }
  if (filters.statut === 'en_cours') {
    list = list.filter((e) => (e.enCours ?? 0) > 0);
  }
  return list;
}

function toListRow(eleve) {
  const { departement, niveau } = scolariteFields(eleve);
  const last = getLastDemandeByEleveId(eleve.id);
  const items = getDemandesByEleveId(eleve.id);
  const enCours = items.filter((d) => d.statut === 'en_cours').length;
  return {
    id: eleve.id,
    matricule: eleve.matricule ?? '',
    nom: eleve.nom ?? '',
    prenom: eleve.prenom ?? '',
    photoUrl: eleve.photoUrl ?? null,
    departement,
    niveau,
    nbDemandes: countDemandesByEleveId(eleve.id),
    enCours,
    derniereDate: last?.dateDepot ?? null,
    derniereNature: last ? demandeNatureLabel(last.nature) : '',
    derniereDescription: last?.description ?? '',
  };
}

export const demandeService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.list({ q: filters.q });
    return filterStudentRows(eleves.map((e) => toListRow(e)), filters);
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
        scolarite: { departement: listRow.departement, niveau: listRow.niveau },
      };
    }

    if (!eleve) return null;

    const { departement, niveau } = scolariteFields(eleve);
    return {
      ...eleve,
      departement,
      niveau,
      demandes: getDemandesByEleveId(eleveId),
    };
  },

  async addDemande(eleveId, payload, { demandeFile = null, pjFile = null } = {}) {
    let demandePdf = null;
    let pjPdf = null;
    if (demandeFile instanceof File) demandePdf = await fileToAttachment(demandeFile);
    if (pjFile instanceof File) pjPdf = await fileToAttachment(pjFile);
    return addDemande({ ...payload, eleveId, demandePdf, pjPdf });
  },

  async updateDemande(demandeId, payload, { demandeFile, pjFile } = {}) {
    const patch = { ...payload };
    if (demandeFile instanceof File) patch.demandePdf = await fileToAttachment(demandeFile);
    if (pjFile instanceof File) patch.pjPdf = await fileToAttachment(pjFile);
    return updateDemande(demandeId, patch);
  },

  async updateDemandePdf(demandeId, field, file) {
    if (field !== 'demandePdf' && field !== 'pjPdf') return null;
    if (!(file instanceof File)) {
      return updateDemande(demandeId, { [field]: null });
    }
    const attachment = await fileToAttachment(file);
    return updateDemande(demandeId, { [field]: attachment });
  },

  deleteDemande(demandeId) {
    return deleteDemande(demandeId);
  },

  findDemande(demandeId) {
    return findDemandeById(demandeId);
  },
};
