# Connexion impossible

## Symptômes

Écran de login : mot de passe refusé, compte verrouillé, ou « trop d’essais ».

## Vérifications

1. E-mail en **`@esp.mr`** (casse ignorée ; pas d’espace).
2. Verr. Maj. / clavier FR — retaper le mot de passe.
3. Après plusieurs échecs, le compte peut être **temporairement bloqué** — attendre 15–30 min puis réessayer.
4. Utiliser **Mot de passe oublié** (`/login/recovery`) : code OTP reçu sur l’e-mail professionnel. Vérifier les indésirables. (En attendant le domaine de prod, l’expéditeur peut être une adresse Gmail d’ops.)
5. Ne pas utiliser le site de **test** (bandeau jaune) avec un compte prod.

## Escalade

- OTP non reçu après 10 min → ops (vérifier messagerie / indésirables / config SMTP).
- Compte bloqué au-delà d’une heure → ops + responsable scolarité.
