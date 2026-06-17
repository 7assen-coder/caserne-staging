export const WILAYAS_MR = [
  {
    nom: 'Nouakchott-Nord',
    communes: ['Dar Naïm', 'Teyarett', 'Toujounine'],
  },
  {
    nom: 'Nouakchott-Ouest',
    communes: ['Tevragh-Zeïna', 'Ksar', 'Sebkha'],
  },
  {
    nom: 'Nouakchott-Sud',
    communes: ['Arafat', 'El Mina', 'Riyad'],
  },
  {
    nom: 'Adrar',
    communes: ['Atar', 'Aoujeft', 'Chinguetti', 'Ouadane'],
  },
  {
    nom: 'Assaba',
    communes: ['Kiffa', 'Barkéol', 'Boumdeid', 'Guérou', 'Kankossa'],
  },
  {
    nom: 'Brakna',
    communes: ['Aleg', 'Bababé', 'Boghé', 'M’Bagne', 'Magta-Lahjar'],
  },
  {
    nom: 'Dakhlet Nouadhibou',
    communes: ['Nouadhibou', 'Boulenouar'],
  },
  {
    nom: 'Gorgol',
    communes: ['Kaédi', 'Maghama', 'Monguel', 'M’Bout'],
  },
  {
    nom: 'Guidimakha',
    communes: ['Sélibaby', 'Ould Yengé', 'Ghabou'],
  },
  {
    nom: 'Hodh Ech Chargui',
    communes: ['Néma', 'Amourj', 'Bassikounou', 'Djiguenni', 'Oualata', 'Timbedra'],
  },
  {
    nom: 'Hodh El Gharbi',
    communes: ['Aïoun', 'Kobenni', 'Tamchekett', 'Tintane'],
  },
  {
    nom: 'Inchiri',
    communes: ['Akjoujt', 'Bennichab'],
  },
  {
    nom: 'Tagant',
    communes: ['Tidjikja', 'Moudjéria', 'Tichitt'],
  },
  {
    nom: 'Tiris Zemmour',
    communes: ['Zouérat', 'Bir Moghrein', 'F’dérik'],
  },
  {
    nom: 'Trarza',
    communes: ['Rosso', 'Boutilimit', 'Keur Macène', 'Mederdra', 'Ouad Naga', 'R’Kiz'],
  },
];

export const WILAYAS_OPTIONS = [
  { value: '', label: '— Sélectionner une wilaya —' },
  ...WILAYAS_MR.map((w) => ({ value: w.nom, label: w.nom })),
];

export function getCommunesForWilaya(nomWilaya) {
  const w = WILAYAS_MR.find((x) => x.nom === nomWilaya);
  return w ? w.communes : [];
}

export const COMMUNE_AUTRE_VALUE = '__autre__';

export function getCommuneOptionsForWilaya(nomWilaya) {
  const list = getCommunesForWilaya(nomWilaya);
  return [
    { value: '', label: '— Sélectionner —' },
    ...list.map((c) => ({ value: c, label: c })),
    { value: COMMUNE_AUTRE_VALUE, label: 'Autre (préciser)' },
  ];
}
