import { api } from './api';
import { WILAYAS_MR } from '../data/wilayasMauritanie';

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

function parcoursToStatut(parcours) {
  const v = String(parcours || '').toLowerCase();
  if (v.includes('redoubl')) return 'redoublant';
  if (v.includes('suspend')) return 'suspendu';
  return 'actif';
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
    sexe: item.sexe ?? 'H',
    statut: parcoursToStatut(item.dossier_academique?.parcours),
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
    voieAcces: item.voie_acces ?? '',
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
    scolarite: {
      departement: item.dossier_academique?.departement ?? '',
      filiere: item.dossier_academique?.departement ?? '',
      niveau: item.dossier_academique?.niveau_actuel ?? '',
      anneeUni1ere: item.annee_premiere_inscription ?? '',
      parcours: item.dossier_academique?.parcours ?? '',
      voieAcces: item.voie_acces ?? '',
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
      contactUrgence: item.contacts_parents?.contact_urgence ?? '',
      nomUrgence: item.contacts_parents?.nom_urgence ?? '',
      telUrgence: item.contacts_parents?.tel_urgence ?? '',
      telUrgenceWhatsapp: item.contacts_parents?.tel_urgence_whatsapp ?? '',
    },
    parents: {
      prenomPere: item.contacts_parents?.prenom_pere ?? '',
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
  switch (statut) {
    case 'redoublant':
      return 'Redoublant';
    case 'suspendu':
      return 'Suspendu';
    case 'actif':
    default:
      return 'En cours normal';
  }
}

function toElevePayload(values) {
  return {
    matricule: values.matricule || '',
    num_bac: values.numeroBac || '',
    nni: values.nni || '',
    sexe: values.sexe === 'F' ? 'F' : 'H',
    prenom: values.prenom || '',
    nom_famille: values.nom || '',
    date_naissance: values.dateNaissance || null,
    lieu_naissance: composeLieuNaissance(values) || '—',
    nationalite: values.nationalite || '',
    categorie_bac:
      values.categorieBac === 'Étranger' || values.categorieBac === 'Etranger'
        ? 'Etranger'
        : values.categorieBac || 'National',
    serie_bac: values.serieBac || '',
    moyenne_bac: values.moyenneBac || '0',
    ecole_bac: values.ecoleBac || '',
    annee_premiere_inscription: values.anneePremiereInscription || values.scolarite?.anneeUni1ere || '',
    date_premiere_inscription: values.datePremiereInscription || null,
    voie_acces: values.scolarite?.voieAcces || values.voieAcces || '',
    diplome_acces: values.scolarite?.diplomeAcces || values.diplomeAcces || 'N/A',
    etablissement_diplome: values.scolarite?.etablissementPremierCycle || values.etablissementDiplome || '',
    adresse_primaire: values.contact?.adresse || values.adressePrimaire || 'N/A',
    adresse_secondaire: values.contact?.adresseSecondaire || values.adresseSecondaire || '',
    resident_avec_parents: values.residentAvecParents === 'Oui' || values.residentAvecParents === true,
    compte_bankily: values.compteBankily || '',
    email_pro: values.contact?.emailPro || values.emailPro || values.contact?.emailPerso || 'user@example.com',
    email_perso: values.contact?.emailPerso || values.emailPerso || 'user@example.com',
    tel1: values.contact?.telephone || values.tel1 || 'N/A',
    tel2_whatsapp: values.contact?.tel2 || values.tel2Whatsapp || '',
    facebook: '',
    linkedin: '',
  };
}

function dossierAcademiquePayload(values, eleveId) {
  const mobilite = values.mobilite || {};
  return {
    departement: values.scolarite?.departement || values.scolarite?.filiere || '',
    niveau_actuel: values.scolarite?.niveau || '',
    semestre_actuel: '',
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
    const { data } = await api.get('/eleves/');
    let rows = Array.isArray(data) ? data.map(adaptEleveFromApi) : [];
    const q = (filters.q ?? '').toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (e) =>
          e.nom.toLowerCase().includes(q) ||
          e.prenom.toLowerCase().includes(q) ||
          e.matricule.toLowerCase().includes(q),
      );
    }
    if (filters.departement) {
      rows = rows.filter((e) => e.scolarite?.filiere === filters.departement);
    }
    if (filters.annee) {
      rows = rows.filter((e) => e.scolarite?.niveau === filters.annee);
    }
    return rows;
  },

  async get(id) {
    const { data } = await api.get(`/eleves/${id}/`);
    return adaptEleveFromApi(data);
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
      imc: values.sante?.imc || '',
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
      imc: values.sante?.imc || '',
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
      pointure: Number(dm.pointure || 0),
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
      pointure: Number(dm.pointure || 0),
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
    const isFile = (v) => v instanceof File;
    const files = {
      cin: docs.carteIdentite,
      acte_naissance: docs.releveNotesSemestres,
      diplome_acces: docs.releveBac,
      diplome_bac: docs.diplomeBac,
      photo_identite_militaire: docs.photoIdentite,
      photo_identite_civile: docs.photoIdentite,
      photo_militaire_integrale: docs.photoIdentite,
    };
    const invalidField = Object.entries(files).find(([, v]) => !isFile(v));
    if (invalidField) {
      throw new Error(`Le champ ${invalidField[0]} doit être un fichier.`);
    }

    if (docs.carteIdentite instanceof File) fd.append('cin', docs.carteIdentite);
    if (docs.releveNotesSemestres instanceof File) fd.append('acte_naissance', docs.releveNotesSemestres);
    if (docs.releveBac instanceof File) fd.append('diplome_acces', docs.releveBac);
    if (docs.diplomeBac instanceof File) fd.append('diplome_bac', docs.diplomeBac);
    if (docs.photoIdentite instanceof File) {
      fd.append('photo_identite_militaire', docs.photoIdentite);
      fd.append('photo_identite_civile', docs.photoIdentite);
      fd.append('photo_militaire_integrale', docs.photoIdentite);
    }
    fd.append('eleve', String(eleveId));
    return api.post('/documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateDocuments(id, eleveId, values) {
    const fd = new FormData();
    const docs = values.pieces || {};
    if (docs.carteIdentite instanceof File) fd.append('cin', docs.carteIdentite);
    if (docs.releveNotesSemestres instanceof File) fd.append('acte_naissance', docs.releveNotesSemestres);
    if (docs.releveBac instanceof File) fd.append('diplome_acces', docs.releveBac);
    if (docs.diplomeBac instanceof File) fd.append('diplome_bac', docs.diplomeBac);
    if (docs.photoIdentite instanceof File) {
      fd.append('photo_identite_militaire', docs.photoIdentite);
      fd.append('photo_identite_civile', docs.photoIdentite);
      fd.append('photo_militaire_integrale', docs.photoIdentite);
    }
    fd.append('eleve', String(eleveId));
    return api.put(`/documents/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  createContactsParents(eleveId, values) {
    return api.post('/contacts-parents/', {
      prenom_pere: values.parents?.prenomPere || '',
      fonction_pere: values.parents?.fonctionPere || '',
      tel_pere: values.contact?.telPere || '',
      tel_pere_whatsapp: values.contact?.telPereWhatsapp || '',
      prenom_mere: values.parents?.prenomMere || '',
      nom_famille_mere: values.parents?.nomMere || '',
      fonction_mere: values.parents?.fonctionMere || '',
      tel_mere: values.contact?.telMere || '',
      tel_mere_whatsapp: values.contact?.telMereWhatsapp || '',
      contact_urgence: values.contact?.contactUrgence || '',
      nom_urgence: values.contact?.nomUrgence || '',
      tel_urgence: values.contact?.telUrgence || '',
      tel_urgence_whatsapp: values.contact?.telUrgenceWhatsapp || '',
      eleve: eleveId,
    });
  },
  updateContactsParents(id, eleveId, values) {
    return api.put(`/contacts-parents/${id}/`, {
      prenom_pere: values.parents?.prenomPere || '',
      fonction_pere: values.parents?.fonctionPere || '',
      tel_pere: values.contact?.telPere || '',
      tel_pere_whatsapp: values.contact?.telPereWhatsapp || '',
      prenom_mere: values.parents?.prenomMere || '',
      nom_famille_mere: values.parents?.nomMere || '',
      fonction_mere: values.parents?.fonctionMere || '',
      tel_mere: values.contact?.telMere || '',
      tel_mere_whatsapp: values.contact?.telMereWhatsapp || '',
      contact_urgence: values.contact?.contactUrgence || '',
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

  update(id, values) {
    return api.put(`/eleves/${id}/`, toElevePayload(values));
  },

  delete(id) {
    return api.delete(`/eleves/${id}/`);
  },
};
