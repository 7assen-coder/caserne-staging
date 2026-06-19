const FICHE_KEYWORDS = [
  { re: /poitrine/i, key: 'tourPoitrine' },
  { re: /ceinture/i, key: 'tourCeinture' },
  { re: /taille(?!.*manche)/i, key: 'tourTaille' },
  { re: /bassin/i, key: 'tourBassin' },
  { re: /cou(?!turi)/i, key: 'tourCou' },
  { re: /manche/i, key: 'longueurManche' },
  { re: /dos/i, key: 'longueurDos' },
  { re: /côt[eé]|cote/i, key: 'longueurCote' },
  { re: /pointure/i, key: 'pointure' },
  { re: /poids/i, key: 'poids' },
  { re: /taille\s*\(?cm\)?|stature/i, key: 'tailleCm' },
];

export function parseFicheTaillesText(rawText) {
  const out = {};
  if (!rawText) return out;
  const lines = String(rawText).split(/\r?\n|;|·/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    for (const { re, key } of FICHE_KEYWORDS) {
      if (re.test(line)) {
        const m = line.match(/(\d{1,3}(?:[.,]\d+)?)/);
        if (m && !out[key]) {
          out[key] = m[1].replace(',', '.');
        }
        break;
      }
    }
  }
  return out;
}
