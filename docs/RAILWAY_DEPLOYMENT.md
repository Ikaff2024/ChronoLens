# ChronoLens OSINT - Deploiement Railway

Version : 2026-06-03

## Architecture Railway

Creer un projet Railway avec trois services :

- `Postgres` : base PostgreSQL geree par Railway ;
- `chronolens-api` : service Docker construit depuis `apps/api/Dockerfile` ;
- `chronolens-web` : service Docker construit depuis `apps/web/Dockerfile`.

Ne pas definir de root directory par service. Les deux Dockerfiles s'appuient sur
le contexte racine du monorepo pour copier `package-lock.json` et les workspaces.

## Variables du service API

```text
RAILWAY_DOCKERFILE_PATH=/apps/api/Dockerfile
DATABASE_URL=${{Postgres.DATABASE_URL}}
ALLOWED_ORIGINS=https://${{chronolens-web.RAILWAY_PUBLIC_DOMAIN}}
```

Railway fournit `PORT` automatiquement. L'API ecoute explicitement sur
`0.0.0.0:$PORT` et execute `prisma migrate deploy` au demarrage du conteneur.

## Variables du service web

```text
RAILWAY_DOCKERFILE_PATH=/apps/web/Dockerfile
NEXT_PUBLIC_API_URL=https://${{chronolens-api.RAILWAY_PUBLIC_DOMAIN}}
```

`NEXT_PUBLIC_API_URL` doit etre disponible pendant le build Docker, car Next.js
inline les variables publiques dans le bundle client. Le Dockerfile declare cet
argument de build avec `ARG NEXT_PUBLIC_API_URL`. Si Railway ne transmet pas
automatiquement cette variable comme build arg dans le service, la declarer aussi
dans les parametres de build Docker du service web.

## Ordre de creation conseille

1. Creer le service `Postgres`.
2. Creer `chronolens-api` depuis le depot GitHub et ajouter les variables API.
3. Activer le domaine public du service API.
4. Creer `chronolens-web`, ajouter `NEXT_PUBLIC_API_URL` avec le domaine public
   API, puis deployer.
5. Activer le domaine public du web.
6. Mettre a jour `ALLOWED_ORIGINS` de l'API avec le domaine public web final et
   redeployer l'API.

## Verification apres deploiement

```text
GET https://<api-domain>/health
```

Le champ `checks.database` doit valoir `ok`.

Tester ensuite :

- connexion owner pilote ;
- chargement de la liste des dossiers ;
- creation d'un dossier de controle ;
- ajout d'une preuve ;
- verification de la timeline.

## Notes d'exploitation

- Ne pas exposer PostgreSQL publiquement.
- Ne pas reutiliser les secrets locaux comme secrets de production.
- Les comptes pilotes restent adaptes a une demonstration. Le remplacement par
  un fournisseur d'identite reste la prochaine tranche de securite.
- Les sauvegardes PostgreSQL doivent etre activees et une restauration doit etre
  testee avant usage metier reel.
