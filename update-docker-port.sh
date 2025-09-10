#!/bin/bash

echo "🔧 Mise à jour de la configuration Docker pour Nginx"
echo "=================================================="

# Sauvegarder l'ancien docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Créer la nouvelle configuration Docker
cat > docker-compose.yml << 'EOF'
services:
  myjourney-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: myjourney-staging
    ports:
      - "8080:80"  # Changement du port pour éviter le conflit avec Nginx
    restart: unless-stopped
    environment:
      - NODE_ENV=staging
      - API_URL=http://10.100.9.40:3000
    volumes:
      # Optionnel: pour persister les logs
      - ./logs:/var/log/nginx
    networks:
      - myjourney-network

networks:
  myjourney-network:
    driver: bridge
EOF

echo "✅ Configuration Docker mise à jour"
echo "📋 Changements:"
echo "   - Port 80:80 → 8080:80"
echo "   - L'application Docker écoute maintenant sur le port 8080"
echo "   - Nginx (système) fait le proxy vers le port 8080"
echo ""
echo "🚀 Vous pouvez maintenant exécuter:"
echo "   ./build-and-deploy.sh"