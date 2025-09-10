# Étape 1: Build de l'application Angular
FROM node:22-alpine AS build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances (incluant les devDependencies pour le build)
RUN npm ci

# Installer Angular CLI globalement
RUN npm install -g @angular/cli@20

# Copier le code source
COPY . .

# Build de l'application pour l'environnement staging
RUN npm run build:staging

# Étape 2: Serveur de production avec Nginx
FROM nginx:alpine

# Copier les fichiers buildés vers Nginx
COPY --from=build /app/dist/demo /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]