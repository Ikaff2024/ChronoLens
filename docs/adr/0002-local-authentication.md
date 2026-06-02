# ADR 0002: authentification locale du pilote

## Statut

Accepte pour le pilote prive uniquement.

## Decision

Le MVP utilise des comptes locaux, des mots de passe haches avec `scrypt` et des
sessions opaques aleatoires. Seul le hash SHA-256 du jeton de session est stocke en
base. Les sessions expirent apres sept jours.

Chaque utilisateur accede a une organisation via un membership et un role :

- `OWNER` : lecture et ecriture.
- `ANALYST` : lecture et ecriture.
- `VIEWER` : lecture seule.

Les routes metier exigent `Authorization: Bearer <token>`. L'acteur inscrit dans le
journal d'audit est derive de la session et ne peut pas etre fourni par le client.

## Limites

Le compte `pilot@chronolens.local` et son mot de passe de demonstration servent
uniquement au developpement local. Avant exposition reseau, il faudra retirer ce
bootstrap automatique, ajouter rotation et revocation de sessions, protection
anti-bruteforce, recuperation de mot de passe et integration SSO selon les clients.

La console `OWNER` cree un membre avec un mot de passe initial temporaire. La rotation
est imposee au premier login avant tout acces aux routes metier. Apres cinq echecs de
connexion, le compte est verrouille pendant quinze minutes.
