import { eleveService } from './eleveService';
import { apiPaths } from './apiPaths';
import {
  defaultMontantForCompagnie,
  resolveEleveCompagnie,
} from '../data/droitsCatalog';
import { apiPatch, apiPost, notifyChanged, withExpectedVersion } from '../utils/opsApi';

export const DROITS_CHANGED = 'esp-droits-changed';

function normalizeEleve(eleve) {
  return {
    ...eleve,
    dossierMilitaire: eleve.dossierMilitaire ?? {
      compagnie: eleve.compagnie ?? '',
      section: eleve.section ?? '',
    },
  };
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
    rowVersion: ligne?.row_version ?? 1,
  };
}

export const droitsService = {
  async loadBatch(annee, mois, compagnie) {
    const eleves = ((await eleveService.listAllPages({})) ?? []).map(normalizeEleve);
    const batch = await apiPost(apiPaths.droits.assurer, {
      annee: Number(annee),
      mois: Number(mois),
      compagnie,
      default_montant: defaultMontantForCompagnie(compagnie),
    });
    await apiPost(apiPaths.droits.seed(batch.id), {});
    const refreshed = await apiPost(apiPaths.droits.assurer, {
      annee: Number(annee),
      mois: Number(mois),
      compagnie,
    });
    const defaultMontant = Number(refreshed.default_montant ?? defaultMontantForCompagnie(compagnie));
    const lignes = refreshed.lignes ?? [];
    const ligneByEleve = Object.fromEntries(lignes.map((l) => [String(l.eleve), l]));
    const compagnieEleves = eleves.filter((e) => resolveEleveCompagnie(e) === compagnie);
    const rows = compagnieEleves
      .map((e) => toRow(e, ligneByEleve[String(e.id)], defaultMontant))
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));

    return {
      annee: Number(annee),
      mois: Number(mois),
      compagnie,
      batchId: refreshed.id,
      validated: Boolean(refreshed.validated_at),
      validatedAt: refreshed.validated_at ?? null,
      defaultMontant,
      batchRowVersion: refreshed.row_version ?? 1,
      rows,
    };
  },

  async saveAll(annee, mois, compagnie, rows, batchId) {
    let id = batchId;
    if (!id) {
      const batch = await this.loadBatch(annee, mois, compagnie);
      id = batch.batchId;
    }
    await Promise.all(
      (rows ?? []).map(async (row) => {
        if (row.ligneId) {
          await apiPatch(
            apiPaths.droits.ligne(row.ligneId),
            withExpectedVersion(
              {
                montant: row.montant,
                etat: row.etat,
                remarques: row.remarques ?? '',
              },
              row.rowVersion,
            ),
          );
        } else {
          await apiPost(apiPaths.droits.lignes, {
            batch: id,
            eleve: row.eleveId,
            montant: row.montant,
            etat: row.etat,
            remarques: row.remarques ?? '',
          });
        }
      }),
    );
    notifyChanged(DROITS_CHANGED);
  },

  async validate(annee, mois, compagnie, rows, batchId) {
    await this.saveAll(annee, mois, compagnie, rows, batchId);
    const batch = batchId
      ? { id: batchId }
      : await apiPost(apiPaths.droits.assurer, { annee, mois, compagnie });
    await apiPost(apiPaths.droits.valider(batch.id), {});
    notifyChanged(DROITS_CHANGED);
  },

  async unlock(annee, mois, compagnie, batchId) {
    const batch = batchId
      ? { id: batchId }
      : await apiPost(apiPaths.droits.assurer, { annee, mois, compagnie });
    await apiPost(apiPaths.droits.unlock(batch.id), {});
    notifyChanged(DROITS_CHANGED);
  },

  async setDefaultMontant(annee, mois, compagnie, montant, batchId, batchRowVersion) {
    const batch = batchId
      ? { id: batchId, row_version: batchRowVersion }
      : await apiPost(apiPaths.droits.assurer, { annee, mois, compagnie });
    await apiPatch(
      `/droits/batches/${batch.id}/`,
      withExpectedVersion(
        { default_montant: montant },
        batchRowVersion ?? batch.row_version,
      ),
    );
    notifyChanged(DROITS_CHANGED);
  },
};
