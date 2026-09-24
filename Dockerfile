# Base commune
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
# npm ci et non npm install : le package-lock.json existe, il doit faire foi.
# Sans lui, deux constructions peuvent produire deux arbres de dépendances
# différents, et un correctif validé en test ne l'est plus en production.
RUN npm ci

# Développement
FROM base AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Construction
FROM base AS build

# Vite fige ces valeurs dans le JavaScript livré au navigateur : elles doivent
# être présentes ICI, pas au démarrage du conteneur. Elles sont publiques par
# construction — ne jamais y placer un secret.
ARG VITE_API_URL
ARG VITE_DJANGO_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DJANGO_API_URL=$VITE_DJANGO_API_URL

COPY . .
# Le typage est vérifié AVANT la construction : vite et esbuild transpilent
# sans contrôler les types, donc `npm run build` seul laisse passer des
# erreurs jusqu'en production.
RUN npm run check && npm run build

# Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
# Dépendances d'exécution seulement : les paquets de développement n'ont rien
# à faire dans l'image finale, ni en poids ni en surface d'attaque.
RUN npm ci --omit=dev && npm cache clean --force

# L'image node fournit déjà un compte non privilégié.
USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:5000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
