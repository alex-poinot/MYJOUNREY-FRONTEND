#!/bin/bash

# Script de build et déploiement pour l'environnement staging
set -e

echo "🚀 Démarrage du build et déploiement MyJourney - Staging"

# Arrêter les conteneurs existants
echo "📦 Arrêt des conteneurs existants..."
docker compose down --remove-orphans

# Nettoyer les images non utilisées
echo "🧹 Nettoyage des images Docker..."
docker system prune -f

# Build de la nouvelle image
echo "🔨 Build de l'image Docker..."
docker compose build --no-cache

# Démarrer les services
echo "🚀 Démarrage des services..."
docker compose up -d

# Attendre que l'application soit prête
echo "⏳ Attente du démarrage de l'application..."
sleep 10

# Vérifier que l'application répond
echo "🔍 Vérification de l'état de l'application..."
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Application déployée avec succès!"
    echo "🌐 Accessible sur: http://10.100.9.40"
else
    echo "❌ Erreur: L'application ne répond pas"
    echo "📋 Logs du conteneur:"
    docker compose logs myjourney-app
    exit 1
fi

# Afficher les informations de déploiement
echo ""
echo "📊 Informations de déploiement:"
echo "- URL: http://10.100.9.40"
echo "- Environnement: staging"
echo "- Conteneur: myjourney-staging"
echo ""
echo "📋 Commandes utiles:"