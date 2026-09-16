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

export const MEDICAL_CHANGED = 'esp-medical-changed';

function mapConsultation(raw) {
  return {
    id: raw.id,
    eleveId: String(raw.eleve),
    code: raw.code ?? '',
    type: raw.type ?? 'consultation',
    motif: raw.motif ?? '',
    dateConsultation: raw.date_consultation ?? '',
    avisInfirmerie: raw.avis_infirmerie ?? '',
    pjPdf: raw.pj_pdf ? { url: raw.pj_pdf } : null,
    rowVersion: raw.row_version ?? 1,
  };
}

export const medicalService = {
  async listStudents(filters = {}) {
    const eleves = await eleveService.listAllPages({ q: filters.q });
    const all = (await apiList(apiPaths.consultations.list)).map(mapConsultation);
    const byEleve = {};
    all.forEach((c) => {
      const id = String(c.eleveId);
      if (!byEleve[id]) byEleve[id] = [];
      byEleve[id].push(c);
    });
    let rows = eleves.map((e) => {
      const items = byEleve[String(e.id)] ?? [];
      const last = items[0];
      return {
        id: e.id,
        matricule: e.matricule ?? '',
        nom: e.nom ?? '',
        prenom: e.prenom ?? '',
        photoUrl: e.photoUrl ?? null,
        age: e.age ?? '',
        groupeSanguin: e.sante?.groupeSanguin ?? '',
        nbConsultations: items.length,
        derniereDate: last?.dateConsultation ?? null,
        derniereMotif: last?.motif ?? '',
      };
    });
    const q = (filters.q ?? '').toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (e) =>
          e.nom?.toLowerCase().includes(q) ||
          e.prenom?.toLowerCase().includes(q) ||
          String(e.matricule ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  },

  async getStudent(eleveId) {
    const eleve = await eleveService.get(eleveId);
    if (!eleve) return null;
    const consultations = (await apiList(apiPaths.consultations.list, { eleve: eleveId })).map(
      mapConsultation,
    );
    return {
      ...eleve,
      consultations,
      medicalProfile: {
        eleveId: String(eleveId),
        maladiesChroniques: eleve.sante?.maladiesChroniques ?? '',
        medicaments: eleve.sante?.medicaments ?? '',
        dossierMedicalPdf: eleve.sante?.dossierMedicalPdf ?? null,
        photoMedicale: eleve.sante?.photoMedicale ?? null,
      },
    };
  },

  async updateProfile(eleveId, profile, files = {}) {
    const eleve = await eleveService.get(eleveId);
    const santeId = eleve?.dossierSanteId;
    if (!santeId) throw new Error('Dossier santé introuvable.');
    const body = toFormData({
      maladies_chroniques: profile.maladiesChroniques ?? '',
      medicaments_a_vie: profile.medicaments ?? '',
      dossier_medical_pdf: files.dossierMedicalPdf instanceof File ? files.dossierMedicalPdf : undefined,
      photo_medicale: files.photoMedicale instanceof File ? files.photoMedicale : undefined,
    });
    await apiPatch(apiPaths.sante.detail(santeId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(MEDICAL_CHANGED);
    return profile;
  },

  async addConsultation(eleveId, payload, files = {}) {
    const pdfFile = files?.pjPdf instanceof File ? files.pjPdf : files instanceof File ? files : null;
    const body = toFormData({
      eleve: eleveId,
      code: payload.code ?? '',
      type: payload.type ?? 'consultation',
      motif: payload.motif ?? '',
      date_consultation: payload.dateConsultation ?? '',
      avis_infirmerie: payload.avisInfirmerie ?? '',
      pj_pdf: pdfFile || undefined,
    });
    const raw = await apiPost(apiPaths.consultations.list, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(MEDICAL_CHANGED);
    return mapConsultation(raw);
  },

  async updateConsultation(itemId, payload, files = {}) {
    const pdfFile = files?.pjPdf instanceof File ? files.pjPdf : files instanceof File ? files : null;
    const body = withExpectedVersion(
      toFormData({
        code: payload.code,
        type: payload.type,
        motif: payload.motif,
        date_consultation: payload.dateConsultation,
        avis_infirmerie: payload.avisInfirmerie,
        pj_pdf: pdfFile || undefined,
      }),
      payload.rowVersion,
    );
    const raw = await apiPatch(apiPaths.consultations.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(MEDICAL_CHANGED);
    return mapConsultation(raw);
  },

  async deleteConsultation(itemId, rowVersion) {
    await apiDelete(apiPaths.consultations.detail(itemId), {
      data: withExpectedVersion({}, rowVersion),
    });
    notifyChanged(MEDICAL_CHANGED);
  },

  async updateConsultationPdf(itemId, file, rowVersion) {
    const body = withExpectedVersion(toFormData({ pj_pdf: file }), rowVersion);
    const raw = await apiPatch(apiPaths.consultations.detail(itemId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    notifyChanged(MEDICAL_CHANGED);
    return mapConsultation(raw);
  },
};
