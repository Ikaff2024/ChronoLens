# ChronoLens OSINT - Notes de securite

Version : 2026-06-02

## Audit npm

`npm audit --audit-level=high` retourne un code de succes mais signale deux
vulnerabilites moderees transitives dans `postcss`, via Next.js.

Le correctif automatique propose `npm audit fix --force` avec un changement majeur
et incompatible de Next.js. Il ne doit pas etre applique sans campagne de mise a
jour et tests frontend dedies.

## Mesures deja en place

- sessions opaques stockees sous forme de hash ;
- expiration et purge auditee des sessions ;
- rotation obligatoire du mot de passe initial ;
- verrouillage temporaire apres cinq echecs de login ;
- roles owner, analyst et viewer ;
- CORS configurable par `ALLOWED_ORIGINS` ;
- cloisonnement par organisation ;
- audit des actions metier sensibles.

## Avant production

- remplacer les secrets de demonstration ;
- activer TLS ;
- ajouter une politique de mots de passe adaptee au fournisseur d'identite cible ;
- integrer un scanner de dependances dans la CI ;
- revoir les en-tetes HTTP de securite au niveau du reverse proxy.
