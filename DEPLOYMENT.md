# MonComissionaire - Guide de Déploiement

## Présentation du Projet

MonComissionaire est une plateforme de location immobilière connectant propriétaires, clients, agents et commissionnaires.

## Architecture Technique

### Stack Technologique

**Frontend :**
- React 18 avec TypeScript
- Vite (bundler et serveur de développement)
- Tailwind CSS + Shadcn/ui (composants)

**Backend :**
- Express.js (serveur Node.js)
- Intégration API Django REST (backend principal)

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Serveur        │────▶│   API Django    │
│   React         │     │  Express        │     │   (Backend)     │
│                 │     │  (Proxy)        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Le serveur Express sert les fichiers statiques du frontend et redirige les appels API vers le backend Django.

## Déploiement avec Docker (Recommandé)

### 1. Configuration

Créez un fichier `.env` à la racine :

```env
# API Django (backend principal)
DJANGO_API_URL=https://votre-api-django.com

# Environnement
NODE_ENV=production
```

### 2. Lancement

```bash
# Construire et démarrer le conteneur (Production)
docker-compose -f docker-compose.prod.yml up -d --build

# Développement
docker-compose up --build
```

### 3. Accès

L'application est accessible sur : `http://localhost:5000`

## Déploiement Manuel (Sans Docker)

```bash
npm install
npm run build
npm start
```

## Variables d'Environnement

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `DJANGO_API_URL` | URL de l'API Django backend | Oui |
| `NODE_ENV` | Environnement (development/production) | Non |
| `PORT` | Port du serveur (défaut: 5000) | Non |

## Support

Pour toute question technique, contactez l'équipe de développement.
