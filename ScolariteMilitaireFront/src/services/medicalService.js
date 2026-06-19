import { eleveService } from './eleveService';
import { consultationTypeLabel } from '../data/medicalCatalog';
import { computeAge } from '../utils/formatters';
import {
  addConsultation,
  countConsultationsByEleveId,
  deleteConsultation,
  findConsultationById,
  getConsultationsByEleveId,
  getLastConsultationByEleveId,
  mergeMedicalProfile,
  updateConsultation,
  upsertMedicalProfile,
} from '../utils/medicalStore';

function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: reader.result,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
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
        String(e.matricule ?? '').toLowerCase().includes(q) ||
        String(e.groupeSanguin ?? '').toLowerCase().includes(q),
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
  if (filters.medical === 'with') {
    list = list.filter((e) => (e.nbConsultations ?? 0) > 0);
  }
  if (filters.medical === 'without') {
    list = list.filter((e) => (e.nbConsultations ?? 0) === 0);
  }
  if (filters.type === 'consultation' || filters.type === 'incident') {
    list = list.filter((e) => (e[`has${filters.type === 'consultation' ? 'Consultation' : 'Incident'}`] ?? false));
  }
  return list;
}

function toListRow(eleve) {
  const { departement, niveau } = scolariteFields(eleve);
  const last = getLastConsultationByEleveId(eleve.id);
  const items = getConsultationsByEleveId(eleve.id);
  const age = computeAge(eleve.dateNaissance);
  return {
    id: eleve.id,
    matricule: eleve.matricule ?? '',
    nom: eleve.nom ?? '',
    prenom: eleve.prenom ?? '',
    photoUrl: eleve.photoUrl ?? null,
    departement,
    niveau,
    age: age ?? null,
    groupeSanguin: eleve.sante?.groupeSanguin ?? '',
    nbConsultations: countConsultationsByEleveId(eleve.id),
    hasConsultation: items.some((c) => c.type === 'consultation'),
    hasIncident: items.some((c) => c.type === 'incident'),
    derniereDate: last?.dateConsultation ?? null,
    derniereMotif: last?.motif ?? '',
    derniereType: last ? consultationTypeLabel(last.type) : '',
  };
}

export const medicalService = {
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
        dateNaissance: listRow.dateNaissance ?? '',
        sante: { groupeSanguin: listRow.groupeSanguin ?? '' },
        scolarite: { departement: listRow.departement, niveau: listRow.niveau },
      };
    }

    if (!eleve) return null;

    const { departement, niveau } = scolariteFields(eleve);
    const profile = mergeMedicalProfile(eleveId, eleve.sante ?? {});
    return {
      ...eleve,
      departement,
      niveau,
      age: computeAge(eleve.dateNaissance),
      medicalProfile: profile,
      consultations: getConsultationsByEleveId(eleveId),
    };
  },

  async updateProfile(eleveId, payload, { dossierFile = null, photoFile = null } = {}) {
    const patch = { ...payload };
    if (dossierFile instanceof File) patch.dossierMedicalPdf = await fileToAttachment(dossierFile);
    if (photoFile instanceof File) patch.photoMedicale = await fileToAttachment(photoFile);
    return upsertMedicalProfile(eleveId, patch);
  },

  async addConsultation(eleveId, payload, { pjFile = null } = {}) {
    let pjPdf = null;
    if (pjFile instanceof File) pjPdf = await fileToAttachment(pjFile);
    return addConsultation({ ...payload, eleveId, pjPdf });
  },

  async updateConsultation(consultationId, payload, { pjFile } = {}) {
    const patch = { ...payload };
    if (pjFile instanceof File) patch.pjPdf = await fileToAttachment(pjFile);
    return updateConsultation(consultationId, patch);
  },

  async updateConsultationPdf(consultationId, file) {
    if (!(file instanceof File)) {
      return updateConsultation(consultationId, { pjPdf: null });
    }
    const attachment = await fileToAttachment(file);
    return updateConsultation(consultationId, { pjPdf: attachment });
  },

  deleteConsultation(consultationId) {
    return deleteConsultation(consultationId);
  },

  findConsultation(consultationId) {
    return findConsultationById(consultationId);
  },
};
