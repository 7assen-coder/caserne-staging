# Lenteur

## Symptômes

Pages longues à charger, listes lentes, exports qui tournent longtemps.

## Distinguer

| Cas | Interprétation |
|-----|----------------|
| **Premier chargement du matin** un peu lent, puis normal | Acceptable si &lt; quelques secondes |
| **Tout le monde** lent en même temps | Incident perf — voir statut, puis ops |
| **Un seul poste** lent | Navigateur, PC, réseau local |
| Site de **test** (`gesesp.onrender.com`) très lent au premier clic | Normal (mise en veille) — pas la production |

## Vérifications

1. `https://status.polyspace.mr`
2. Hard refresh (voir [04-apres-maintenance.md](04-apres-maintenance.md))
3. Fermer les onglets lourds ; réessayer la liste élèves page par page
4. Noter l’heure et l’écran concerné (login, dossiers, export…)

## Escalade

Lenteur **généralisée &gt; 15 minutes** → P1 ops (objectifs de performance : login &lt; 2 s, listes &lt; 1 s en production).
