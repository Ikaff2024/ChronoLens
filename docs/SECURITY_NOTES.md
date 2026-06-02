# ChronoLens OSINT - Notes de securite

Version : 2026-06-02

## Audit npm

`npm audit --audit-level=moderate` ne signale plus de vulnerabilite.

Next.js `15.5.19` declare encore explicitement `postcss@8.4.31`, version affectee
par `GHSA-qx2v-qp2m-jg93`. Le manifeste racine applique un override cible vers
`postcss@8.5.15`, version corrigee. `npm ci`, l'audit, le lint, les tests et le
build passent avec cette resolution.

`npm ls postcss --all` conserve un avertissement `invalid` car le contrat publie
par Next.js n'a pas encore ete actualise. Retirer l'override lorsqu'une version
de Next.js embarquera officiellement `postcss >= 8.5.10`.

## Mesures deja en place

- sessions opaques stockees sous forme de hash ;
- expiration et purge auditee des sessions ;
- rotation obligatoire du mot de passe initial ;
- verrouillage temporaire apres cinq echecs de login ;
- roles owner, analyst et viewer ;
- CORS configurable par `ALLOWED_ORIGINS` ;
- cloisonnement par organisation ;
- audit des actions metier sensibles ;
- Dependabot hebdomadaire et alertes de vulnerabilites GitHub actives.

## Avant production

- remplacer les secrets de demonstration ;
- activer TLS ;
- ajouter une politique de mots de passe adaptee au fournisseur d'identite cible ;
- surveiller et traiter les alertes Dependabot ;
- revoir les en-tetes HTTP de securite au niveau du reverse proxy.
