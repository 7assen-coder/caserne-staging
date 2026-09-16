import { eleveService } from './eleveService';
import { apiPaths } from './apiPaths';
import { parcoursToStatutAcademique, statutAcademiqueLabel } from '../utils/eleveScolariteAuto';
import { apiPatch, notifyChanged, withExpectedVersion } from '../utils/opsApi';

export const SCOLARITE_CHANGED = 'esp-scolarite-changed';

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
  if (filters.niveau) list = list.filter((e) => e.niveau === filters.niveau);
  if (filters.statut) list = list.filter((e) => e.statutAcademique === filters.statut);
  if (filters.mobilite === 'with') list = list.filter((e) => e.mobilite?.type);
  if (filters.mobilite === 'without') list = list.filter((e) => !e.mobilite?.type);
  return list;
}

function toListRow(eleve) {
  const s = eleve.scolarite ?? {};
  const statutAcademique =
    eleve.statutAcademique
    ?? parcoursToStatutAcademique(s.parcours)
    ?? parcoursToStatutAcademique(eleve.statut === 'suspendu' ? 'Exclu' : 'En cours normal');
  const mobilite = eleve.mobilite?.type ? eleve.mobilite : null;
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
    semestres: eleve.semestres ?? {},
    mobilite,
    mobiliteLabel: mobilite?.type
      ? `${mobilite.type}${mobilite.etablissement ? ` · ${mobilite.etablissement}` : ''}`
      : '',
    rowVersion: eleve.rowVersion ?? eleve.row_version ?? 1,
  };
}

export const scolariteService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.listAllPages({ q: filters.q });
    const enriched = eleves.map((eleve) => toListRow(eleve));
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
        scolarite: { departement: listRow.departement, niveau: listRow.niveau },
        mobilite: listRow.mobilite ?? null,
        semestres: listRow.semestres ?? {},
        relevesSemestres: [],
      };
    }
    if (!eleve) return null;
    const row = toListRow(eleve);
    return { ...eleve, ...row, relevesSemestres: eleve.relevesSemestres ?? [], scolarite: eleve.scolarite ?? {} };
  },

  async updateSemestre(eleveId, semestreKey, value, rowVersion) {
    const data = await apiPatch(
      apiPaths.eleves.scolariteSemestres(eleveId),
      withExpectedVersion(
        {
          code: semestreKey,
          statut: value || '',
        },
        rowVersion,
      ),
    );
    notifyChanged(SCOLARITE_CHANGED);
    return {
      eleveId: String(eleveId),
      semestres: data.semestres ?? {},
      mobilite: null,
      rowVersion: data.row_version ?? rowVersion,
    };
  },

  async updateMobilite(eleveId, mobilite, rowVersion) {
    const data = await apiPatch(
      apiPaths.eleves.scolariteMobilite(eleveId),
      withExpectedVersion(mobilite ?? {}, rowVersion),
    );
    notifyChanged(SCOLARITE_CHANGED);
    return {
      eleveId: String(eleveId),
      semestres: {},
      mobilite: data.mobilite ?? null,
      rowVersion: data.row_version ?? rowVersion,
    };
  },
};
