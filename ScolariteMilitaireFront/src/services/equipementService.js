import { eleveService } from './eleveService';
import {
  addEquipementItem,
  countItemsByEleveId,
  deleteEquipementItem,
  findEquipementItemById,
  getItemsByEleveId,
  returnEquipementItem,
  updateEquipementItem,
} from '../utils/equipementStore';

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
    list = list.filter(
      (e) =>
        (e.dossierMilitaire?.section ?? e.section) === filters.section,
    );
  }
  if (filters.compagnie) {
    list = list.filter(
      (e) =>
        (e.dossierMilitaire?.compagnie ?? e.compagnie) === filters.compagnie,
    );
  }
  return list;
}

function toListRow(eleve) {
  const section = eleve.dossierMilitaire?.section ?? eleve.section ?? '';
  return {
    id: eleve.id,
    matricule: eleve.matricule ?? '',
    nom: eleve.nom ?? '',
    prenom: eleve.prenom ?? '',
    section,
    nbItems: countItemsByEleveId(eleve.id),
    photoUrl: eleve.photoUrl ?? null,
  };
}

export const equipementService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.list(filters);
    const filtered = filterStudentRows(eleves, filters);
    return filtered.map((e) => ({
      ...toListRow(e),
      nbItems: countItemsByEleveId(e.id),
    }));
  },

  async getStudent(eleveId) {
    const eleve = await eleveService.get(eleveId);
    if (!eleve) return null;
    return {
      ...eleve,
      section: eleve.dossierMilitaire?.section ?? eleve.section ?? '',
      items: getItemsByEleveId(eleveId),
    };
  },

  getItems(eleveId) {
    return getItemsByEleveId(eleveId);
  },

  async addItem(eleveId, payload, pdfFile = null) {
    let pdfAttachment = null;
    if (pdfFile instanceof File) {
      pdfAttachment = await fileToAttachment(pdfFile);
    }
    return addEquipementItem({ ...payload, eleveId, pdfAttachment });
  },

  async updateItemPdf(itemId, pdfFile) {
    if (!(pdfFile instanceof File)) {
      return updateEquipementItem(itemId, { pdfAttachment: null });
    }
    const pdfAttachment = await fileToAttachment(pdfFile);
    return updateEquipementItem(itemId, { pdfAttachment });
  },

  deleteItem(itemId) {
    return deleteEquipementItem(itemId);
  },

  returnItem(itemId, dateRetour) {
    return returnEquipementItem(itemId, dateRetour);
  },

  findItem(itemId) {
    return findEquipementItemById(itemId);
  },
};
