# ChronoLens OSINT - Politique initiale de gouvernance des donnees

Version : 2026-06-02

## Perimetre

ChronoLens collecte uniquement des informations utiles a une investigation OSINT :

- dossiers et contexte analyste ;
- entites, alias et relations temporelles ;
- URL publiques, dates de capture et notes de preuve ;
- empreintes SHA-256 de preuve ;
- comptes membres, sessions et journal d'audit.

## Finalites

Les donnees servent a reconstituer une chronologie, documenter les sources publiques,
expliquer les alertes et attribuer les actions realisees dans l'espace de travail.

## Retention initiale

- Un dossier `ACTIVE` ou `DRAFT` doit etre revu au moins une fois par an.
- Un dossier `ARCHIVED` est conserve pendant deux ans a compter de sa derniere
  mise a jour.
- Les preuves et journaux d'audit suivent la retention du dossier auquel ils sont
  rattaches.
- Les sessions expirees peuvent etre purgees sans attendre la suppression d'un
  dossier.

## Suppression

Cette version ne supprime aucune donnee automatiquement. L'API expose les echeances
de revue et de retention afin qu'une politique de suppression explicite puisse etre
ajoutee avec validation operateur, audit et sauvegarde adaptee.

## Principes operatoires

- Archiver un dossier est une action explicite et auditee.
- Exporter un dossier avant suppression future doit rester possible.
- Toute purge future doit etre idempotente, auditee et limitee a une organisation.
- Les secrets de demonstration ne doivent pas etre reutilises en production.
