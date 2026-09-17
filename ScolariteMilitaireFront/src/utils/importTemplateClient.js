/** Client-side fallback template = dossier COLUMN_HEADERS (frontend-only mode). */

import { DOSSIER_COLUMN_HEADERS } from '../data/dossierExcelColumns';

/** Minimal example row aligned with dossier headers. */
const EXAMPLE_BY_HEADER = {
  matricule: '251280',
  nom_famille: 'Ould Ahmed',
  prenom: 'Mohamed',
  nni: '9800123456',
  sexe: 'M',
  date_naissance: '15/05/2002',
  nationalite: 'Mauritanie',
  wilaya_naissance: 'Nouakchott',
  commune_naissance: 'Tevragh-Zeina',
  commune_naissance_autre: '',
  lieu_naissance: '',
  num_bac: '12345',
  categorie_bac: 'National',
  serie_bac: 'C',
  moyenne_bac: '14,50',
  ecole_bac: 'Lycée Nationale',
  departement: 'IRT',
  niveau: '3e année',
  statut_academique: 'Normal',
  annee_univ_1ere: '2024-2025',
  date_premiere_inscription: '01/09/2024',
  voie_acces: '1',
  diplome_acces: 'CNIM',
  etablissement_diplome: 'IPGEI',
  etablissement_mobilite: '',
  specialite_mobilite: '',
  annee_debut_mobilite: '',
  adresse_primaire: 'Tevragh-Zeina',
  adresse_secondaire: '',
  telephone: '31234567',
  tel2: '',
  email_perso: 'med.ahmed@gmail.com',
  resident_avec_parents: 'Oui',
  prenom_pere: 'Ahmed',
  nom_famille_pere: 'Ould Ahmed',
  fonction_pere: '',
  prenom_mere: '',
  nom_famille_mere: '',
  fonction_mere: '',
  tel_pere: '',
  tel_pere_whatsapp: '',
  tel_mere: '',
  tel_mere_whatsapp: '',
  nom_urgence: '',
  tel_urgence: '20001122',
  tel_urgence_whatsapp: '',
  groupe_sanguin: 'O+',
  num_assure: '',
  assureur: '',
  antecedents_medicaux: '',
  maladies_chroniques: '',
  medicaments: '',
  poids_kg: '72',
  taille_cm: '178',
  compte_bankily: '',
  sport_pratique: 'Football',
  tour_poitrine: '',
  tour_ceinture: '',
  tour_taille: '',
  tour_bassin: '',
  tour_cou: '',
  longueur_manche: '',
  longueur_dos: '',
  longueur_cote: '',
  pointure: '',
  batiment: '',
  etage: '',
  aile: '',
  chambre: '',
  lit: '',
  responsable_chambre: '',
  responsable_aile: '',
  responsable_etage: '',
};

export const IMPORT_TEMPLATE_COLUMNS = DOSSIER_COLUMN_HEADERS.map((h) => [
  h,
  EXAMPLE_BY_HEADER[h] ?? '',
]);

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadClientImportTemplate(type = 'xlsx') {
  const headers = IMPORT_TEMPLATE_COLUMNS.map(([h]) => h);
  const example = IMPORT_TEMPLATE_COLUMNS.map(([, v]) => v);

  if (type === 'csv') {
    const lines = [headers.join(';')];
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, 'Polyspace_modele_dossier_eleve.csv');
    return;
  }

  const XLSX = await import('xlsx-js-style');
  const ws = XLSX.utils.aoa_to_sheet([
    ['Polyspace — modèle dossier élève'],
    headers,
    example,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'Polyspace_modele_dossier_eleve.xlsx',
  );
}
