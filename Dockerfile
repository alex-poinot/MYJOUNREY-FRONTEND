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

# Build de l'application pour l\'environnement staging
RUN npm run build:staging

# Étape 2: Serveur de production avec Nginx
FROM nginx:alpine

# Supprimer complètement la configuration et les fichiers par défaut de Nginx
RUN rm -rf /etc/nginx/conf.d/*
RUN rm -rf /usr/share/nginx/html/*

# Copier les fichiers buildés vers Nginx
COPY --from=build /app/dist/demo /usr/share/nginx/html

# Créer une configuration Nginx simple et fonctionnelle
RUN echo 'server { \
    listen 80 default_server; \
    listen [::]:80 default_server; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
RUN echo "=== Test de la configuration Nginx ===" && nginx -T
}' > /etc/nginx/conf.d/default.conf
# Vérifier que nginx peut démarrer en mode test
RUN nginx -t && echo "Configuration Nginx OK" && \
    echo "=== Configuration finale ===" && \
    cat /etc/nginx/conf.d/default.conf

# Exposer le port 80
