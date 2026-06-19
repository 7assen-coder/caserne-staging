import { eleveService } from './eleveService';
import {
  defaultMontantForCompagnie,
  resolveEleveCompagnie,
} from '../data/droitsCatalog';
import {
  getBatchMeta,
  getLignesForBatch,
  setBatchDefaultMontant,
  unlockBatch,
  upsertManyLignes,
  validateBatch,
} from '../utils/droitsStore';

function normalizeEleve(eleve) {
  return {
    ...eleve,
    dossierMilitaire: eleve.dossierMilitaire ?? {
      compagnie: eleve.compagnie ?? '',
      section: eleve.section ?? '',
    },
  };
}

function studentsForCompagnie(eleves, compagnie) {
  return eleves.filter((e) => resolveEleveCompagnie(e) === compagnie);
}

async function listElevesForDroits() {
  let eleves = [];
  try {
    eleves = (await eleveService.list({})) ?? [];
  } catch {
    eleves = [];
  }

  eleves = eleves.map(normalizeEleve);
  return eleves;
}

function toRow(eleve, ligne, defaultMontant) {
  const dm = eleve.dossierMilitaire ?? {};
  return {
    eleveId: eleve.id,
    matricule: eleve.matricule ?? '',
    nom: eleve.nom ?? '',
    prenom: eleve.prenom ?? '',
    photoUrl: eleve.photoUrl ?? null,
    section: dm.section ?? eleve.section ?? '',
    niveau: eleve.scolarite?.niveau ?? eleve.cycle ?? '',
    montant: ligne?.montant ?? defaultMontant,
    etat: ligne?.etat === 'percu' ? 'percu' : 'non_percu',
    remarques: ligne?.remarques ?? '',
    ligneId: ligne?.id ?? null,
  };
}

export const droitsService = {
  async loadBatch(annee, mois, compagnie) {
    const eleves = await listElevesForDroits();

    const meta = getBatchMeta(annee, mois, compagnie);
    const defaultMontant = meta.defaultMontant ?? defaultMontantForCompagnie(compagnie);
    const lignes = getLignesForBatch(annee, mois, compagnie);
    const ligneByEleve = Object.fromEntries(lignes.map((l) => [String(l.eleveId), l]));

    const compagnieEleves = studentsForCompagnie(eleves, compagnie);
    const rows = compagnieEleves
      .map((e) => toRow(e, ligneByEleve[String(e.id)], defaultMontant))
      .sort((a, b) => {
        const nameA = `${a.nom ?? ''} ${a.prenom ?? ''}`.trim();
        const nameB = `${b.nom ?? ''} ${b.prenom ?? ''}`.trim();
        return nameA.localeCompare(nameB, 'fr');
      });

    return {
      annee: Number(annee),
      mois: Number(mois),
      compagnie,
      validated: Boolean(meta.validatedAt),
      validatedAt: meta.validatedAt ?? null,
      defaultMontant,
      rows,
    };
  },

  saveAll(annee, mois, compagnie, rows) {
    upsertManyLignes(annee, mois, compagnie, rows);
  },

  validate(annee, mois, compagnie, rows) {
    upsertManyLignes(annee, mois, compagnie, rows);
    return validateBatch(annee, mois, compagnie);
  },

  unlock(annee, mois, compagnie) {
    return unlockBatch(annee, mois, compagnie);
  },

  setDefaultMontant(annee, mois, compagnie, montant) {
    return setBatchDefaultMontant(annee, mois, compagnie, montant);
  },
};
