
# VillaGo - Plateforme de Location Immobilière de Luxe

## 📋 Vue d'ensemble

VillaGo est une plateforme complète de location immobilière conçue pour connecter les propriétaires avec des locataires potentiels. L'application facilite les annonces de propriétés, la planification de visites, les réservations et les avis.

## 🚀 Fonctionnalités

### Pour les Clients
- 🔍 Recherche avancée de propriétés avec filtres
- 📅 Réservation de visites en ligne
- 🏠 Demandes de location
- ⭐ Système d'avis et d'évaluations
- 👤 Tableau de bord personnel

### Pour les Propriétaires
- ➕ Ajout et gestion de propriétés
- 📊 Tableau de bord avec statistiques
- ✅ Validation des demandes de visite et de location
- 💰 Suivi des revenus
- 📈 Statistiques de vues

### Pour les Administrateurs
- 👥 Gestion complète des utilisateurs
- 🏘️ Modération des propriétés
- 📝 Gestion des réservations
- 🔧 Outils d'administration

## 🛠️ Technologies Utilisées

### Frontend
- **React 18** avec TypeScript
- **Vite** - Build tool et serveur de développement
- **Wouter** - Routing client-side
- **TanStack Query** - Gestion de l'état serveur
- **shadcn/ui** - Composants UI basés sur Radix UI
- **Tailwind CSS** - Framework CSS utility-first
- **React Hook Form** + **Zod** - Validation de formulaires

### Backend
- **Express.js** - Framework serveur
- **PostgreSQL** (Neon) - Base de données
- **Drizzle ORM** - ORM TypeScript
- **JWT** - Authentification
- **TypeScript** - Type safety

### Outils de développement
- **ESLint** - Linting
- **PostCSS** - Traitement CSS
- **date-fns** - Manipulation de dates

## 📦 Installation

1. **Cloner le projet** (si applicable)
```bash
git clone <url-du-repo>
cd villago
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer la base de données**

Créez un fichier `.env` à la racine avec :
```env
DATABASE_URL=votre_url_postgresql
```

4. **Pousser le schéma vers la base de données**
```bash
npm run db:push
```

5. **Lancer l'application en développement**
```bash
npm run dev
```

L'application sera accessible sur `http://0.0.0.0:5000`

## 🏗️ Architecture

```
villago/
├── client/              # Application React frontend
│   ├── src/
│   │   ├── components/  # Composants UI réutilisables
│   │   ├── pages/       # Pages de l'application
│   │   ├── hooks/       # Hooks React personnalisés
│   │   └── lib/         # Utilitaires et configuration
│   └── public/          # Assets statiques
├── server/              # Serveur Express backend
│   ├── index.ts         # Point d'entrée du serveur
│   ├── routes.ts        # Définition des routes API
│   └── storage.ts       # Couche d'abstraction données
├── shared/              # Types partagés client/serveur
│   └── schema.ts        # Schémas Drizzle et types
└── migrations/          # Migrations de base de données
```

## 🎨 Scripts Disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm start` - Lance l'application en production
- `npm run check` - Vérification TypeScript
- `npm run db:push` - Synchronise le schéma avec la base de données

## 🔐 Authentification

L'application utilise JWT pour l'authentification avec :
- Access tokens pour les requêtes API
- Refresh tokens pour le renouvellement automatique
- Storage local pour la persistance de session

## 👥 Rôles Utilisateurs

1. **Client** - Peut rechercher et louer des propriétés
2. **Propriétaire** - Peut publier et gérer des propriétés
3. **Admin** - Accès complet à toutes les fonctionnalités

## 🌐 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token

### Propriétés
- `GET /api/properties` - Liste des propriétés
- `GET /api/properties/:id` - Détails d'une propriété
- `POST /api/properties` - Créer une propriété (propriétaire)
- `PATCH /api/properties/:id` - Modifier une propriété

### Réservations
- `POST /api/bookings/visits` - Demander une visite
- `POST /api/bookings/rentals` - Demander une location
- `PATCH /api/bookings/visits/:id` - Gérer une demande de visite
- `PATCH /api/bookings/rentals/:id` - Gérer une demande de location

## 🎯 Déploiement sur Replit

L'application est optimisée pour Replit :

1. Le serveur écoute sur `0.0.0.0:5000`
2. Le port 80 est automatiquement mappé vers le port 5000
3. Les variables d'environnement sont configurées via Replit Secrets
4. Build automatique et déploiement via Replit

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📝 License

MIT

## 📧 Contact

Pour toute question ou suggestion :
- Email: contact@villago.com
- Téléphone: +33 1 23 45 67 89
- Adresse: 123 Avenue des Champs-Élysées, Paris

## 🙏 Remerciements

- [shadcn/ui](https://ui.shadcn.com/) pour les composants UI
- [Radix UI](https://www.radix-ui.com/) pour les primitives accessibles
- [Tailwind CSS](https://tailwindcss.com/) pour le framework CSS
- [Drizzle ORM](https://orm.drizzle.team/) pour l'ORM TypeScript

---

Fait avec ❤️ par l'équipe VillaGo
