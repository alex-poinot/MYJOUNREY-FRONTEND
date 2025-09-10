#!/bin/bash

echo "🔍 Diagnostic avancé MyJourney - Problème de chargement"
echo "====================================================="

# Vérifier le contenu exact d'index.html
echo "📄 Contenu complet d'index.html:"
echo "--------------------------------"
docker exec myjourney-staging cat /usr/share/nginx/html/index.html 2>/dev/null || echo "❌ Impossible de lire index.html"

echo ""
echo "📦 Fichiers JavaScript présents:"
echo "--------------------------------"
docker exec myjourney-staging find /usr/share/nginx/html -name "*.js" -type f | head -10

echo ""
echo "🎨 Fichiers CSS présents:"
echo "-------------------------"
docker exec myjourney-staging find /usr/share/nginx/html -name "*.css" -type f | head -5

echo ""
echo "📊 Taille des fichiers principaux:"
echo "----------------------------------"
docker exec myjourney-staging ls -lh /usr/share/nginx/html/*.js 2>/dev/null || echo "Aucun fichier JS à la racine"
docker exec myjourney-staging ls -lh /usr/share/nginx/html/*.css 2>/dev/null || echo "Aucun fichier CSS à la racine"

echo ""
echo "🔍 Test de chargement des assets:"
echo "--------------------------------"
# Tester si les fichiers JS sont accessibles
JS_FILES=$(docker exec myjourney-staging find /usr/share/nginx/html -name "*.js" -type f | head -3)
for js_file in $JS_FILES; do
    filename=$(basename "$js_file")
    echo "Test de $filename:"
    curl -s -o /dev/null -w "Status: %{http_code}, Taille: %{size_download} bytes\n" "http://localhost:80/$filename" || echo "❌ Erreur de chargement"
done

echo ""
echo "🌐 Test de chargement de la page principale:"
echo "-------------------------------------------"
curl -s "http://localhost:80/" | head -20

echo ""
echo "🚨 Logs d'accès Nginx (dernières requêtes):"
echo "-------------------------------------------"
docker exec myjourney-staging tail -10 /var/log/nginx/access.log 2>/dev/null || echo "Pas de logs d'accès"

echo ""
echo "❌ Logs d'erreur Nginx (dernières erreurs):"
echo "-------------------------------------------"
docker exec myjourney-staging tail -10 /var/log/nginx/error.log 2>/dev/null || echo "Pas de logs d'erreur récents"

echo ""
echo "🔧 Configuration Nginx active:"
echo "-----------------------------"
docker exec myjourney-staging cat /etc/nginx/conf.d/default.conf

echo ""
echo "📱 Test avec User-Agent navigateur:"
echo "----------------------------------"
curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "http://localhost:80/" | grep -E "(script|link|title)" | head -10

echo ""
echo "✅ Diagnostic avancé terminé"