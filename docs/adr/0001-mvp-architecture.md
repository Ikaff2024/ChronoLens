# ADR 0001: architecture du MVP

## Statut

Accepté pour le pilote privé.

## Décision

Le MVP utilise une application web Next.js, une API NestJS modulaire et PostgreSQL.
Les entités, relations datées et preuves sont persistées dans PostgreSQL. La timeline
est construite par l'API à partir de ces événements métier.

## Pourquoi

Cette architecture permet de tester le parcours principal avec une équipe réduite,
des coûts prévisibles et une exploitation simple. Elle conserve des frontières de
domaine explicites afin d'extraire plus tard un service spécialisé si les mesures de
charge ou les expérimentations ML le justifient.

## Hors périmètre initial

- Neo4j jusqu'à la réalisation de benchmarks sur des graphes représentatifs.
- Kafka jusqu'à l'apparition de besoins de replay ou de découplage mesurés.
- Kubernetes, Istio, Ray et MLflow avant validation du pilote.
- Prédictions ML présentées aux utilisateurs avant constitution d'un dataset annoté.
