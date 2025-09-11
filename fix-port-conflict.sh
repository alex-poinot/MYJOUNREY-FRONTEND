#!/bin/bash

echo "🔧 Correction du conflit de port Docker"
echo "======================================"

# Arrêter les conteneurs existants
echo "⏹️ Arrêt des conteneurs existants..."
docker compose down 2>/dev/null || true

# Vérifier les processus utilisant le port 80
echo "🔍 Vérification des processus sur le port 80..."
sudo lsof -i :80 | grep -v nginx || echo "Aucun autre processus sur le port 80"

# Nettoyer les conteneurs et réseaux orphelins
echo "🧹 Nettoyage des conteneurs orphelins..."
docker system prune -f

# Vérifier la configuration Docker
echo "📋 Vérification de docker-compose.yml..."
if grep -q "80:80" docker-compose.yml; then
    echo "❌ Configuration incorrecte détectée dans docker-compose.yml"
    echo "🔧 Correction automatique..."
    
    # Sauvegarder l'ancien fichier
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    
    # Corriger la configuration
    sed -i 's/- "80:80"/- "8080:80"/' docker-compose.yml
    echo "✅ Configuration corrigée"
else
    echo "✅ Configuration Docker correcte"
fi

# Afficher la configuration finale
echo ""
echo "📊 Configuration finale:"
echo "- Nginx système: ports 80 et 443"
echo "- Docker: port 8080"
echo "- Proxy: 80/443 → 8080"

# Redémarrer les services
echo ""
echo "🚀 Redémarrage des services..."
docker compose up -d

# Attendre le démarrage
echo "⏳ Attente du démarrage..."
sleep 10

# Vérifier l'état final
echo ""
echo "🔍 Vérification finale:"
echo "Docker:"
docker ps | grep myjourney || echo "❌ Conteneur Docker non démarré"

echo ""
echo "Nginx:"
sudo systemctl status nginx --no-pager -l | head -5

echo ""
echo "Tests de connectivité:"
echo "HTTP (port 80):"
curl -I http://localhost:80 2>/dev/null | head -3 || echo "❌ HTTP ne fonctionne pas"

echo ""
echo "HTTPS (port 443):"
curl -I -k https://localhost:443 2>/dev/null | head -3 || echo "❌ HTTPS ne fonctionne pas"

echo ""
echo "Docker direct (port 8080):"
curl -I http://localhost:8080 2>/dev/null | head -3 || echo "❌ Docker ne fonctionne pas"

echo ""
echo "✅ Correction terminée!"
echo "🌐 Testez maintenant: https://10.100.9.40"