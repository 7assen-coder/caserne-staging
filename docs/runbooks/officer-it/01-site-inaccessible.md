# Site inaccessible

## Symptômes

Page blanche, erreur réseau, « impossible de joindre le serveur », ou timeout sur `https://polyspace.mr`.

## Vérifications (3–5 min)

1. Ouvrir `https://status.polyspace.mr` — le service est-il en rouge ?
2. Vérifier votre connexion internet (autre site web).
3. Essayer `https://polyspace.mr` en navigation privée / autre navigateur.
4. La production **ne dort pas** (contrairement au site de test Render) — ne pas « attendre un réveil ».
5. Demander à un collègue sur un autre poste si le problème est général.

## Escalade

- **Général (plusieurs postes)** → **P0** — contacter l’ops (voir [00-contacts-et-statuts.md](00-contacts-et-statuts.md)).
- **Un seul poste** → vérifier antivirus / proxy local, puis P1 si ça bloque le travail.
