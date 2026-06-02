# ChronoLens OSINT - Benchmark PostgreSQL

Version : 2026-06-02

## Objectif

Mesurer le chemin de lecture du MVP avant toute decision d'ajouter Neo4j. Le script
execute les listes paginees et la timeline sur le dossier de demonstration.

## Execution

```powershell
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
