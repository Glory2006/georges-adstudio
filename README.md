# Georges Studio Admin

Interface d’administration de Georges Studio, destinée à gérer les réservations et l’activité d’un studio photo. L’application est construite avec React, TypeScript et Vite. Elle communique avec une API backend et nécessite un compte administrateur pour accéder aux écrans de gestion.

## Fonctionnalités

- Tableau de bord avec indicateurs, demandes récentes et catégories de séances.
- Gestion des réservations : filtres par statut, acceptation ou rejet, modification des horaires et confirmation via WhatsApp.
- Gestion des disponibilités et création d’un créneau directement pour un client.
- Gestion des types de séances : description, prix indicatif et publication sur le site.
- Galerie photo : ajout depuis un fichier ou une URL, gestion des légendes, de l’ordre et de la visibilité.
- Historique des actions réalisées par les clients et les administrateurs.
- Paramètres du compte, changement du mot de passe et configuration des horaires du studio selon le rôle.

Les données de réservation, de disponibilité et de catégorie sont actualisées automatiquement toutes les 30 secondes lorsque l’administrateur est connecté.

## Prérequis

- Node.js 20.19+ ou 22.12+.
- npm.
- Le backend de l’application, démarré et accessible. En développement, le proxy Vite transmet `/api` à `http://localhost:3000` par défaut.
- Un compte administrateur créé et géré côté backend.

## Installation et démarrage

```bash
npm install
npm run dev
```

Ouvrez ensuite l’adresse affichée par Vite, généralement [http://localhost:5173](http://localhost:5173). Pour utiliser l’interface, connectez-vous avec les identifiants d’un compte administrateur du backend.

### Configuration de l’API

Par défaut, l’application utilise `/api` comme URL de base. Le serveur de développement Vite redirige ce chemin vers `http://localhost:3000`.

Pour pointer vers une autre API, créez un fichier `.env.local` à la racine du projet :

```env
VITE_API_URL=https://votre-api.example.com
```

La valeur de `VITE_API_URL` est intégrée au code client : n’y placez aucun secret ni identifiant privé. Les accès administrateur doivent rester gérés par le backend.

## Scripts disponibles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur de développement Vite. |
| `npm run build` | Vérifie les types TypeScript et génère la version de production dans `dist/`. |
| `npm run preview` | Sert localement la version de production générée. |
| `npm run lint` | Exécute ESLint sur le projet. |

## Structure du projet

```text
src/
  components/  Éléments partagés : connexion, navigation, interface et horaires
  lib/api.ts   Appels API, URL de base et normalisation des données
  pages/       Tableau de bord et écrans de gestion
  types.ts     Types TypeScript partagés
```

## Backend

Ce dépôt contient uniquement l’interface frontend. Les données, l’authentification, les rôles et les opérations de gestion sont fournis par une API externe. Les routes utilisées par l’interface sont préfixées par `/admin` (profil, réservations, photos, types de séances, disponibilités, historique et configuration du studio). Le backend doit exposer les routes correspondantes et accepter les jetons d’accès Bearer.
