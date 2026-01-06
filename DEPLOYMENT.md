# VillaGo - Guide de Déploiement

## Présentation du Projet

VillaGo est une plateforme de location immobilière connectant propriétaires, clients, agents et commissionnaires. L'application offre :

- Gestion des annonces immobilières
- Système de recherche avancée avec filtres
- Messagerie en temps réel
- Gestion des visites
- Système d'avis et notations
- Notifications push

## Architecture Technique

### Stack Technologique

**Frontend :**
- React 18 avec TypeScript
- Vite (bundler et serveur de développement)
- Tailwind CSS + Shadcn/ui (composants)
- TanStack Query (gestion du state serveur)
- Wouter (routage)

**Backend :**
- Express.js (serveur Node.js)
- Intégration API Django REST (backend principal)
- PostgreSQL (base de données)

### Structure des Dossiers

```
villago/
├── client/                 # Application React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── contexts/       # Contextes React (Auth, Theme)
│   │   ├── hooks/          # Hooks personnalisés
│   │   ├── lib/            # Utilitaires (API, helpers)
│   │   └── pages/          # Pages de l'application
│   └── index.html
├── server/                 # Serveur Express
│   ├── index.ts            # Point d'entrée
│   ├── routes.ts           # Routes API
│   └── mock-data.ts        # Données de test
├── shared/                 # Code partagé
│   └── schema.ts           # Schémas Zod et types
├── Dockerfile              # Image Docker
├── docker-compose.yml      # Orchestration Docker
└── package.json
```

## Prérequis

- Node.js 20+
- npm ou yarn
- Accès à l'API Django (backend principal qui gère la base de données)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Serveur        │────▶│   API Django    │
│   React         │     │  Express        │     │   (Backend)     │
│                 │     │  (Proxy)        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   PostgreSQL    │
                                                │   (Base de      │
                                                │   données)      │
                                                └─────────────────┘
```

Le frontend ne gère pas de base de données directement. Toutes les données passent par l'API Django.

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
# Construire et démarrer le conteneur
docker-compose up -d --build

# Voir les logs
docker-compose logs -f app

# Arrêter le service
docker-compose down
```

### 3. Accès

L'application est accessible sur : `http://localhost:5000`

## Déploiement Manuel (Sans Docker)

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration

Créez un fichier `.env` :

```env
DJANGO_API_URL=https://votre-api-django.com
NODE_ENV=production
```

### 3. Build de production

```bash
npm run build
```

### 4. Lancement

```bash
npm start
```

## Déploiement sur un VPS (DigitalOcean, AWS, etc.)

### 1. Préparer le serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo apt install docker-compose -y
```

### 2. Cloner le projet

```bash
git clone https://votre-repo.git villago
cd villago
```

### 3. Configurer et lancer

```bash
# Créer le fichier .env
nano .env

# Lancer l'application
docker-compose up -d --build
```

### 4. Configurer un reverse proxy (Nginx)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL avec Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d votre-domaine.com
```

## Rôles Utilisateurs

| Rôle | Description |
|------|-------------|
| **Client** | Recherche des biens, demande des visites, laisse des avis |
| **Propriétaire** | Ajoute et gère ses biens immobiliers |
| **Commissionnaire** | Valide les biens, assigne les agents aux visites |
| **Agent** | Effectue les visites et rédige les rapports |

## API Endpoints Principaux

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/biens/` | Liste des biens |
| `GET /api/v1/biens/villes/` | Liste des villes |
| `GET /api/v1/messaging/chatrooms/` | Conversations |
| `GET /api/v1/notifications/` | Notifications |
| `GET /api/v1/pages/{type}/` | Pages légales (terms, privacy, cookies, legal) |

## Variables d'Environnement

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `DATABASE_URL` | URL de connexion PostgreSQL | Oui |
| `DJANGO_API_URL` | URL de l'API Django backend | Oui |
| `SESSION_SECRET` | Clé secrète pour les sessions | Oui |
| `NODE_ENV` | Environnement (development/production) | Non |
| `PORT` | Port du serveur (défaut: 5000) | Non |

## Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker-compose logs app

# Vérifier que la base de données est accessible
docker-compose exec db psql -U villago -c "SELECT 1"
```

### Erreur de connexion à l'API Django

Vérifiez que `DJANGO_API_URL` est correctement configuré et accessible depuis le conteneur.

### Problèmes de cache

En développement, désactivez le cache du navigateur ou utilisez la navigation privée.

## Support

Pour toute question technique, consultez les logs de l'application ou contactez l'équipe de développement.
