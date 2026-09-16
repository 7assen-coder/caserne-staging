# Demande de restauration de données

À remplir et transmettre à l’ops **avant** toute restauration production.  
La restauration efface ou remplace des données : double validation obligatoire (ops + responsable).

## Informations à fournir

| Champ | Votre réponse |
|-------|----------------|
| Date et heure approximative de la perte | |
| Ce qui a disparu ou est incorrect (élèves, modules…) | |
| Combien d’élèves / dossiers concernés | |
| Qui a constaté le problème | |
| Approbation responsable (nom + paraphe) | |
| Urgence (P0 / P1 / P2) | |

## Ce que l’IT encadrement ne fait pas

- Pas d’accès SSH / Docker / base de données
- Pas de restauration « à l’aveugle » sans l’ops

## Suite côté ops

Voir la procédure technique : restauration d’abord en base de test (`esp_drill`), puis production seulement avec accord formalisé. Objectif : perte de données max. **24 h** (sauvegarde quotidienne) tant que le PITR n’est pas activé.
