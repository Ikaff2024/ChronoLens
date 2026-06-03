# ChronoLens OSINT - Benchmark PostgreSQL

Version : 2026-06-03

## Objectif

Mesurer le chemin de lecture du MVP avant toute decision d'ajouter Neo4j. Le script
execute les listes paginees et la timeline sur un dossier cible.

## Execution

```powershell
npm run benchmark:postgres
```

Pour generer un graphe synthetique representatif et isole :

```powershell
npm run benchmark:seed
$env:BENCHMARK_INVESTIGATION_TITLE="Benchmark - Representative graph"
$env:BENCHMARK_ITERATIONS=20
npm run benchmark:postgres
```

Pour augmenter la charge de lecture :

```powershell
$env:BENCHMARK_ITERATIONS=500
npm run benchmark:postgres
```

## Decision

Conserver PostgreSQL tant que les mesures restent compatibles avec l'usage pilote.
Reconsiderer un moteur graphe seulement avec un jeu de donnees representatif, des
requetes de parcours identifiees et un gain mesure.

## Mesure pilote

Execute le 2026-06-02 avec 50 iterations et 250 requetes :

```text
p50    14.36 ms
p95    30.80 ms
max   164.53 ms
```

Conclusion provisoire : PostgreSQL reste adapte au MVP. Cette mesure ne remplace
pas un benchmark sur un graphe representatif de production.

## Mesure representative locale

Execute le 2026-06-03 sur un graphe synthetique idempotent :

```text
entites      1 000
relations    5 000
preuves        500
timeline     6 500 evenements
iterations      20
requetes       100
```

Avant optimisation serveur, la timeline paginee limitait la reponse a environ
5 Ko mais chargeait encore l'ensemble des 6 500 evenements avant decoupage :

```text
timeline page 1 p50   655.12 ms
timeline page 1 p95   896.21 ms
```

Apres optimisation, la timeline paginee borne les lectures Prisma aux candidats
necessaires et conserve le total via des comptages separes :

```text
overall p50            15.28 ms
overall p95            22.65 ms
overall max            25.10 ms
timeline page 1 p50    19.71 ms
timeline page 1 p95    25.10 ms
timeline page 1 bytes   5 284
```

Le mode historique sans `page` reste disponible pour les exports et les alertes,
mais l'interface utilise la pagination pour eviter les chargements massifs.
