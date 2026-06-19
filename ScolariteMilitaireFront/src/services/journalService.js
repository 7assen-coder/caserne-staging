import { eleveService } from './eleveService';
import {
  addJournalEntry,
  countJournalByEleveId,
  deleteJournalEntry,
  findJournalEntryById,
  getJournalByEleveId,
  getLastJournalByEleveId,
  updateJournalEntry,
} from '../utils/journalStore';
import { journalTypeLabel } from '../data/journalCatalog';

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
  if (filters.journal === 'with') {
    list = list.filter((e) => (e.nbEntrees ?? 0) > 0);
  }
  if (filters.journal === 'without') {
    list = list.filter((e) => (e.nbEntrees ?? 0) === 0);
  }
  if (filters.type) {
    list = list.filter((e) => e.dernierTypeValue === filters.type);
  }
  return list;
}

function toListRow(eleve) {
  const { departement, niveau } = scolariteFields(eleve);
  const last = getLastJournalByEleveId(eleve.id);
  return {
    id: eleve.id,
    matricule: eleve.matricule ?? '',
    nom: eleve.nom ?? '',
    prenom: eleve.prenom ?? '',
    photoUrl: eleve.photoUrl ?? null,
    departement,
    niveau,
    nbEntrees: countJournalByEleveId(eleve.id),
    derniereDate: last?.date ?? null,
    dernierTypeValue: last?.type ?? '',
    dernierType: last ? journalTypeLabel(last.type) : '',
    dernierTitre: last?.titre ?? '',
  };
}

export const journalService = {
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
      entrees: getJournalByEleveId(eleveId),
    };
  },

  getEntries(eleveId) {
    return getJournalByEleveId(eleveId);
  },

  async addEntry(eleveId, payload, { pjFile = null } = {}) {
    let pjPdf = null;
    if (pjFile instanceof File) pjPdf = await fileToAttachment(pjFile);
    return addJournalEntry({ ...payload, eleveId, pjPdf });
  },

  async updateEntry(entryId, payload, { pjFile, clearPj = false } = {}) {
    const patch = { ...payload };
    if (clearPj) patch.pjPdf = null;
    else if (pjFile instanceof File) patch.pjPdf = await fileToAttachment(pjFile);
    return updateJournalEntry(entryId, patch);
  },

  async updateEntryPdf(entryId, file) {
    if (!(file instanceof File)) {
      return updateJournalEntry(entryId, { pjPdf: null });
    }
    const attachment = await fileToAttachment(file);
    return updateJournalEntry(entryId, { pjPdf: attachment });
  },

  deleteEntry(entryId) {
    return deleteJournalEntry(entryId);
  },

  findEntry(entryId) {
    return findJournalEntryById(entryId);
  },
};
