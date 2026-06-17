import { api } from './api';
import { WILAYAS_MR } from '../data/wilayasMauritanie';
import { eleves as mockElevesRaw } from '../data/mockData';
import { todayIso } from '../utils/anneeUniversitaire';
import { normalizeDepartementForApi } from '../utils/constants';
import { formatApiError } from '../utils/apiErrors';
import {
  findImportedById,
  loadImportedEleves,
  removeImportedById,
} from '../utils/importedElevesStore';
import {
  parcoursToStatutAcademique,
  statutAcademiqueToParcours,
} from '../utils/eleveScolariteAuto';

function normalizeMockEleve(e) {
  return {
    ...e,
    dossierMilitaire: e.dossierMilitaire ?? {
      compagnie: e.compagnie ?? '',
      section: e.section ?? '',
      sportPratique: e.sport ?? '',
    },
  };
}

function filterEleveRows(rows, filters = {}) {
  let list = rows;
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
    list = list.filter((e) => e.scolarite?.filiere === filters.departement);
  }
  if (filters.annee) {
    list = list.filter((e) => e.scolarite?.niveau === filters.annee);
  }
  return list;
}

async function listFromApi(filters) {
  const { data } = await api.get('/eleves/');
  let rows = Array.isArray(data) ? data.map(adaptEleveFromApi) : [];
  return filterEleveRows(rows, filters);
}

function listFromMock(filters) {
  return filterEleveRows(mockElevesRaw.map(normalizeMockEleve), filters);
}

function listFromImported(filters) {
  return filterEleveRows(loadImportedEleves().map(normalizeMockEleve), filters);
}

function mergeWithImported(rows, filters) {
  const imported = listFromImported(filters);
  const seen = new Set(imported.map((e) => String(e.matricule ?? '').trim().toLowerCase()));
  const rest = rows.filter((e) => !seen.has(String(e.matricule ?? '').trim().toLowerCase()));
  return [...imported, ...rest];
}

function shouldUseMockFallback(err) {
  if (import.meta.env.VITE_USE_MOCK_ELEVES === 'true') return true;
  if (!err?.response) return true;
  return false;
}

/** Codes API `DossierAcademique.CHOIX_ANNEE` ↔ libellés UI `NIVEAUX_SCOLARITE`. */
const NIVEAU_API_TO_UI = {
  '3': '3e année',
  '4': '4e année',
  '4-DD': '4e DD',
  '4-E': '5e E',
  '5-DD': '5e DD',
  '5': '5e année',
};
const NIVEAU_UI_TO_API = Object.fromEntries(
  Object.entries(NIVEAU_API_TO_UI).map(([api, ui]) => [ui, api]),
);

const VOIE_LABEL_TO_CODE = {
  'Voie 1 — Interne': '1',
  'Voie 1 — Externe': '2',
  'Voie 2 — Interne': '3',
  'Voie 2 — Externe': '4',
};

function niveauActuelFromApi(code) {
  return NIVEAU_API_TO_UI[code] || code || '';
}

function niveauActuelToApi(uiLabel) {
  const s = String(uiLabel ?? '').trim();
  if (NIVEAU_UI_TO_API[s]) return NIVEAU_UI_TO_API[s];
  if (s === '5e année') return '4-E';
  if (['3', '4', '4-DD', '4-E', '5-DD'].includes(s)) return s;
  return '3';
}

function normalizeVoieAcces(raw) {
  const s = String(raw ?? '').trim();
  if (/^[1-4]$/.test(s)) return s;
  return VOIE_LABEL_TO_CODE[s] || '1';
}

function departementDisplayFromApi(code) {
  return normalizeDepartementForApi(code);
}

function splitLieuNaissance(lieu) {
  if (!lieu) return { wilaya: '', commune: '' };
  const parts = String(lieu).split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { wilaya: '', commune: '' };
  const last = parts[parts.length - 1];
  const wilaya = WILAYAS_MR.find((w) => w.nom.toLowerCase() === last.toLowerCase())?.nom || '';
  if (wilaya) {
    return { wilaya, commune: parts.slice(0, -1).join(', ') };
  }
  return { wilaya: '', commune: '' };
}

function adaptEleveFromApi(item) {
  const lieuParts = splitLieuNaissance(item.lieu_naissance);
  return {
    id: item.id,
    dossierAcademiqueId: item.dossier_academique?.id ?? null,
    dossierSanteId: item.dossier_sante?.id ?? null,
    dossierMilitaireId: item.dossier_militaire?.id ?? null,
    contactsParentsId: item.contacts_parents?.id ?? null,
    hebergementId: item.hebergement?.id ?? null,
    documentsId: item.documents?.id ?? null,
    matricule: item.matricule ?? '',
    nom: item.nom_famille ?? '',
    prenom: item.prenom ?? '',
    nni: item.nni ?? '',
    numeroBac: item.num_bac ?? '',
    sexe: item.sexe === 'F' ? 'F' : 'M',
    statut: parcoursToStatutAcademique(item.dossier_academique?.parcours),
    dateNaissance: item.date_naissance ?? '',
    lieuNaissance: item.lieu_naissance ?? '',
    wilayaNaissance: lieuParts.wilaya,
    communeNaissance: lieuParts.commune,
    nationalite: item.nationalite ?? '',
    categorieBac: item.categorie_bac ?? '',
    serieBac: item.serie_bac ?? '',
    moyenneBac: item.moyenne_bac ?? '',
    ecoleBac: item.ecole_bac ?? '',
    anneePremiereInscription: item.annee_premiere_inscription ?? '',
    datePremiereInscription: item.date_premiere_inscription ?? '',
    voieAcces: normalizeVoieAcces(item.voie_acces ?? ''),
    diplomeAcces: item.diplome_acces ?? '',
    etablissementDiplome: item.etablissement_diplome ?? '',
    adressePrimaire: item.adresse_primaire ?? '',
    adresseSecondaire: item.adresse_secondaire ?? '',
    residentAvecParents: item.resident_avec_parents ? 'Oui' : 'Non',
    compteBankily: item.compte_bankily ?? '',
    emailPro: item.email_pro ?? '',
    emailPerso: item.email_perso ?? '',
    tel1: item.tel1 ?? '',
    tel2Whatsapp: item.tel2_whatsapp ?? '',
    facebook: item.facebook ?? '',
    linkedin: item.linkedin ?? '',
    filiere: departementDisplayFromApi(item.dossier_academique?.departement ?? ''),
    photoUrl:
      item.documents?.photo_identite_militaire ||
      item.documents?.photo_identite_civile ||
      '',
    scolarite: {
      departement: departementDisplayFromApi(item.dossier_academique?.departement ?? ''),
      filiere: departementDisplayFromApi(item.dossier_academique?.departement ?? ''),
      niveau: niveauActuelFromApi(item.dossier_academique?.niveau_actuel ?? ''),
      semestreActuel: item.dossier_academique?.semestre_actuel ?? '',
      anneeUni1ere: item.annee_premiere_inscription ?? '',
      parcours: item.dossier_academique?.parcours ?? '',
      voieAcces: normalizeVoieAcces(item.voie_acces ?? ''),
      diplomeAcces: item.diplome_acces ?? '',
      etablissementPremierCycle: item.etablissement_diplome ?? '',
    },
    mobilite: {
      type: item.dossier_academique?.etablissement_double_diplome
        ? 'Double diplôme'
        : item.dossier_academique?.etablissement_echange
          ? 'Semestre d’échange'
          : '',
      etablissement:
        item.dossier_academique?.etablissement_double_diplome
        || item.dossier_academique?.etablissement_echange
        || '',
      specialite: item.dossier_academique?.specialite_mobilite ?? '',
      raison: '',
      anneeDebut: '',
      anneeFin: '',
    },
    sante: {
      groupeSanguin: item.dossier_sante?.groupe_sanguin ?? '',
      assureur: item.dossier_sante?.assureur ?? '',
      numeroAssure: item.dossier_sante?.num_assure ?? '',
      antecedents: item.dossier_sante?.antecedents_medicaux ?? '',
      maladiesChroniques: item.dossier_sante?.maladies_chroniques ?? '',
      medicaments: item.dossier_sante?.medicaments_a_vie ?? '',
      poids: item.dossier_sante?.poids_kg ?? '',
      tailleCm: item.dossier_sante?.taille_cm ?? '',
      imc: item.dossier_sante?.imc ?? '',
    },
    dossierMilitaire: {
      compagnie: item.dossier_militaire?.compagnie ?? '',
      section: item.dossier_militaire?.section ?? '',
      sportPratique: item.dossier_militaire?.sport_pratique ?? '',
      tourPoitrine: item.dossier_militaire?.tour_poitrine ?? '',
      tourCeinture: item.dossier_militaire?.tour_ceinture ?? '',
      tourTaille: item.dossier_militaire?.tour_taille ?? '',
      tourBassin: item.dossier_militaire?.tour_bassin ?? '',
      tourCou: item.dossier_militaire?.tour_cou ?? '',
      longueurManche: item.dossier_militaire?.longueur_manche ?? '',
      longueurDos: item.dossier_militaire?.longueur_dos ?? '',
      longueurCote: item.dossier_militaire?.longueur_cote ?? '',
      pointure: item.dossier_militaire?.pointure ?? '',
    },
    compagnie: item.dossier_militaire?.compagnie ?? '',
    section: item.dossier_militaire?.section ?? '',
    hebergement: {
      batiment: item.hebergement?.batiment ?? '',
      etage: item.hebergement?.etage ?? '',
      aile: item.hebergement?.aile ?? '',
      chambre: item.hebergement?.chambre ?? '',
      lit: item.hebergement?.lit ?? '',
      responsableChambre: !!item.hebergement?.responsable_chambre,
      responsableAile: !!item.hebergement?.responsable_aile,
      responsableEtage: !!item.hebergement?.responsable_etage,
    },
    contact: {
      telephone: item.tel1 ?? '',
      tel2: item.tel2_whatsapp ?? '',
      email: item.email_pro ?? '',
      emailPro: item.email_pro ?? '',
      emailPerso: item.email_perso ?? '',
      adresse: item.adresse_primaire ?? '',
      adresseSecondaire: item.adresse_secondaire ?? '',
      telPere: item.contacts_parents?.tel_pere ?? '',
      telPereWhatsapp: item.contacts_parents?.tel_pere_whatsapp ?? '',
      telMere: item.contacts_parents?.tel_mere ?? '',
      telMereWhatsapp: item.contacts_parents?.tel_mere_whatsapp ?? '',
      nomUrgence: item.contacts_parents?.nom_urgence ?? '',
      telUrgence: item.contacts_parents?.tel_urgence ?? '',
      telUrgenceWhatsapp: item.contacts_parents?.tel_urgence_whatsapp ?? '',
    },
    parents: {
      prenomPere: item.contacts_parents?.prenom_pere ?? '',
      nomFamillePere: item.contacts_parents?.nom_famille_pere ?? '',
      fonctionPere: item.contacts_parents?.fonction_pere ?? '',
      prenomMere: item.contacts_parents?.prenom_mere ?? '',
      nomMere: item.contacts_parents?.nom_famille_mere ?? '',
      fonctionMere: item.contacts_parents?.fonction_mere ?? '',
    },
    documents: item.documents ?? null,
  };
}

function composeLieuNaissance(values) {
  if (values.lieuNaissance && String(values.lieuNaissance).trim()) {
    return String(values.lieuNaissance).trim();
  }
  const parts = [values.communeNaissance, values.wilayaNaissance].filter(
    (x) => x && String(x).trim(),
  );
  return parts.join(', ');
}

function statutToParcours(statut) {
  return statutAcademiqueToParcours(statut);
}

/** Positive integer PK or null (never NaN / 0). */
function coercePk(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Resolve OneToOne child PKs from GET /eleves/:id/ first — form state often lacks them or has stale ids.
 */
function mergeRelatedIdsFromApiPayload(values, apiEleve) {
  if (!apiEleve || typeof apiEleve !== 'object') return { ...values };
  const pick = (nestedBlock, formFallback) =>
    coercePk(nestedBlock?.id) ?? coercePk(formFallback);
  return {
    ...values,
    dossierAcademiqueId: pick(apiEleve.dossier_academique, values.dossierAcademiqueId),
    dossierSanteId: pick(apiEleve.dossier_sante, values.dossierSanteId),
    dossierMilitaireId: pick(apiEleve.dossier_militaire, values.dossierMilitaireId),
    contactsParentsId: pick(apiEleve.contacts_parents, values.contactsParentsId),
    hebergementId: pick(apiEleve.hebergement, values.hebergementId),
    documentsId: pick(apiEleve.documents, values.documentsId),
  };
}

function toElevePayload(values) {
  const matParsed = Number.parseInt(String(values.matricule ?? '').replace(/\D/g, ''), 10);
  const matricule = Number.isFinite(matParsed) ? matParsed : 0;
  return {
    matricule,
    num_bac: String(values.numeroBac ?? '').trim() || '—',
    nni: values.nni || '',
    sexe: values.sexe === 'F' ? 'F' : 'H',
    prenom: values.prenom || '',
    nom_famille: values.nom || '',
    date_naissance: values.dateNaissance || null,
    lieu_naissance: composeLieuNaissance(values) || '—',
    nationalite: (values.nationalite ?? '').toString().trim() || '—',
    categorie_bac:
      values.categorieBac === 'Étranger' || values.categorieBac === 'Etranger'
        ? 'Etranger'
        : values.categorieBac || 'National',
    serie_bac: (values.serieBac ?? '').trim() || 'C',
    moyenne_bac: values.moyenneBac || '0',
    ecole_bac: (values.ecoleBac ?? '').trim() || '—',
    date_premiere_inscription:
      String(values.datePremiereInscription ?? '').trim() || todayIso(),
    voie_acces: normalizeVoieAcces(values.scolarite?.voieAcces || values.voieAcces),
    diplome_acces: values.scolarite?.diplomeAcces || values.diplomeAcces || 'N/A',
    etablissement_diplome: values.scolarite?.etablissementPremierCycle || values.etablissementDiplome || '',
    adresse_primaire: values.contact?.adresse || values.adressePrimaire || 'N/A',
    adresse_secondaire: values.contact?.adresseSecondaire || values.adresseSecondaire || '',
    resident_avec_parents: values.residentAvecParents === 'Oui' || values.residentAvecParents === true,
    compte_bankily: values.compteBankily || '',
    email_perso: values.contact?.emailPerso || values.emailPerso || 'user@example.com',
    tel1: values.contact?.telephone || values.tel1 || '00000000',
    tel2_whatsapp: values.contact?.tel2 || values.tel2Whatsapp || '',
    facebook: '',
    linkedin: '',
  };
}

function hasDossierAcademiqueData(v) {
  const s = v.scolarite || {};
  return !!((s.departement || s.filiere) && s.niveau);
}

function hasDossierSanteData(v) {
  const s = v.sante || {};
  return !!s.groupeSanguin;
}

function hasDossierMilitaireData(v) {
  const dm = v.dossierMilitaire || {};
  return !!(dm.section && dm.sportPratique);
}

function hasContactsParentsData(v) {
  const p = v.parents || {};
  const c = v.contact || {};
  return !!(p.prenomPere && c.telUrgence);
}

function hasHebergementData(v) {
  const h = v.hebergement || {};
  return !!(h.etage && h.aile && h.chambre && h.lit);
}

function dossierAcademiquePayload(values, eleveId) {
  const mobilite = values.mobilite || {};
  const deptRaw = values.scolarite?.departement || values.scolarite?.filiere || '';
  return {
    departement: normalizeDepartementForApi(deptRaw),
    niveau_actuel: niveauActuelToApi(values.scolarite?.niveau),
    semestre_actuel: String(values.scolarite?.semestreActuel || '').trim() || 'S1',
    donnees_semestres: {},
    diplome: mobilite.specialite || values.scolarite?.diplomeAcces || '',
    etablissement_echange:
      mobilite.type === 'Semestre d’échange' ? mobilite.etablissement || '' : '',
    etablissement_double_diplome:
      mobilite.type === 'Double diplôme' ? mobilite.etablissement || '' : '',
    specialite_mobilite: mobilite.specialite || '',
    parcours: statutToParcours(values.statut) || values.scolarite?.parcours || 'En cours normal',
    eleve: eleveId,
  };
}

export const eleveService = {
  async list(filters = {}) {
    try {
      const rows = await listFromApi(filters);
      return mergeWithImported(rows, filters);
    } catch (err) {
      if (shouldUseMockFallback(err)) {
        console.warn('[eleveService] API indisponible — données de démonstration.', err?.message);
        return mergeWithImported(listFromMock(filters), filters);
      }
      throw err;
    }
  },

  async get(id) {
    const imported = findImportedById(id);
    if (imported) return normalizeMockEleve(imported);

    try {
      const { data } = await api.get(`/eleves/${id}/`);
      return adaptEleveFromApi(data);
    } catch (err) {
      if (shouldUseMockFallback(err)) {
        const found = mockElevesRaw.map(normalizeMockEleve).find((e) => String(e.id) === String(id));
        if (found) return found;
      }
      throw err;
    }
  },

  async createEleve(values) {
    const { data } = await api.post('/eleves/', toElevePayload(values));
    return adaptEleveFromApi(data);
  },

  createDossierSante(eleveId, values) {
    return api.post('/dossiers-sante/', {
      groupe_sanguin: values.sante?.groupeSanguin || '',
      assureur: values.sante?.assureur || '',
      num_assure: values.sante?.numeroAssure || '',
      antecedents_medicaux: values.sante?.antecedents || '',
      maladies_chroniques: values.sante?.maladiesChroniques || '',
      medicaments_a_vie: values.sante?.medicaments || '',
      poids_kg: values.sante?.poids || '',
      taille_cm: values.sante?.tailleCm || '',
      eleve: eleveId,
    });
  },
  updateDossierSante(id, eleveId, values) {
    return api.put(`/dossiers-sante/${id}/`, {
      groupe_sanguin: values.sante?.groupeSanguin || '',
      assureur: values.sante?.assureur || '',
      num_assure: values.sante?.numeroAssure || '',
      antecedents_medicaux: values.sante?.antecedents || '',
      maladies_chroniques: values.sante?.maladiesChroniques || '',
      medicaments_a_vie: values.sante?.medicaments || '',
      poids_kg: values.sante?.poids || '',
      taille_cm: values.sante?.tailleCm || '',
      eleve: eleveId,
    });
  },

  createDossierMilitaire(eleveId, values) {
    const dm = values.dossierMilitaire || {};
    return api.post('/dossiers-militaires/', {
      compagnie: dm.compagnie || '',
      section: dm.section || '',
      sport_pratique: dm.sportPratique || '',
      tour_poitrine: dm.tourPoitrine || '',
      tour_ceinture: dm.tourCeinture || '',
      tour_taille: dm.tourTaille || '',
      tour_bassin: dm.tourBassin || '',
      tour_cou: dm.tourCou || '',
      longueur_manche: dm.longueurManche || '',
      longueur_dos: dm.longueurDos || '',
      longueur_cote: dm.longueurCote || '',
      pointure: dm.pointure === '' || dm.pointure == null ? null : Number(dm.pointure),
      eleve: eleveId,
    });
  },
  updateDossierMilitaire(id, eleveId, values) {
    const dm = values.dossierMilitaire || {};
    return api.put(`/dossiers-militaires/${id}/`, {
      compagnie: dm.compagnie || '',
      section: dm.section || '',
      sport_pratique: dm.sportPratique || '',
      tour_poitrine: dm.tourPoitrine || '',
      tour_ceinture: dm.tourCeinture || '',
      tour_taille: dm.tourTaille || '',
      tour_bassin: dm.tourBassin || '',
      tour_cou: dm.tourCou || '',
      longueur_manche: dm.longueurManche || '',
      longueur_dos: dm.longueurDos || '',
      longueur_cote: dm.longueurCote || '',
      pointure: dm.pointure === '' || dm.pointure == null ? null : Number(dm.pointure),
      eleve: eleveId,
    });
  },

  createDossierAcademique(eleveId, values) {
    return api.post('/dossiers-academiques/', dossierAcademiquePayload(values, eleveId));
  },
  updateDossierAcademique(id, eleveId, values) {
    return api.put(`/dossiers-academiques/${id}/`, dossierAcademiquePayload(values, eleveId));
  },

  createDocuments(eleveId, values) {
    const fd = new FormData();
    const docs = values.pieces || {};
    if (docs.acteNaissance instanceof File) fd.append('acte_naissance', docs.acteNaissance);
    if (docs.cin instanceof File) fd.append('cin', docs.cin);
    if (docs.diplomeAcces instanceof File) fd.append('diplome_acces', docs.diplomeAcces);
    if (docs.diplomeBac instanceof File) fd.append('diplome_bac', docs.diplomeBac);
    const civilePhoto =
      docs.photoIdentiteCivile instanceof File ? docs.photoIdentiteCivile : docs.photoIdentite;
    if (civilePhoto instanceof File) fd.append('photo_identite_civile', civilePhoto);
    if (docs.photoIdentiteMilitaire instanceof File) fd.append('photo_identite_militaire', docs.photoIdentiteMilitaire);
    if (docs.photoMilitaireIntegrale instanceof File) fd.append('photo_militaire_integrale', docs.photoMilitaireIntegrale);
    fd.append('eleve', String(eleveId));
    return api.post('/documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateDocuments(id, eleveId, values) {
    const fd = new FormData();
    const docs = values.pieces || {};
    if (docs.acteNaissance instanceof File) fd.append('acte_naissance', docs.acteNaissance);
    if (docs.cin instanceof File) fd.append('cin', docs.cin);
    if (docs.diplomeAcces instanceof File) fd.append('diplome_acces', docs.diplomeAcces);
    if (docs.diplomeBac instanceof File) fd.append('diplome_bac', docs.diplomeBac);
    const civilePhoto =
      docs.photoIdentiteCivile instanceof File ? docs.photoIdentiteCivile : docs.photoIdentite;
    if (civilePhoto instanceof File) fd.append('photo_identite_civile', civilePhoto);
    if (docs.photoIdentiteMilitaire instanceof File) fd.append('photo_identite_militaire', docs.photoIdentiteMilitaire);
    if (docs.photoMilitaireIntegrale instanceof File) fd.append('photo_militaire_integrale', docs.photoMilitaireIntegrale);
    fd.append('eleve', String(eleveId));
    return api.put(`/documents/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  createContactsParents(eleveId, values) {
    return api.post('/contacts-parents/', {
      prenom_pere: values.parents?.prenomPere || '',
      nom_famille_pere: values.parents?.nomFamillePere || values.nom || '',
      fonction_pere: values.parents?.fonctionPere || '',
      tel_pere: values.contact?.telPere || '',
      tel_pere_whatsapp: values.contact?.telPereWhatsapp || '',
      prenom_mere: values.parents?.prenomMere || '',
      nom_famille_mere: values.parents?.nomMere || '',
      fonction_mere: values.parents?.fonctionMere || '',
      tel_mere: values.contact?.telMere || '',
      tel_mere_whatsapp: values.contact?.telMereWhatsapp || '',
      nom_urgence: values.contact?.nomUrgence || '',
      tel_urgence: values.contact?.telUrgence || '',
      tel_urgence_whatsapp: values.contact?.telUrgenceWhatsapp || '',
      eleve: eleveId,
    });
  },
  updateContactsParents(id, eleveId, values) {
    return api.put(`/contacts-parents/${id}/`, {
      prenom_pere: values.parents?.prenomPere || '',
      nom_famille_pere: values.parents?.nomFamillePere || values.nom || '',
      fonction_pere: values.parents?.fonctionPere || '',
      tel_pere: values.contact?.telPere || '',
      tel_pere_whatsapp: values.contact?.telPereWhatsapp || '',
      prenom_mere: values.parents?.prenomMere || '',
      nom_famille_mere: values.parents?.nomMere || '',
      fonction_mere: values.parents?.fonctionMere || '',
      tel_mere: values.contact?.telMere || '',
      tel_mere_whatsapp: values.contact?.telMereWhatsapp || '',
      nom_urgence: values.contact?.nomUrgence || '',
      tel_urgence: values.contact?.telUrgence || '',
      tel_urgence_whatsapp: values.contact?.telUrgenceWhatsapp || '',
      eleve: eleveId,
    });
  },

  createHebergement(eleveId, values) {
    return api.post('/hebergements/', {
      batiment: values.hebergement?.batiment || '',
      etage: values.hebergement?.etage || '',
      aile: values.hebergement?.aile || '',
      chambre: values.hebergement?.chambre || '',
      lit: values.hebergement?.lit || '',
      responsable_chambre: !!values.hebergement?.responsableChambre,
      responsable_aile: !!values.hebergement?.responsableAile,
      responsable_etage: !!values.hebergement?.responsableEtage,
      eleve: eleveId,
    });
  },
  updateHebergement(id, eleveId, values) {
    return api.put(`/hebergements/${id}/`, {
      batiment: values.hebergement?.batiment || '',
      etage: values.hebergement?.etage || '',
      aile: values.hebergement?.aile || '',
      chambre: values.hebergement?.chambre || '',
      lit: values.hebergement?.lit || '',
      responsable_chambre: !!values.hebergement?.responsableChambre,
      responsable_aile: !!values.hebergement?.responsableAile,
      responsable_etage: !!values.hebergement?.responsableEtage,
      eleve: eleveId,
    });
  },

  async update(id, values) {
    const nid = Number(id);
    if (!Number.isFinite(nid) || nid <= 0) {
      throw new Error('Invalid student id.');
    }
    await api.put(`/eleves/${nid}/`, toElevePayload(values));

    const { data: freshRaw } = await api.get(`/eleves/${nid}/`);
    const merged = mergeRelatedIdsFromApiPayload(values, freshRaw);

    const related = [];
    if (merged.dossierAcademiqueId) {
      related.push(eleveService.updateDossierAcademique(merged.dossierAcademiqueId, nid, merged));
    } else if (hasDossierAcademiqueData(merged)) {
      related.push(eleveService.createDossierAcademique(nid, merged));
    }
    if (merged.dossierSanteId) {
      related.push(eleveService.updateDossierSante(merged.dossierSanteId, nid, merged));
    } else if (hasDossierSanteData(merged)) {
      related.push(eleveService.createDossierSante(nid, merged));
    }
    if (merged.dossierMilitaireId) {
      related.push(eleveService.updateDossierMilitaire(merged.dossierMilitaireId, nid, merged));
    } else if (hasDossierMilitaireData(merged)) {
      related.push(eleveService.createDossierMilitaire(nid, merged));
    }
    if (merged.contactsParentsId) {
      related.push(eleveService.updateContactsParents(merged.contactsParentsId, nid, merged));
    } else if (hasContactsParentsData(merged)) {
      related.push(eleveService.createContactsParents(nid, merged));
    }
    if (merged.hebergementId) {
      related.push(eleveService.updateHebergement(merged.hebergementId, nid, merged));
    } else if (hasHebergementData(merged)) {
      related.push(eleveService.createHebergement(nid, merged));
    }
    const docs = merged.pieces || {};
    const hasNewFiles = Object.values(docs).some((v) => v instanceof File);
    if (hasNewFiles) {
      if (merged.documentsId) {
        related.push(eleveService.updateDocuments(merged.documentsId, nid, merged));
      } else {
        related.push(eleveService.createDocuments(nid, merged));
      }
    }

    const settled = await Promise.allSettled(related);
    const failed = settled.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      const msgs = failed.map((r) => formatApiError(r.reason)).join(' · ');
      throw new Error(
        failed.length === related.length
          ? `Saving related records failed: ${msgs}`
          : `Some related records failed (${failed.length}/${related.length}): ${msgs}`,
      );
    }

    const { data: outRaw } = await api.get(`/eleves/${nid}/`);
    return adaptEleveFromApi(outRaw);
  },

  delete(id) {
    if (String(id).startsWith('import-') || findImportedById(id)) {
      removeImportedById(id);
      return Promise.resolve();
    }
    return api.delete(`/eleves/${id}/`);
  },
};
