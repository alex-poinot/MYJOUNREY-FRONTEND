# Étape 1 : Construction de l'application Angular
FROM node:22-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Vérifier le contenu du répertoire (facultatif, pour le débogage)
RUN ls -la /app

# Construire l'application en mode staging
RUN npm run build --staging

# Vérifier le contenu du répertoire dist après la construction (facultatif, pour le débogage)
RUN ls -la /app/dist/MYJOURNEY-FRONTEND

# Étape 2 : Configuration du conteneur Nginx pour servir l'application
FROM nginx:alpine

# Copier les artefacts construits depuis le premier conteneur (stade de build)
COPY --from=build /app/dist/MYJOURNEY-FRONTEND /usr/share/nginx/html

# Exposer le port sur lequel Nginx servira l'application
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
