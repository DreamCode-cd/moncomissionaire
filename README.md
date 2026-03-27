# MonComissionaire (VillaGo)

MonComissionaire est une plateforme moderne de location immobilière qui connecte propriétaires, clients, agents et commissionnaires.

## 🚀 Fonctionnalités

- **Recherche avancée** : Filtres par ville, prix, type de bien, équipements (eau, électricité, parking, etc.).
- **Gestion des biens** : Ajout de biens par les propriétaires et validation par les commissionnaires.
- **Système de visites** : Demandes de visites par les clients, planification par les commissionnaires et rapports par les agents.
- **Messagerie en temps réel** : Chat intégré entre clients et commissionnaires/agents.
- **Tableau de bord** : Suivi des statistiques et des notifications.

## 🛠️ Architecture Technique

L'application utilise une architecture moderne :
- **Frontend** : React 18, Vite, Tailwind CSS, Shadcn/ui.
- **Backend** : Express.js (Node.js) faisant office de serveur et de proxy vers une API Django.
- **Base de données** : Gérée par le backend Django principal.

---

## 💻 Installation Classique (Sans Docker)

### Prérequis
- [Node.js](https://nodejs.org/) v20 ou supérieur.

### Étapes
1. **Cloner le projet** :
   ```bash
   git clone <url-du-repo>
   cd moncomissionaire
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Configurer l'environnement** :
   Copiez le fichier `.env.example` vers `.env` et remplissez les variables.
   ```bash
   cp .env.example .env
   ```

4. **Lancer l'application en mode développement** :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:5000`.

---

## 🐳 Installation avec Docker

### 🛠️ Mode Développement (Recommandé pour les dev)
Ce mode inclut le rechargement à chaud (hot-reloading).

```bash
# Lancer l'environnement de dev
docker-compose up --build
```
- **App** : `http://localhost:5000`

### 🏗️ Mode Production
Optimisé pour la performance et la sécurité.

```bash
# Lancer l'environnement de production
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## ⚙️ Variables d'Environnement

| Variable | Description |
|----------|-------------|
| `DJANGO_API_URL` | URL du backend Django principal (laisse vide pour utiliser les mocks) |
| `PORT` | Port du serveur (défaut: 5000) |
| `NODE_ENV` | Environnement (`development` ou `production`) |

---

## 📂 Structure du Projet

- `client/` : Code source de l'application React (Frontend).
- `server/` : Code source du serveur Express (Backend/Proxy).
- `shared/` : Schémas et types partagés entre le frontend et le backend.
- `script/` : Scripts de build et utilitaires.
- `dist/` : Fichiers compilés (générés après le build).

---

## 📜 Licence
MIT
