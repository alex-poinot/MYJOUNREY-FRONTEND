#!/bin/bash

# Script de build et déploiement pour l'environnement production
set -e

echo "🚀 Démarrage du build et déploiement MyJourney - Production"

# Vérifier les permissions Docker
echo "🔐 Vérification des permissions Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Erreur: Permissions Docker insuffisantes"
    echo "💡 Solutions possibles:"
    echo "   1. Ajouter votre utilisateur au groupe docker:"
    echo "      sudo usermod -aG docker $USER"
    echo "      newgrp docker"
    echo "   2. Ou exécuter avec sudo:"
    echo "      sudo ./build-and-deploy-prod.sh"
    exit 1
fi

# Arrêter les conteneurs existants
echo "📦 Arrêt des conteneurs existants..."
docker compose -f docker-compose.prod.yml down --remove-orphans

# Nettoyer les images non utilisées
echo "🧹 Nettoyage des images Docker..."
docker system prune -f

# Build de la nouvelle image
echo "🔨 Build de l'image Docker..."
docker compose -f docker-compose.prod.yml build --no-cache

# Démarrer les services
echo "🚀 Démarrage des services..."
docker compose -f docker-compose.prod.yml up -d

# Attendre que l'application soit prête
echo "⏳ Attente du démarrage de l'application..."
sleep 10

# Vérifier que l'application répond
echo "🔍 Vérification de l'état de l'application..."
if curl -f http://localhost:8081 > /dev/null 2>&1; then
    echo "✅ Application déployée avec succès!"
    echo "🌐 Accessible sur: https://myjourney.grant-thronton.fr"
else
    echo "❌ Erreur: L'application ne répond pas"
    echo "📋 Logs du conteneur:"
    docker compose -f docker-compose.prod.yml logs myjourney-app
    exit 1
fi

# Recharger Nginx pour appliquer la configuration
echo "🔄 Rechargement de Nginx..."
if command -v nginx &> /dev/null; then
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx rechargé avec succès"
fi

# Afficher les informations de déploiement
echo ""
echo "📊 Informations de déploiement:"
echo "- URL HTTPS: https://myjourney.grant-thronton.fr"
echo "- URL HTTP: http://myjourney.grant-thronton.fr (redirige vers HTTPS)"
echo "- IP: 10.100.6.40"
echo "- Environnement: production"
echo "- Conteneur: myjourney-production"
echo "- Port Docker: 8081"
echo ""
echo "📋 Commandes utiles:"
echo "- Voir les logs: docker compose -f docker-compose.prod.yml logs -f myjourney-app"
echo "- Redémarrer: docker compose -f docker-compose.prod.yml restart"
echo "- Arrêter: docker compose -f docker-compose.prod.yml down"
echo "- Logs Nginx: sudo tail -f /var/log/nginx/myjourney-prod-access.log"
echo ""
echo "🔒 Vérification SSL:"
echo "- Certificat: /etc/ssl/certs/myjourney.crt"
echo "- Clé privée: /etc/ssl/private/myjourney.key"
echo ""
