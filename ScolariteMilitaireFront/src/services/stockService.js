import { mockDelay } from './api';
import { stock, mouvementsStock } from '../data/mockData';

let _stock = [...stock];
let _mouvements = [...mouvementsStock];

export const stockService = {
  list: () => mockDelay(_stock),
  get: (id) => mockDelay(_stock.find((s) => s.id === id)),
  attribuer: ({ articleId, eleve, quantite = 1, operateur = 'Cap. OULD AHMED Mohamed' }) => {
    _stock = _stock.map((s) =>
      s.id === articleId
        ? {
            ...s,
            quantite: Math.max(0, s.quantite - quantite),
            statut: s.quantite - quantite <= s.seuil ? 'alerte' : 'ok',
          }
        : s,
    );
    const article = _stock.find((s) => s.id === articleId);
    const mvt = {
      id: `m${Date.now()}`,
      date: new Date().toISOString(),
      article: article.article,
      taille: article.taille,
      quantite: -quantite,
      type: 'attribution',
      beneficiaire: `${eleve.nom} ${eleve.prenom}`,
      matricule: eleve.matricule,
      operateur,
    };
    _mouvements = [mvt, ..._mouvements];
    return mockDelay(mvt);
  },
  mouvements: () => mockDelay(_mouvements),
};
