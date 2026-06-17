/** Colonnes du modèle d’import (front uniquement — fiche étudiant complète). */
export const IMPORT_TEMPLATE_COLUMNS = [
  ['matricule', 'ESP/24/IRT/101'],
  ['nom_famille', 'Ould Ahmed'],
  ['prenom', 'Mohamed'],
  ['nni', '9800123456'],
  ['sexe', 'H'],
  ['date_naissance', '2002-05-15'],
  ['lieu_naissance', 'Nouakchott'],
  ['nationalite', 'Mauritanienne'],
  ['num_bac', 'BAC-2021-001'],
  ['serie_bac', 'C'],
  ['categorie_bac', 'National'],
  ['moyenne_bac', '14.50'],
  ['ecole_bac', 'Lycée Nationale'],
  ['date_premiere_inscription', '2024-09-01'],
  ['annee_premiere_inscription', '2024-2025'],
  ['voie_acces', '1'],
  ['diplome_acces', 'Baccalauréat'],
  ['etablissement_diplome', 'Lycée Nationale'],
  ['departement', 'IRT'],
  ['niveau', '3'],
  ['semestre', 'S1'],
  ['parcours', 'En cours normal'],
  ['compagnie', '1re Compagnie'],
  ['section', 'Section 1'],
  ['sport_pratique', 'Football'],
  ['email_perso', 'med@gmail.com'],
  ['email_pro', '101@esp.mr'],
  ['telephone', '22334455'],
  ['whatsapp', '22334456'],
  ['adresse_primaire', 'Tevragh Zeina, Nouakchott'],
  ['adresse_secondaire', ''],
  ['resident_avec_parents', 'Non'],
  ['compte_bankily', ''],
  ['groupe_sanguin', 'O+'],
  ['poids_kg', '72'],
  ['taille_cm', '178'],
  ['assureur', 'CNAM'],
  ['num_assure', 'AS12345'],
  ['antecedents_medicaux', '—'],
  ['maladies_chroniques', '—'],
  ['medicaments', '—'],
  ['prenom_pere', 'Ahmed'],
  ['nom_famille_pere', 'Ould Ahmed'],
  ['fonction_pere', 'Fonctionnaire'],
  ['tel_pere', '20001122'],
  ['prenom_mere', 'Fatimetou'],
  ['nom_famille_mere', 'Mint Mohamed'],
  ['fonction_mere', 'Enseignante'],
  ['tel_mere', '20009988'],
  ['nom_urgence', 'Père'],
  ['tel_urgence', '20001122'],
  ['batiment', 'Résidence 1'],
  ['etage', '2'],
  ['aile', 'A'],
  ['chambre', '205'],
  ['lit', 'B'],
  ['tour_poitrine', '96'],
  ['tour_ceinture', '82'],
  ['tour_taille', '78'],
  ['tour_bassin', '94'],
  ['tour_cou', '38'],
  ['longueur_manche', '62'],
  ['longueur_dos', '72'],
  ['longueur_cote', '58'],
  ['pointure', '42'],
  ['taille_chemise', 'M'],
  ['taille_pantalon', '42'],
  ['etablissement_echange', ''],
  ['etablissement_double_diplome', ''],
  ['specialite_mobilite', ''],
];

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
    const lines = [headers.join(';'), example.join(';')];
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, 'modele-import-etudiants.csv');
    return;
  }

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'modele-import-etudiants.xlsx',
  );
}
