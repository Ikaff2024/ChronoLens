# ChronoLens OSINT - Exploitation PostgreSQL locale

Version : 2026-06-02

## Migrations

Le conteneur API applique les migrations versionnees au demarrage avec :

```powershell
npm run db:migrate:deploy
```

`db:push` reste utile pendant une exploration locale, mais ne doit plus etre
utilise pour demarrer un environnement partage ou de production.

## Sauvegarde

Creer le dossier local de sauvegarde si necessaire puis lancer :

```powershell
New-Item -ItemType Directory -Force -Path backups
docker compose exec -T postgres pg_dump -U chronolens -d chronolens -Fc > backups/chronolens.dump
```

Le fichier `backups/` doit rester hors Git. En production, stocker les sauvegardes
dans un espace chiffre avec rotation et controle d'acces.

## Restauration locale

Arreter l'API pendant la restauration :

```powershell
docker compose stop api
docker compose exec -T postgres dropdb -U chronolens --if-exists chronolens
docker compose exec -T postgres createdb -U chronolens chronolens
Get-Content -AsByteStream backups/chronolens.dump | docker compose exec -T postgres pg_restore -U chronolens -d chronolens --clean --if-exists
docker compose start api
```

## Verification post-restauration

```powershell
docker compose ps
Invoke-RestMethod http://localhost:3021/health
```

Verifier ensuite une connexion pilote et l'ouverture du dossier principal depuis
`http://localhost:3020`.

## Maintenance des sessions

Un owner peut purger les sessions expirees :

```text
POST /auth/sessions/purge-expired
Authorization: Bearer <token owner>
x-organization-id: pilot-org
```

L'operation est idempotente et auditee avec `SESSIONS_EXPIRED_PURGED`.
