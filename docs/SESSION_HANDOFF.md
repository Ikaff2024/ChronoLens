# ChronoLens OSINT - Journal de reprise

Derniere mise a jour : 2026-06-02

Depot distant : `https://github.com/Ikaff2024/ChronoLens.git`

Branche publiee : `main`

CI GitHub Actions validee : `https://github.com/Ikaff2024/ChronoLens/actions/runs/26842512309`

## Regle de maintenance

Mettre ce fichier a jour apres chaque tranche fonctionnelle terminee, apres toute
decision d'architecture importante et avant de quitter une session. Conserver un
format concis : etat reel, validations executees, limites connues et prochaine
action concrete.

## Objectif produit

ChronoLens est un MVP d'investigation OSINT temporelle. Il centralise les dossiers,
entites, relations datees, preuves publiques, evenements, alertes explicables et
traces d'audit dans un espace cloisonne par organisation.

## Etat actuel

Le MVP local est fonctionnel de bout en bout :

- monorepo npm workspaces avec `apps/api` et `apps/web` ;
- API NestJS, Prisma et PostgreSQL ;
- interface Next.js disponible sur `http://localhost:3020` ;
- API disponible sur `http://localhost:3021` ;
- PostgreSQL expose localement sur le port `5440` ;
- authentification locale par sessions opaques ;
- roles `OWNER`, `ANALYST` et `VIEWER` ;
- cloisonnement pilote par `x-organization-id` avec valeur locale `pilot-org` ;
- rotation obligatoire du mot de passe initial des nouveaux membres ;
- verrouillage temporaire apres cinq echecs de connexion ;
- dossiers, entites, import CSV deduplique, relations temporelles et preuves ;
- timeline, journal d'audit, recherche, exports JSON et CSV ;
- alertes deterministes et explicables ;
- empreinte SHA-256 des preuves calculee cote serveur ;
- endpoint de verification d'integrite avec statuts `VALID`, `MISMATCH` et
  `UNHASHED` ;
- backfill idempotent des empreintes historiques ;
- audit des verifications d'integrite et des backfills.
- politique initiale de gouvernance OSINT documentee ;
- synthese de revue et retention par dossier ;
- archivage explicite, idempotent et audite des dossiers.
- migrations Prisma versionnees appliquees avec `migrate deploy` ;
- healthcheck API connecte a PostgreSQL ;
- purge owner idempotente des sessions expirees avec audit ;
- runbook PostgreSQL de sauvegarde et restauration.
- pagination progressive et retrocompatible des listes volumineuses ;
- purge gouvernee des dossiers archives arrives a echeance ;
- CORS configurable et logs HTTP JSON ;
- smoke test HTTP et benchmark PostgreSQL reproductibles ;
- CI connectee a une vraie base PostgreSQL.
- smoke HTTP CI autonome sur base vide et attente active du healthcheck.
- CI distante GitHub Actions verte sur la branche `main`.
- depot GitHub initialise et branche `main` publiee.

## Derniere tranche terminee

Durcissement et volumetrie du MVP :

- pagination optionnelle `page` et `pageSize` sur dossiers, entites, relations et
  preuves, avec reponse legacy preservee sans parametre ;
- navigation precedente/suivante des entites dans le workspace ;
- endpoint `GET /investigations/retention/due` ;
- purge owner `DELETE /investigations/:id` reservee aux dossiers archives arrives
  a echeance, avec confirmation `PURGE <id>` et attestation d'export ;
- audit organisation `INVESTIGATION_PURGED` independant du dossier supprime ;
- `ALLOWED_ORIGINS` configurable et mot de passe PostgreSQL surchargeable ;
- logs HTTP JSON avec chemin, statut et duree ;
- scripts `smoke:http` et `benchmark:postgres` ;
- CI avec PostgreSQL, migrations, qualite, build et smoke HTTP.

## Validation la plus recente

Execute le 2026-06-02 :

```text
npm run lint     OK
npm test         OK - 28 tests, 10 suites
npm run build    OK
docker compose up -d --build api web    OK
docker compose ps                       3 services healthy
```

Smoke test HTTP reel :

```text
dossier          Due diligence - Atlas Energy
preuves historiques avant backfill  2
preuves regularisees                 2
second backfill idempotent           0
preuves sans hash apres backfill     0
verification                        VALID
audit backfill                       2 entrees
dossier gouvernance                 UI smoke test
statut avant archivage              ACTIVE
statut apres archivage              ARCHIVED
second archivage idempotent         ARCHIVED
audit archivage                     1 entree
suppression automatique             false
migrations Prisma appliquees         2
healthcheck base                     ok
purge sessions expirees              0 puis 0
audit purge sessions                 2 entrees
smoke HTTP pagination                OK
CORS origine locale                  OK
pageSize=101                         HTTP 400
retention due                        0 dossier
benchmark PostgreSQL                 250 requetes
benchmark p50                        14.36 ms
benchmark p95                        30.80 ms
benchmark max                        164.53 ms
```

Smoke test navigateur reel :

```text
http://localhost:3020
panneau             Integrite des preuves
preuves historiques 0
action              clic sur Verifier
resultat visible    1 valides
statut visible       ARCHIVED
fin de retention    visible
suppression auto    DESACTIVEE
controle navigateur  connexion, pagination et gouvernance visibles
```

## Demarrage et acces local

Lancer ou reconstruire :

```powershell
docker compose up -d --build
docker compose ps
```

Compte owner pilote :

```text
pilot@chronolens.local
chronolens-pilot
```

Healthcheck :

```text
GET http://localhost:3021/health
```

## Donnees de demonstration

Le dossier principal est `Due diligence - Atlas Energy`. Il contient des entites,
relations et trois preuves avec empreinte serveur. Le backfill historique a deja
ete execute et peut etre relance sans effet de bord.

Des comptes de demonstration existent aussi dans la base locale :

```text
viewer@chronolens.local
analyst@chronolens.local
rotation@chronolens.local
screenrotation@chronolens.local
```

Ne pas utiliser ces comptes comme secrets de production.

## Fichiers importants

```text
README.md
docker-compose.yml
apps/api/prisma/schema.prisma
apps/api/src/auth/
apps/api/src/evidence/
apps/web/app/workspace.tsx
apps/web/app/styles.css
docs/adr/
docs/DATA_GOVERNANCE.md
docs/POSTGRES_OPERATIONS.md
apps/api/prisma/migrations/
docs/POSTGRES_BENCHMARK.md
docs/PRODUCTION_READINESS.md
docs/SECURITY_NOTES.md
scripts/
```

## Limites connues

- Le statut `UNHASHED` reste supporte pour toute preuve historique importee sans
  empreinte dans un autre environnement.
- `npm audit --audit-level=high` retourne un code de succes mais signale deux
  vulnerabilites transitives moderees `postcss`. Le correctif automatique propose
  un downgrade Next majeur et ne doit pas etre applique sans analyse.
- Le depot Git local est initialise mais aucun commit n'a encore ete cree.
- Les identifiants locaux sont adaptes a une demonstration, pas a la production.
- La suppression automatique reste volontairement desactivee. Toute future purge
  devra demander une validation operateur et produire une trace d'audit.
- Une sauvegarde locale de controle `backups/chronolens-smoke.dump` a ete creee.
  Le dossier `backups/` est ignore par Git.
- `npm audit --audit-level=high` signale encore deux vulnerabilites moderees
  transitives `postcss`. Voir `docs/SECURITY_NOTES.md`.

## Prochaine tranche recommandee

Preparer le deploiement partage :

1. choisir la plateforme cible et son gestionnaire de secrets ;
2. remplacer les comptes de demonstration par un fournisseur d'identite adapte ;
3. configurer les regles de protection de la branche `main` selon le workflow de
   l'equipe ;
4. lancer un benchmark sur un graphe representatif de production.

## Backlog restant

1. Benchmarker PostgreSQL sur des graphes representatifs avant toute decision
   Neo4j.
2. Configurer la plateforme de production : secrets geres, TLS, sauvegardes
   planifiees et supervision.
3. Remplacer l'authentification locale de demonstration par le fournisseur
   d'identite choisi.
