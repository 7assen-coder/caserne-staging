import { COMPAGNIES, SECTIONS, PROMOTIONS, FILIERES, NIVEAUX_SCOLARITE, VOIES_ACCES_ETUDIANT } from '../utils/constants';

const NOMS = [
  'OULD AHMED', 'OULD MOHAMED', 'OULD SIDI', 'OULD ALY', 'OULD BRAHIM',
  'OULD CHEIKH', 'MINT ABDELLAHI', 'MINT MOHAMED', 'OULD HAMADY', 'OULD BOUBACAR',
  'MINT SIDI', 'OULD MAALOUM', 'OULD ELY', 'OULD JIDDOU', 'MINT AHMED',
  'OULD TALEB', 'OULD DAHI', 'OULD BILAL', 'MINT YESLEM', 'OULD SALECK',
];
const PRENOMS = [
  'Mohamed', 'Ahmed', 'Sidi', 'Ely', 'Brahim', 'Hamady', 'Cheikh', 'Aly',
  'Moustapha', 'Boubacar', 'Yacoub', 'Salem', 'Abdellahi', 'Jiddou',
  'Fatimetou', 'Mariem', 'Aichetou', 'Zeinab', 'Khadijetou', 'Aminetou',
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function randomBetween(min, max, seed) {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return Math.floor(min + r * (max - min + 1));
}

export const eleves = Array.from({ length: 64 }).map((_, i) => {
  const nom = pick(NOMS, i * 3);
  const prenom = pick(PRENOMS, i * 7);
  const compagnie = pick(COMPAGNIES, Math.floor(i / 22));
  const section = pick(SECTIONS, i);
  const promotion = pick(PROMOTIONS, Math.floor(i / 16));
  const filiere = pick(FILIERES, i + 2);
  const absencesNonJustif = randomBetween(0, 14, i + 21);
  const suspendu = i % 11 === 0;
  const poids = 65 + (i % 25);
  const tailleCm = 165 + (i % 20);
  const deptCodes = ['IRT', 'GM', 'GC', 'GE', 'SID', 'MPG'];
  return {
    id: `e${1000 + i}`,
    matricule: `ESP/${22 + (i % 4)}/${deptCodes[i % 6]}/${String(31 + (i % 70)).padStart(3, '0')}`,
    nom,
    prenom,
    nomAr:
      i % 4 === 0
        ? 'محمد ولد الشيخ'
        : i % 4 === 1
          ? 'فاطمة منت أحمد'
          : i % 4 === 2
            ? 'مامادو ديوب'
            : 'مريم صو',
    nni: `${randomBetween(10000000000, 99999999999, i + 1)}`,
    numeroBac: `Bac${randomBetween(100000, 999999, i)}`,
    dateNaissance: `200${randomBetween(0, 4, i)}-0${randomBetween(1, 9, i + 3)}-${String(
      randomBetween(1, 28, i + 5),
    ).padStart(2, '0')}`,
    lieuNaissance: ['Nouakchott', 'Nouadhibou', 'Rosso', 'Kiffa', 'Atar'][i % 5],
    nationalite: i % 7 === 0 ? 'Sénégalaise' : 'Mauritanienne',
    categorieBac: i % 8 === 0 ? 'Étranger' : 'National',
    serieBac: ['S', 'TMGM', 'Sciences exp.', 'Mathématiques'][i % 4],
    ecoleBac: ['Lycée de Nouakchott', 'Lycée Kennedy', 'Lycée Rosso'][i % 3],
    residentAvecParents: i % 4 === 0 ? 'Oui' : 'Non',
    compteBankily: i % 5 === 0 ? `+222${randomBetween(10000000, 99999999, i)}` : '',
    sexe: i % 5 === 0 ? 'F' : 'M',
    section,
    compagnie,
    promotion,
    filiere,
    cycle: i % 4 === 0 ? 'Cycle préparatoire' : `${(i % 3) + 1}e année`,
    absencesNonJustif,
    sport: ['Foot', 'Course', 'Natation', 'Volley', 'Marche'][i % 5],
    /** actif | suspendu — suspendu = sanction / mesure avec période (voir `suspension`) */
    statut: suspendu ? 'suspendu' : 'actif',
    suspension: suspendu
      ? {
          motif: 'Mesure disciplinaire (démo) — manquement au règlement intérieur, période de retrait ciblé.',
          dateDebut: '2026-01-20',
          dateFin: '2026-04-20',
        }
      : null,
    /** Photo d’identité (démo) */
    photoUrl: `https://i.pravatar.cc/800?img=${(i % 60) + 1}`,
    scolarite: {
      departement: filiere,
      filiere,
      niveau: pick(NIVEAUX_SCOLARITE, i + 1),
      anneeUni1ere: `20${18 + (i % 6)}-${19 + (i % 6)}`,
      voieAcces: pick(
        VOIES_ACCES_ETUDIANT.map((v) => v.value),
        i,
      ),
      diplomeAcces: ['Licence', 'CNIM', 'Autre', ''][i % 4],
      etablissementPremierCycle: ['FSJP', 'FST', 'FMP', '—'][i % 4],
    },
    relevesSemestres: (() => [
        {
          periode: 'Semestre 1 · 2024-2025',
          code: 'S1_2024-2025',
          moyenneGenerale: '10,25',
          creditObtenu: 13,
          creditTotal: 16,
          resultat: 'Admis (réserve élément éliminatoire : ST14)',
          modules: [
            { intitule: 'Techniques de communications', code: 'HE12', credit: 2, note: 12.5, valide: true, codeDecision: 'V' },
            { intitule: 'Projet Entreprenariat et Innovation', code: 'HE14', credit: 4, note: 14, valide: true, codeDecision: 'V' },
            { intitule: "Systèmes d'exploitation I", code: 'IRT12', credit: 2, note: 11, valide: true, codeDecision: 'V' },
            { intitule: 'Modélisation', code: 'ST12-M', credit: 2, note: 9.5, valide: true, codeDecision: 'VCI' },
            { intitule: 'Informatique', code: 'ST12-I', credit: 3, note: 8, valide: true, codeDecision: 'VCE' },
            { intitule: 'Recherche opérationnelle', code: 'ST14', credit: 3, note: 6, valide: false, codeDecision: 'E' },
          ],
        },
        {
          periode: 'Semestre 2 · 2024-2025',
          code: 'S2_2024-2025',
          moyenneGenerale: '8,67',
          creditObtenu: 7,
          creditTotal: 10,
          resultat: 'Ajourné',
          modules: [
            { intitule: 'Management de projet & qualité (transversal)', code: 'HE21', credit: 3, note: 13, valide: true, codeDecision: 'V' },
            { intitule: 'Bases de données & applications', code: 'IRT22', credit: 4, note: 9, valide: true, codeDecision: 'VCI' },
            { intitule: 'Statistique & probabilité (approfondissement)', code: 'ST20', credit: 3, note: 4, valide: false, codeDecision: 'NV' },
          ],
        },
    ])(),
    sante: {
      groupeSanguin: ['O+', 'A+', 'B+', 'AB+', 'O-'][i % 5],
      allergies: i % 7 === 0 ? 'Pénicilline' : 'Aucune',
      suivi: i % 9 === 0 ? 'Kinésithérapie' : '—',
      assureur: i % 5 === 0 ? 'CNAM' : 'Privé',
      numeroAssure: `AS${randomBetween(10000, 99999, i)}`,
      antecedents: '—',
      maladiesChroniques: i % 11 === 0 ? 'Asthme léger' : '—',
      medicaments: '—',
      poids: String(poids),
      tailleCm: String(tailleCm),
      imc: (poids / ((tailleCm / 100) * (tailleCm / 100))).toFixed(1),
    },
    contact: {
      telephone: `+2224${randomBetween(1000000, 9999999, i + 4)}`,
      tel2: `+2224${randomBetween(1000000, 9999999, i + 14)}`,
      email: `${prenom.toLowerCase()}.${nom.split(' ').pop().toLowerCase()}@esp.mr`,
      emailPro: `${prenom.toLowerCase()}@esp.mr`,
      emailPerso: `${prenom.toLowerCase()}.perso@email.com`,
      adresse: `Quartier ${['Tevragh Zeina', 'Arafat', 'El Mina', 'Dar Naïm'][i % 4]}, Nouakchott`,
      adresseSecondaire: i % 5 === 0 ? 'Dar Naïm, villa 12' : '',
      parent: `${pick(PRENOMS, i + 1)} ${nom}`,
      parentTel: `+2222${randomBetween(1000000, 9999999, i + 9)}`,
      telParent1Whatsapp: `+2223${randomBetween(1000000, 9999999, i)}`,
      telParent2Appel: `+2222${randomBetween(1000000, 9999999, i + 3)}`,
    },
    parents: {
      prenomPere: pick(PRENOMS, i + 2),
      fonctionPere: ['Militaire', 'Fonctionnaire', 'Commerce'][i % 3],
      prenomMere: pick(PRENOMS, i + 5),
      nomMere: pick(NOMS, i + 6),
      fonctionMere: ['Enseignante', 'Médecin', '—'][i % 3],
    },
    habillement: {
      tailleChemise: ['S', 'M', 'L', 'XL'][i % 4],
      taillePantalon: String(38 + (i % 10)),
      pointure: String(39 + (i % 8)),
    },
    hebergement: {
      batiment: ['Résidence 1', 'Résidence Filles'][i % 3 === 0 ? 1 : 0],
      etage: String((i % 4) + 1),
      aile: ['A', 'B', 'C'][i % 3],
      chambre: `${100 + (i % 40)}`,
      responsableChambre: i % 7 === 0,
      responsableAile: false,
      responsableEtage: i % 15 === 0,
    },
    dossier: [
      { id: 'p1', nom: 'Photo identité', type: 'image', date: '2025-09-01' },
      { id: 'p2', nom: 'CIN recto', type: 'image', date: '2025-09-01' },
      { id: 'p3', nom: 'Diplôme Bac', type: 'pdf', date: '2025-09-05' },
    ],
  };
});

/** Indicateurs synthétiques (maquette PDF + cohérence effectif mock) */
export const kpiScolarite = {
  etudiantsActifs: 1248,
  inscriptionsEnAttente: 37,
  nouvellesInscriptionsSemaine: 12,
  /** Dossiers en attente de validation administrative */
  dossiersAValider: 6,
  moyennePromo: '13,82',
};

export const inscriptionsParFiliere = FILIERES.map((label, idx) => ({
  filiere: label,
  confirmees: 120 + ((idx * 17) % 55),
  enAttente: 4 + (idx % 9),
}));

export const activiteRecenteScolarite = [
  { heure: '09:12', texte: 'Nouvelle inscription — Idir Tahar (2e année, IRT)' },
  { heure: '08:47', texte: 'Validation de relevé S2 — lot SID (32 étudiants)' },
  { heure: '08:20', texte: 'Dossier incomplet — Med Hassen (pièces manquantes)' },
  { heure: 'Veille', texte: 'Export relevé de notes Promo 2022 (148 étudiants)' },
];

export const aSurveillerEleves = eleves.slice(0, 4).map((e, i) => ({
  prenom: e.prenom,
  nom: e.nom,
  id: e.id,
  matricule: e.matricule,
  cycle: e.cycle,
  alertLabel: i < 2 ? 'Dossier incomplet' : 'Moyennes à valider',
}));

export const appels = Array.from({ length: 20 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const total = 20 + (i % 5);
  const absents = (i % 6);
  return {
    id: `a${1000 + i}`,
    date: date.toISOString(),
    type: ['matin', 'apres_midi', 'exceptionnel'][i % 3],
    section: pick(SECTIONS, i),
    compagnie: pick(COMPAGNIES, Math.floor(i / 6)),
    superviseur: 'Lt. ELY Ahmed',
    total,
    presents: total - absents,
    absents,
    statut: i === 0 ? 'en_cours' : 'transmis',
  };
});

export const permissions = Array.from({ length: 14 }).map((_, i) => {
  const eleve = eleves[i * 2];
  const debut = new Date();
  debut.setDate(debut.getDate() + i - 5);
  const fin = new Date(debut);
  fin.setDate(debut.getDate() + 1 + (i % 3));
  const statuts = ['en_attente', 'valide', 'refuse'];
  return {
    id: `p${1000 + i}`,
    eleveId: eleve.id,
    eleveNom: `${eleve.nom} ${eleve.prenom}`,
    matricule: eleve.matricule,
    section: eleve.section,
    typeAbsence: ['cours', 'instruction', 'activite'][i % 3],
    motif: ['medical', 'familial', 'administratif', 'social'][i % 4],
    dateDebut: debut.toISOString().slice(0, 10),
    dateFin: fin.toISOString().slice(0, 10),
    justificatif:
      i % 2 === 0
        ? { nom: 'certificat_medical.pdf', type: 'pdf' }
        : { nom: 'convocation.jpg', type: 'image' },
    commentaire: i % 4 === 0 ? 'Rendez-vous médical à l\'hôpital' : '',
    statut: statuts[i % statuts.length],
    validePar: i % 3 === 1 ? 'Cap. OULD AHMED Mohamed' : null,
    dateDemande: new Date(Date.now() - i * 86400000).toISOString(),
  };
});

export const stock = [
  { id: 's1', article: 'Chemise de combat', taille: 'M', quantite: 45, seuil: 20, statut: 'ok' },
  { id: 's2', article: 'Chemise de combat', taille: 'L', quantite: 12, seuil: 20, statut: 'alerte' },
  { id: 's3', article: 'Pantalon treillis', taille: '42', quantite: 30, seuil: 15, statut: 'ok' },
  { id: 's4', article: 'Pantalon treillis', taille: '44', quantite: 8, seuil: 15, statut: 'alerte' },
  { id: 's5', article: 'Rangers cuir', taille: '42', quantite: 22, seuil: 10, statut: 'ok' },
  { id: 's6', article: 'Rangers cuir', taille: '44', quantite: 3, seuil: 10, statut: 'critique' },
  { id: 's7', article: 'Béret', taille: '56', quantite: 60, seuil: 20, statut: 'ok' },
  { id: 's8', article: 'Ceinturon', taille: 'Std', quantite: 40, seuil: 15, statut: 'ok' },
  { id: 's9', article: 'Insigne grade', taille: 'Std', quantite: 18, seuil: 20, statut: 'alerte' },
  { id: 's10', article: 'Sac paquetage', taille: 'Std', quantite: 25, seuil: 10, statut: 'ok' },
];

export const mouvementsStock = Array.from({ length: 12 }).map((_, i) => ({
  id: `m${1000 + i}`,
  date: new Date(Date.now() - i * 86400000).toISOString(),
  article: stock[i % stock.length].article,
  taille: stock[i % stock.length].taille,
  quantite: -(1 + (i % 3)),
  type: 'attribution',
  beneficiaire: `${eleves[i].nom} ${eleves[i].prenom}`,
  matricule: eleves[i].matricule,
  operateur: 'Cap. OULD AHMED Mohamed',
}));

export const presenceTrend = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    jour: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
    date: d.toISOString().slice(0, 10),
    taux: 88 + ((i * 3) % 10),
    presents: 430 - ((i * 7) % 15),
    absents: 20 + ((i * 2) % 6),
  };
});

export const presenceParSection = SECTIONS.map((section, i) => ({
  section,
  taux: 92 - ((i * 3) % 8),
  effectif: 20 + (i % 5),
}));

export const topAbsences = eleves.slice(0, 10).map((e, i) => ({
  eleve: `${e.nom} ${e.prenom}`,
  matricule: e.matricule,
  section: e.section,
  absences: 12 - i + e.absencesNonJustif % 4,
  nonJustifiees: e.absencesNonJustif,
}));

export const alertes = [
  { id: 'al1', type: 'scolarite', message: 'Dossiers incomplets — 6 étudiants (pièces manquantes)', severite: 'haute' },
  { id: 'al2', type: 'absence', message: '14 absences non justifiées recensées cette semaine', severite: 'haute' },
  { id: 'al3', type: 'inscription', message: '37 inscriptions en attente de validation', severite: 'moyenne' },
];
