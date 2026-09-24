# Déploiement de test — Vercel

Sur Vercel, **seul le build du client est déployé**. Le serveur Express ne
tourne pas : Vercel n'exécute pas de serveur long, il sert des fichiers
statiques et des fonctions.

Conséquence structurelle : **le proxy Express n'existe pas en test.** Le
navigateur appelle l'API Render en direct. C'est la principale différence
entre l'environnement de test et la production, et la première hypothèse à
examiner quand un comportement diffère entre les deux.

## Variables à définir dans Vercel

Dans *Settings → Environment Variables*, avant le premier déploiement. Ces
valeurs sont figées dans le JavaScript livré au navigateur : ce sont des
constantes publiques, jamais des secrets.

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | `https://<service>.onrender.com` |
| `VITE_DJANGO_API_URL` | `https://<service>.onrender.com` |

`VITE_API_URL` n'est vide qu'en production, où le proxy Express prend le
relais. En test, elle doit être renseignée, sinon les appels partent vers le
domaine Vercel et échouent en 404.

## À faire côté Django avant que ça marche

Le navigateur appelant Render depuis un autre domaine, les deux variables
suivantes doivent contenir le domaine Vercel, **sans barre oblique finale** :

```
CORS_ALLOWED_ORIGINS=https://villago.vercel.app
CSRF_TRUSTED_ORIGINS=https://villago.vercel.app,https://<service>.onrender.com
```

Sans la première, toutes les requêtes sont bloquées par le navigateur.
Sans la seconde, l'administration Django refuse les formulaires.

## Limites connues de Render

- **Le disque est éphémère.** Les photos de biens téléversées en test
  disparaissent à chaque déploiement. Ce n'est pas un bug. Pour les conserver,
  il faut brancher un stockage objet compatible S3 (Cloudflare R2, Backblaze B2)
  via `django-storages`.
- **L'offre gratuite met le service en veille** après 15 minutes d'inactivité.
  Les WebSockets tombent et la première requête prend une dizaine de secondes.
  Tester la messagerie temps réel demande une offre payante.
