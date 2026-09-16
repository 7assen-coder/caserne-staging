I've added a django command that create some mock data with faker
```bash
    python manage.py seed_students --total <num_students>
```
For example
```bash
    python manage.py seed_students --total 5
```
And this is the output
```
{
  "id": 1,
  "contacts_parents": {
    "id": 1,
    "prenom_pere": "Alphonse",
    "nom_famille_pere": "Dubois",
    "fonction_pere": null,
    "tel_pere": "44444444",
    "tel_pere_whatsapp": null,
    "prenom_mere": "Michelle",
    "nom_famille_mere": "Lefebvre",
    "fonction_mere": null,
    "tel_mere": null,
    "tel_mere_whatsapp": null,
    "nom_urgence": null,
    "tel_urgence": "33333333",
    "tel_urgence_whatsapp": null,
    "eleve": 1
  },
  "dossier_sante": {
    "id": 1,
    "imc": "30.99",
    "groupe_sanguin": "B+",
    "assureur": null,
    "num_assure": null,
    "antecedents_medicaux": null,
    "maladies_chroniques": null,
    "medicaments_a_vie": null,
    "poids_kg": "73.66",
    "taille_cm": "154.17",
    "eleve": 1
  },
  "dossier_academique": {
    "id": 1,
    "departement": "GC-HE",
    "niveau_actuel": "5-DD",
    "semestre_actuel": "S3",
    "donnees_semestres": {},
    "diplome": null,
    "etablissement_echange": null,
    "etablissement_double_diplome": null,
    "specialite_mobilite": null,
    "parcours": "normal",
    "eleve": 1
  },
  "dossier_militaire": {
    "id": 1,
    "compagnie": "Compagnie A",
    "section": "Section 1",
    "sport_pratique": "Athlétisme",
    "tour_poitrine": null,
    "tour_ceinture": null,
    "tour_taille": null,
    "tour_bassin": null,
    "tour_cou": null,
    "longueur_manche": null,
    "longueur_dos": null,
    "longueur_cote": null,
    "pointure": null,
    "eleve": 1
  },
  "hebergement": {
    "id": 1,
    "batiment": "Bâtiment A",
    "etage": "Étage 1",
    "aile": "Ouest",
    "chambre": "Chambre 119",
    "lit": "A",
    "responsable_chambre": false,
    "responsable_aile": false,
    "responsable_etage": false,
    "eleve": 1
  },
  "documents": {
    "id": 1,
    "cin": null,
    "acte_naissance": null,
    "diplome_acces": null,
    "diplome_bac": null,
    "photo_identite_militaire": null,
    "photo_identite_civile": null,
    "photo_militaire_integrale": null,
    "eleve": 1
  },
  "matricule": 251280,
  "num_bac": "BAC-27504",
  "nni": "5594225886",
  "sexe": "H",
  "prenom": "Guillaume",
  "nom_famille": "Dubois",
  "date_naissance": "2007-01-19",
  "lieu_naissance": "Samson-la-Forêt",
  "nationalite": "Mauritanienne",
  "categorie_bac": "Etranger",
  "serie_bac": "C",
  "moyenne_bac": "14.29",
  "ecole_bac": "Dupuy Leroux SARL High School",
  "date_premiere_inscription": "2025-07-15",
  "annee_premiere_inscription": "2024-2025",
  "voie_acces": "2",
  "diplome_acces": "Baccalauréat",
  "etablissement_diplome": null,
  "adresse_primaire": "85, rue de Evrard\n36648 Boutinboeuf",
  "adresse_secondaire": null,
  "resident_avec_parents": true,
  "compte_bankily": null,
  "email_pro": "22009@esp.mr",
  "email_perso": "ldupuy@hotmail.fr",
  "tel1": "41888208",
  "tel2_whatsapp": null,
  "facebook": null,
  "linkedin": null
}
```


## Auth OTP / Celery (Resend)

Env: `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_TASK_ALWAYS_EAGER`, `USE_LOCMEM_CACHE`, `EMAIL_*`, `DEFAULT_FROM_EMAIL`.
Worker: `celery -A backend worker -l info`.
Endpoints under `/api/v1/auth/password/reset/` and `/api/v1/auth/password/`.

## Cookie JWT session

- Access/refresh live in **httpOnly** cookies (`esp_access`, `esp_refresh`) — not in JSON / localStorage.
- `GET /api/v1/auth/csrf/` then send `X-CSRFToken` on mutating requests.
- Refresh rotation + blacklist enabled (`ROTATE_REFRESH_TOKENS`, `token_blacklist`).
- Env: `JWT_COOKIE_SAMESITE` (`Lax` local, `None` for cross-origin SPA↔API), `JWT_COOKIE_SECURE`, optional `JWT_COOKIE_DOMAIN`.
- Login lockout: `LOGIN_MAX_FAILURES`, `LOGIN_LOCKOUT_SECONDS`, `LOGIN_IP_MAX_FAILURES`, `LOGIN_THROTTLE_RATE`.

1. `cp .env.example .env`
2. Set `EMAIL_HOST_USER=resend` / `EMAIL_HOST_PASSWORD` (Resend API key); keep `DEFAULT_FROM_EMAIL=Polyspace <noreply@polyspace.mr>`
3. Verify domain `polyspace.mr` in Resend (SPF/DKIM)
4. Restart runserver (and Celery if not eager)
5. Web: `/login/recovery` and Profil → Sécurité
