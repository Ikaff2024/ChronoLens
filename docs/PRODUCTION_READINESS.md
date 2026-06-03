# ChronoLens OSINT - Preparation production

Version : 2026-06-03

## Secrets et configuration

- Remplacer `POSTGRES_PASSWORD` avant tout deploiement partage.
- Stocker les secrets dans le gestionnaire de secrets de la plateforme cible.
- Definir `ALLOWED_ORIGINS` avec les origines web autorisees, separees par des
  virgules.
- Ne pas reutiliser les comptes et mots de passe de demonstration.

## Reseau

- Ne pas exposer PostgreSQL publiquement.
- Terminer TLS devant l'API et l'interface web.
- Limiter l'acces a l'API aux origines attendues et au reseau applicatif.

## Observabilite

- Collecter les logs stdout de l'API.
- Indexer les evenements JSON `http_request` avec methode, chemin, statut et
  duree.
- Superviser `GET /health`, qui verifie aussi PostgreSQL.
- Alerter sur les reponses 5xx, les latences elevees et les redemarrages.

## Donnees

- Planifier des sauvegardes chiffrees et tester regulierement une restauration.
- Executer `prisma migrate deploy` avant chaque demarrage applicatif.
- Conserver la politique de retention de `docs/DATA_GOVERNANCE.md`.

## Railway

La cible de deploiement retenue est Railway. Le runbook detaille est dans
`docs/RAILWAY_DEPLOYMENT.md`.

Points importants :

- deployer trois services Railway : Postgres, API et web ;
- garder le contexte de build a la racine du monorepo ;
- definir `RAILWAY_DOCKERFILE_PATH` par service ;
- configurer `NEXT_PUBLIC_API_URL` avant le build du web ;
- configurer `ALLOWED_ORIGINS` avec le domaine public web final.
