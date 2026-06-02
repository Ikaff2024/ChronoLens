# ChronoLens OSINT

Fondation MVP pour une plateforme d'investigation OSINT temporelle. Cette première
tranche permet de créer des dossiers, d'enregistrer des entités, des relations datées
et des preuves, puis de consulter une timeline agrégée.

## Architecture

- `apps/web`: interface Next.js.
- `apps/api`: API NestJS et schéma Prisma.
- `docker-compose.yml`: PostgreSQL, API et interface web.
- `docs/SESSION_HANDOFF.md`: journal de reprise a mettre a jour apres chaque tranche.
- `docs/DATA_GOVERNANCE.md`: politique initiale de collecte, retention et suppression.
- `docs/POSTGRES_OPERATIONS.md`: migrations, sauvegarde, restauration et maintenance.
- `docs/PRODUCTION_READINESS.md`: secrets, reseau et observabilite de production.
- `docs/POSTGRES_BENCHMARK.md`: protocole de mesure avant toute decision Neo4j.
- `docs/SECURITY_NOTES.md`: dette de dependances et controles de securite.
- `docs/adr`: décisions d'architecture.

## Démarrage local

Prérequis : Node.js 22+, npm et Docker.

```bash
npm install
docker compose up -d postgres
copy .env.example .env
copy .env.example apps\api\.env
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

Ouvrir `http://localhost:3020`. L'API écoute sur `http://localhost:3021` et son
healthcheck est disponible sur `GET /health`.

Compte local pilote :

```text
pilot@chronolens.local
chronolens-pilot
```

L'API crée ce compte de démonstration au premier login. Les routes métier exigent
ensuite un jeton `Authorization: Bearer <token>`.

## API MVP

| Méthode | Route | Usage |
| --- | --- | --- |
| `POST` | `/auth/login` | Connexion locale et création de session |
| `GET` | `/auth/me` | Profil et rôle de la session |
| `POST` | `/auth/logout` | Révocation de la session courante |
| `POST` | `/auth/change-password` | Rotation du mot de passe courant |
| `POST` | `/auth/sessions/purge-expired` | Purge owner des sessions expirees |
| `GET` | `/members` | Liste des membres, réservé aux owners |
| `POST` | `/members` | Création d'un membre, réservé aux owners |
| `PATCH` | `/members/:id/role` | Modification de rôle, réservé aux owners |
| `GET` | `/investigations` | Liste des dossiers |
| `POST` | `/investigations` | Création d'un dossier |
| `GET` | `/investigations/:id` | Dossier complet |
| `POST` | `/investigations/:id/archive` | Archivage explicite et audite d'un dossier |
| `GET` | `/investigations/:id/governance` | Synthese de revue et retention du dossier |
| `GET` | `/investigations/retention/due` | Dossiers archives arrives a echeance |
| `DELETE` | `/investigations/:id` | Purge owner confirmee apres export et retention |
| `PATCH` | `/investigations/:id` | Mise à jour d'un dossier |
| `POST` | `/entities` | Ajout d'une entité |
| `GET` | `/entities?investigationId=:id&q=:texte` | Liste et recherche d'entités |
| `POST` | `/entities/import-csv` | Import CSV d'entités |
| `POST` | `/relationships` | Ajout d'une relation temporelle |
| `GET` | `/relationships?investigationId=:id` | Liste des relations temporelles |
| `POST` | `/evidence` | Ajout d'une preuve |
| `POST` | `/evidence/backfill?investigationId=:id` | Calcul idempotent des empreintes historiques |
| `GET` | `/evidence?investigationId=:id` | Liste des preuves d'un dossier |
| `GET` | `/evidence/:id/verify` | Verification de l'integrite d'une preuve |
| `GET` | `/investigations/:id/timeline` | Timeline agrégée |
| `GET` | `/investigations/:id/audit` | Journal d'audit du dossier |
| `GET` | `/investigations/:id/export/json` | Export complet du dossier |
| `GET` | `/investigations/:id/export/timeline.csv` | Export CSV de la timeline |
| `GET` | `/investigations/:id/alerts` | Alertes explicables basées sur des règles |

Les routes métier acceptent `x-organization-id`. En l'absence de cet en-tête,
l'environnement local utilise `pilot-org`. L'acteur d'audit est dérivé de la session,
et ne peut plus être déclaré librement par le client.

L'import CSV accepte jusqu'à 500 entités avec les colonnes suivantes :

```csv
type,name,aliases,description,confidence,firstSeen,lastSeen
ORGANIZATION,Northstar Labs,Northstar|NS Labs,Partenaire observé,0.86,2026-05-10,
```

Les nouvelles entités sont dédupliquées par type et nom dans chaque investigation.
Un import répété retourne les compteurs `imported` et `skipped`. La capture guidée
refuse également une URL de preuve déjà enregistrée dans le même dossier.
Les nouveaux dossiers refusent aussi un titre déjà utilisé dans la même organisation.

Les membres créés par un owner disposent d'un mot de passe initial temporaire. Ils
doivent le remplacer avant d'accéder aux routes métier. Après cinq échecs de login,
le compte est verrouillé pendant quinze minutes.

## Vérification

```bash
npm run lint
npm test
npm run build
```

## Suite du backlog

1. Ajouter authentification, organisations et cloisonnement multi-tenant.
2. Ajouter audit logs, import CSV et saisie guidée des entités dans l'interface.
3. Benchmarker PostgreSQL sur des graphes représentatifs avant décision Neo4j.
4. Définir la politique de collecte, de rétention et de suppression des données.
