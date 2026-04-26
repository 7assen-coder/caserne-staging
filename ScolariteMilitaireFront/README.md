# Scolarité militaire — interface web

Application **React** (Vite) pour le pilotage de la scolarité : tableaux de bord, effectifs, inscriptions, fiches étudiants, exports (PDF, Word, Excel, PPT) et paramétrage.

## Auteur

**Med Hassen** — [`mohasseenn@gmail.com`](mailto:mohasseenn@gmail.com)  
Voir [`AUTHORS.md`](./AUTHORS.md).

## Prérequis

- Node.js 20+ (recommandé)
- npm

## Commandes

```bash
npm install
npm run dev        # dev local — http://localhost:5173
npm run build      # build production (sortie ./dist)
npm run preview    # servir le build
npm run lint       # ESLint
```

## Structure utile

| Dossier / fichier | Rôle |
|-------------------|------|
| `src/pages/` | Pages routées (login, étudiants, inscriptions, paramètres, etc.) |
| `src/components/` | Composants réutilisables et par domaine |
| `src/data/` | Données de démonstration et catalogues (formations, constantes) |
| `src/utils/` | Exports documentaires, impression |
| `docs/DESIGN_REFERENCE.md` | Rappel des directions design (maquette PDF) |

Les données métiers affichées en démonstration proviennent de fichiers mock ; brancher l’API réelle via `src/services/` selon l’environnement.

## Licence

Projet **privé** — usage réservé à l’établissement / équipe autorisée, sauf mention contraire.
