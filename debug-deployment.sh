#!/bin/bash

echo "🔍 Diagnostic du déploiement MyJourney"
echo "======================================"

# Vérifier si le conteneur existe et fonctionne
echo "📦 État du conteneur:"
docker ps | grep myjourney || echo "❌ Conteneur non trouvé"

# Vérifier les fichiers dans le conteneur
echo ""
echo "📁 Fichiers dans /usr/share/nginx/html:"
docker exec myjourney-staging ls -la /usr/share/nginx/html/ 2>/dev/null || echo "❌ Impossible d'accéder au conteneur"

# Vérifier si index.html existe
echo ""
echo "🔍 Recherche d'index.html:"
docker exec myjourney-staging find /usr/share/nginx/html -name "index.html" 2>/dev/null || echo "❌ index.html non trouvé"

# Vérifier le contenu d'index.html
echo ""
echo "📄 Contenu d'index.html (premières lignes):"
docker exec myjourney-staging head -10 /usr/share/nginx/html/index.html 2>/dev/null || echo "❌ Impossible de lire index.html"

# Vérifier la configuration Nginx
echo ""
echo "⚙️ Configuration Nginx active:"
docker exec myjourney-staging nginx -t 2>/dev/null && echo "✅ Configuration Nginx valide" || echo "❌ Configuration Nginx invalide"

# Vérifier les logs Nginx
echo ""
echo "📋 Logs Nginx (dernières lignes):"
docker logs myjourney-staging --tail 10 2>/dev/null || echo "❌ Impossible de lire les logs"

# Test de connectivité
echo ""
echo "🌐 Test de connectivité:"
curl -I http://localhost:80 2>/dev/null | head -5 || echo "❌ Impossible de se connecter à l'application"

echo ""
echo "✅ Diagnostic terminé"