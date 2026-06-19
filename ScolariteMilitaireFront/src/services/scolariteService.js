import { eleveService } from './eleveService';
import { parcoursToStatutAcademique, statutAcademiqueLabel } from '../utils/eleveScolariteAuto';
import {
  getScolariteByEleveId,
  updateMobiliteScolarite,
  updateSemestreValidation,
  upsertScolariteRecord,
} from '../utils/scolariteStore';

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
    list = list.filter((e) => {
      const dept = e.departement ?? '';
      return dept === d || dept.startsWith(`${d} `) || dept.startsWith(d);
    });
  }
  if (filters.niveau) {
    list = list.filter((e) => e.niveau === filters.niveau);
  }
  if (filters.statut) {
    list = list.filter((e) => e.statutAcademique === filters.statut);
  }
  if (filters.mobilite === 'with') {
    list = list.filter((e) => e.mobilite?.type);
  }
  if (filters.mobilite === 'without') {
    list = list.filter((e) => !e.mobilite?.type);
  }
  return list;
}

function mergeMobilite(eleve, record) {
  const fromEleve = eleve.mobilite ?? {};
  const fromStore = record?.mobilite ?? {};
  if (!fromStore?.type && !fromEleve?.type) return null;
  return {
    type: fromStore.type || fromEleve.type || '',
    etablissement: fromStore.etablissement || fromEleve.etablissement || '',
    specialite: fromStore.specialite || fromEleve.specialite || '',
    raison: fromStore.raison || fromEleve.raison || '',
    anneeDebut: fromStore.anneeDebut || fromEleve.anneeDebut || '',
    anneeFin: fromStore.anneeFin || fromEleve.anneeFin || '',
  };
}

function toListRow(eleve, record) {
  const s = eleve.scolarite ?? {};
  const statutAcademique =
    eleve.statutAcademique
    ?? parcoursToStatutAcademique(s.parcours)
    ?? parcoursToStatutAcademique(eleve.statut === 'suspendu' ? 'Exclu' : 'En cours normal');
  const mobilite = mergeMobilite(eleve, record);
  return {
    id: eleve.id,
    matricule: eleve.matricule ?? '',
    nom: eleve.nom ?? '',
    prenom: eleve.prenom ?? '',
    photoUrl: eleve.photoUrl ?? null,
    departement: s.departement ?? s.filiere ?? eleve.filiere ?? '',
    niveau: s.niveau ?? eleve.cycle ?? '',
    statutAcademique,
    statutLabel: statutAcademiqueLabel(statutAcademique),
    semestres: record?.semestres ?? {},
    mobilite,
    mobiliteLabel: mobilite?.type
      ? `${mobilite.type}${mobilite.etablissement ? ` · ${mobilite.etablissement}` : ''}`
      : '',
  };
}

export const scolariteService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.list({ q: filters.q });
    const enriched = eleves.map((eleve) => {
      const record = getScolariteByEleveId(eleve.id);
      return toListRow(eleve, record);
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

    if (!eleve && listRow && String(listRow.id) === String(eleveId)) {
      eleve = {
        id: listRow.id,
        matricule: listRow.matricule,
        nom: listRow.nom,
        prenom: listRow.prenom,
        photoUrl: listRow.photoUrl,
        statutAcademique: listRow.statutAcademique,
        scolarite: {
          departement: listRow.departement,
          niveau: listRow.niveau,
        },
        mobilite: listRow.mobilite ?? null,
        relevesSemestres: [],
      };
    }

    if (!eleve) return null;

    let record = getScolariteByEleveId(eleveId);
    if (!record) {
      record = upsertScolariteRecord(eleveId, { semestres: {}, mobilite: null });
    }
    const row = toListRow(eleve, record);
    return {
      ...eleve,
      ...row,
      relevesSemestres: eleve.relevesSemestres ?? [],
      scolarite: eleve.scolarite ?? {},
    };
  },

  updateSemestre(eleveId, semestreKey, value) {
    return updateSemestreValidation(eleveId, semestreKey, value);
  },

  updateMobilite(eleveId, mobilite) {
    return updateMobiliteScolarite(eleveId, mobilite);
  },
};
