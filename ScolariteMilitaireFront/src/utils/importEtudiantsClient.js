/**
 * Import Excel / CSV côté navigateur (sans backend).
 * Les dossiers sont stockés dans localStorage et affichés dans la liste + fiche complète.
 */

import { normalizeDepartementForApi } from './constants';
import { appendImportedEleves, findImportedByMatricule } from './importedElevesStore';

const NIVEAU_ALIASES = {
  '3': '3e année',
  '3E': '3e année',
  '3EME': '3e année',
  '3E ANNEE': '3e année',
  '4': '4e année',
  '4E': '4e année',
  '4EME': '4e année',
  '4E ANNEE': '4e année',
  '4-DD': '4e DD',
  '4DD': '4e DD',
  '4-E': '5e E',
  '4E ECHANGE': '5e E',
  '5-DD': '5e DD',
  '5DD': '5e DD',
  '5': '5e année',
  '5E': '5e année',
};

function normKey(v) {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function pick(row, ...keys) {
  const map = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normKey(k), v]),
  );
  for (const key of keys) {
    const val = map[normKey(key)];
    if (val != null && String(val).trim() !== '') return String(val).trim();
  }
  return '';
}

function parseDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const ymd = s.match(/^(\d{4})[/.-](\d{2})[/.-](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

function normSexe(v) {
  const n = normKey(v);
  return n.startsWith('f') ? 'F' : 'M';
}

function normNiveauUi(raw) {
  const compact = normKey(raw).replace(/\s+/g, ' ').toUpperCase();
  const noSpace = compact.replace(/\s/g, '');
  for (const [alias, ui] of Object.entries(NIVEAU_ALIASES)) {
    const a = alias.replace(/\s/g, '');
    if (compact === alias || noSpace === a) return ui;
  }
  return raw ? String(raw).trim() : '3e année';
}

function normVoie(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(/[1-4]/);
  return m ? m[0] : '1';
}

function calcImc(poids, tailleCm) {
  const p = Number(String(poids).replace(',', '.'));
  const t = Number(String(tailleCm).replace(',', '.'));
  if (!p || !t) return '';
  const m = t / 100;
  return (p / (m * m)).toFixed(1);
}

function matriculeFromRow(row, rowNum) {
  const raw = pick(row, 'matricule', 'Matricule', 'mat');
  if (raw) return raw;
  return `IMPORT-${rowNum}`;
}

function rowToEleve(row, rowNum) {
  const errors = [];
  const err = (field, message) => errors.push({ ligne: rowNum, message: `${field}: ${message}` });

  const matricule = matriculeFromRow(row, rowNum);
  const nom = pick(row, 'nom_famille', 'nom', 'Nom', 'last_name');
  const prenom = pick(row, 'prenom', 'Prénom', 'prenoms', 'first_name');

  if (!nom) err('nom_famille', 'Champ obligatoire manquant');
  if (!prenom) err('prenom', 'Champ obligatoire manquant');
  if (findImportedByMatricule(matricule)) {
    err('matricule', `Matricule déjà importé (${matricule})`);
  }

  if (!nom || !prenom) return { eleve: null, errors };

  const dept = normalizeDepartementForApi(pick(row, 'departement', 'filiere', 'département', 'dept'));
  const niveau = normNiveauUi(pick(row, 'niveau', 'annee', 'année', 'niveau_actuel'));
  const voieAcces = normVoie(pick(row, 'voie_acces', 'voie', 'acces'));
  const poids = pick(row, 'poids_kg', 'poids');
  const tailleCm = pick(row, 'taille_cm', 'taille');
  const imc = pick(row, 'imc') || calcImc(poids, tailleCm);
  const compagnie = pick(row, 'compagnie', 'Compagnie') || '1re Compagnie';
  const section = pick(row, 'section', 'Section') || 'Section 1';
  const sportPratique = pick(row, 'sport_pratique', 'sport', 'sport_pratique');
  const dateNaissance = parseDate(pick(row, 'date_naissance', 'naissance', 'ddn'));
  const datePremiereInscription = parseDate(
    pick(row, 'date_premiere_inscription', 'date_inscription'),
  );
  const anneePremiereInscription = pick(row, 'annee_premiere_inscription', 'annee_uni_1ere') || '';
  const emailPerso = pick(row, 'email_perso', 'email', 'mail');
  const emailPro = pick(row, 'email_pro', 'email_institutionnel') || `${String(matricule).replace(/\D/g, '') || rowNum}@esp.mr`;
  const tel1 = pick(row, 'telephone', 'tel', 'tel1', 'phone');
  const tel2Whatsapp = pick(row, 'whatsapp', 'tel2', 'tel_whatsapp');
  const adressePrimaire = pick(row, 'adresse_primaire', 'adresse');
  const adresseSecondaire = pick(row, 'adresse_secondaire');
  const etabEchange = pick(row, 'etablissement_echange');
  const etabDouble = pick(row, 'etablissement_double_diplome');
  const mobiliteType = etabDouble ? 'Double diplôme' : etabEchange ? 'Semestre d’échange' : pick(row, 'mobilite_type', 'type_mobilite');
  const mobiliteEtab = etabDouble || etabEchange || pick(row, 'mobilite_etablissement', 'etablissement_mobilite');

  const eleve = {
    id: `import-${Date.now()}-${rowNum}`,
    matricule,
    nom,
    prenom,
    nni: pick(row, 'nni', 'NNI') || `AUTO-${matricule}`,
    numeroBac: pick(row, 'num_bac', 'numero_bac', 'bac') || '—',
    sexe: normSexe(pick(row, 'sexe', 'genre', 'sex')),
    statut: 'actif',
    dateNaissance: dateNaissance || '2000-01-01',
    lieuNaissance: pick(row, 'lieu_naissance', 'lieu', 'ville_naissance') || '—',
    nationalite: pick(row, 'nationalite', 'nationalité') || 'Mauritanienne',
    categorieBac: /etrang/i.test(pick(row, 'categorie_bac', 'cat_bac')) ? 'Étranger' : 'National',
    serieBac: pick(row, 'serie_bac', 'serie', 'filiere_bac') || 'C',
    moyenneBac: pick(row, 'moyenne_bac', 'moyenne', 'moy_bac') || '',
    ecoleBac: pick(row, 'ecole_bac', 'lycee', 'etablissement_bac') || '—',
    anneePremiereInscription: anneePremiereInscription,
    datePremiereInscription: datePremiereInscription || `${new Date().getFullYear()}-09-01`,
    voieAcces,
    diplomeAcces: pick(row, 'diplome_acces', 'diplome') || '—',
    etablissementDiplome: pick(row, 'etablissement_diplome', 'etablissement') || '',
    adressePrimaire: adressePrimaire || '—',
    adresseSecondaire: adresseSecondaire || '',
    residentAvecParents: /oui|yes|1|true/i.test(pick(row, 'resident_avec_parents')) ? 'Oui' : 'Non',
    compteBankily: pick(row, 'compte_bankily', 'bankily') || '',
    emailPro,
    emailPerso: emailPerso || `${matricule}@import.esp.mr`,
    tel1: tel1 || '—',
    tel2Whatsapp: tel2Whatsapp || '',
    filiere: dept,
    compagnie,
    section,
    scolarite: {
      departement: dept,
      filiere: dept,
      niveau,
      semestreActuel: pick(row, 'semestre', 'semestre_actuel') || 'S1',
      anneeUni1ere: anneePremiereInscription,
      parcours: pick(row, 'parcours', 'statut') || 'En cours normal',
      voieAcces,
      diplomeAcces: pick(row, 'diplome_acces', 'diplome') || '—',
      etablissementPremierCycle: pick(row, 'etablissement_diplome', 'etablissement') || '',
    },
    mobilite: {
      type: mobiliteType || '',
      etablissement: mobiliteEtab || '',
      specialite: pick(row, 'specialite_mobilite', 'specialite') || '',
      raison: pick(row, 'mobilite_raison') || '',
      anneeDebut: pick(row, 'mobilite_annee_debut') || '',
      anneeFin: pick(row, 'mobilite_annee_fin') || '',
    },
    sante: {
      groupeSanguin: pick(row, 'groupe_sanguin', 'groupe_sang', 'blood') || 'O+',
      assureur: pick(row, 'assureur') || '',
      numeroAssure: pick(row, 'num_assure', 'numero_assure') || '',
      antecedents: pick(row, 'antecedents', 'antecedents_medicaux') || '',
      maladiesChroniques: pick(row, 'maladies_chroniques') || '',
      medicaments: pick(row, 'medicaments', 'medicaments_a_vie') || '',
      poids: poids || '',
      tailleCm: tailleCm || '',
      imc,
    },
    dossierMilitaire: {
      compagnie,
      section,
      sportPratique: sportPratique || '',
      tourPoitrine: pick(row, 'tour_poitrine') || '',
      tourCeinture: pick(row, 'tour_ceinture') || '',
      tourTaille: pick(row, 'tour_taille') || '',
      tourBassin: pick(row, 'tour_bassin') || '',
      tourCou: pick(row, 'tour_cou') || '',
      longueurManche: pick(row, 'longueur_manche') || '',
      longueurDos: pick(row, 'longueur_dos') || '',
      longueurCote: pick(row, 'longueur_cote') || '',
      pointure: pick(row, 'pointure') || '',
    },
    contact: {
      telephone: tel1 || '—',
      tel2: tel2Whatsapp || '',
      emailPerso: emailPerso || `${matricule}@import.esp.mr`,
      emailPro,
      adresse: adressePrimaire || '—',
      adresseSecondaire: adresseSecondaire || '',
      telPere: pick(row, 'tel_pere', 'telephone_pere') || '',
      telPereWhatsapp: pick(row, 'tel_pere_whatsapp') || '',
      telMere: pick(row, 'tel_mere', 'telephone_mere') || '',
      telMereWhatsapp: pick(row, 'tel_mere_whatsapp') || '',
      nomUrgence: pick(row, 'nom_urgence', 'contact_urgence') || '',
      telUrgence: pick(row, 'tel_urgence', 'telephone_urgence') || '',
      telUrgenceWhatsapp: pick(row, 'tel_urgence_whatsapp') || '',
    },
    parents: {
      prenomPere: pick(row, 'prenom_pere', 'nom_pere') || '',
      nomFamillePere: pick(row, 'nom_famille_pere') || nom,
      fonctionPere: pick(row, 'fonction_pere') || '',
      prenomMere: pick(row, 'prenom_mere', 'nom_mere') || '',
      nomMere: pick(row, 'nom_famille_mere') || '',
      fonctionMere: pick(row, 'fonction_mere') || '',
    },
    hebergement: {
      batiment: pick(row, 'batiment', 'hebergement_batiment') || '',
      etage: pick(row, 'etage', 'hebergement_etage') || '',
      aile: pick(row, 'aile', 'hebergement_aile') || '',
      chambre: pick(row, 'chambre', 'hebergement_chambre') || '',
      lit: pick(row, 'lit', 'hebergement_lit') || '',
      responsableChambre: false,
      responsableAile: false,
      responsableEtage: false,
    },
    habillement: {
      tailleChemise: pick(row, 'taille_chemise') || '',
      taillePantalon: pick(row, 'taille_pantalon') || '',
      pointure: pick(row, 'pointure') || '',
    },
    documents: {},
    importedAt: new Date().toISOString(),
    source: 'import',
  };

  return { eleve, errors };
}

async function readExcelRows(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  return rows.filter((row) =>
    Object.values(row).some((v) => v != null && String(v).trim() !== ''),
  );
}

async function readCsvRows(file) {
  const text = await file.text();
  const sample = text.slice(0, 2048);
  const sep = sample.split(';').length >= sample.split(',').length ? ';' : ',';
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(sep).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(sep);
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()]));
  }).filter((row) => Object.values(row).some((v) => String(v).trim()));
}

export async function parseImportFile(file) {
  const name = String(file?.name ?? '').toLowerCase();
  if (name.endsWith('.csv')) return readCsvRows(file);
  return readExcelRows(file);
}

/**
 * @param {File} file
 * @returns {Promise<{ ok: number, skipped: number, errors: {ligne: number, message: string}[] }>}
 */
export async function importStudentsFromFile(file) {
  const rows = await parseImportFile(file);
  if (!rows.length) {
    return { ok: 0, skipped: 0, errors: [{ ligne: 1, message: 'Fichier vide ou sans lignes de données.' }] };
  }

  const toSave = [];
  const errors = [];
  let skipped = 0;
  const seenInFile = new Set();

  rows.forEach((row, idx) => {
    const ligne = idx + 2;
    const matPreview = matriculeFromRow(row, ligne).trim().toLowerCase();
    if (seenInFile.has(matPreview)) {
      errors.push({ ligne, message: `matricule: Doublon dans le fichier (${matPreview})` });
      skipped += 1;
      return;
    }
    seenInFile.add(matPreview);

    const { eleve, errors: rowErrors } = rowToEleve(row, ligne);
    if (rowErrors.length) {
      errors.push(...rowErrors);
      if (!eleve) {
        skipped += 1;
        return;
      }
    }
    if (eleve) toSave.push(eleve);
  });

  const ok = appendImportedEleves(toSave);
  skipped += Math.max(0, toSave.length - ok);

  return { ok, skipped, errors };
}
