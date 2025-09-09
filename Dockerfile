# Utiliser une image de base officielle de Node.js
FROM node:22-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json dans le répertoire de travail
COPY package.json package-lock.json ./

# Installer les dépendances du projet
RUN npm install

# Copier le reste de l'application dans le répertoire de travail
COPY . .

# Exposer le port que votre application Angular utilise
EXPOSE 4200

# Commande à exécuter lors du démarrage du conteneur
CMD ["npm", "run", "serve:staging"]