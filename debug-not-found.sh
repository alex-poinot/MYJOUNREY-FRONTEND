#!/bin/bash

echo "🔧 DEBUG COMPLET - Problème Not Found"
echo "====================================="

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

step "1. VÉRIFICATION DE L'ÉTAT ACTUEL"

echo "📊 Conteneurs Docker:"
docker ps | grep myjourney || echo "❌ Aucun conteneur MyJourney"

echo ""
echo "📊 Services Nginx:"
sudo systemctl status nginx --no-pager -l | head -5

echo ""
echo "📊 Ports en écoute:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' | head -5

step "2. TESTS DE CONNECTIVITÉ DÉTAILLÉS"

echo "🧪 Test 1: Docker direct (127.0.0.1:8080)"
if curl -f -m 10 http://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ Docker répond"
    echo "Contenu de la page:"
    curl -s http://127.0.0.1:8080 | head -10
else
    echo "❌ Docker ne répond pas"
    echo "📋 Logs Docker:"
    docker logs myjourney-staging --tail 10 2>/dev/null || echo "Conteneur non trouvé"
fi

echo ""
echo "🧪 Test 2: Nginx HTTP (127.0.0.1:80)"
if curl -f -m 10 http://127.0.0.1:80 > /dev/null 2>&1; then
    echo "✅ Nginx HTTP répond"
else
    echo "❌ Nginx HTTP ne répond pas"
fi

echo ""
echo "🧪 Test 3: Nginx HTTPS (127.0.0.1:443)"
if curl -k -f -m 10 https://127.0.0.1:443 > /dev/null 2>&1; then
    echo "✅ Nginx HTTPS répond"
else
    echo "❌ Nginx HTTPS ne répond pas"
fi

echo ""
echo "🧪 Test 4: URL complète avec sous-chemin"
echo "Test: https://127.0.0.1/myjourney/"
curl -k -I https://127.0.0.1/myjourney/ 2>/dev/null | head -5 || echo "❌ Échec"

step "3. VÉRIFICATION DE LA CONFIGURATION NGINX"

echo "📋 Sites activés:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "❌ Répertoire inaccessible"

echo ""
echo "📋 Configuration active:"
if [ -f /etc/nginx/sites-enabled/myjourney ]; then
    echo "✅ Configuration trouvée"
    cat /etc/nginx/sites-enabled/myjourney | head -30
elif [ -f /etc/nginx/sites-enabled/ec-test-gt ]; then
    echo "✅ Configuration ec-test-gt trouvée"
    cat /etc/nginx/sites-enabled/ec-test-gt | head -30
else
    echo "❌ Aucune configuration active trouvée"
    ls -la /etc/nginx/sites-enabled/
fi

echo ""
echo "🧪 Test de configuration Nginx:"
sudo nginx -t 2>&1

step "4. VÉRIFICATION DES LOGS"

echo "📋 Logs d'erreur Nginx (dernières 10 lignes):"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "❌ Pas de logs d'erreur"

echo ""
echo "📋 Logs d'accès Nginx (dernières 5 lignes):"
sudo tail -5 /var/log/nginx/access.log 2>/dev/null || echo "❌ Pas de logs d'accès"

step "5. VÉRIFICATION DU CONTENU DOCKER"

echo "📁 Contenu du conteneur Docker:"
docker exec myjourney-staging ls -la /usr/share/nginx/html/ 2>/dev/null || echo "❌ Impossible d'accéder au conteneur"

echo ""
echo "📄 Index.html existe-t-il ?"
docker exec myjourney-staging cat /usr/share/nginx/html/index.html 2>/dev/null | head -10 || echo "❌ index.html non trouvé"

step "6. DIAGNOSTIC FINAL"

echo "🔍 Résumé du diagnostic:"
echo "1. Docker fonctionne: $(curl -f -m 5 http://127.0.0.1:8080 > /dev/null 2>&1 && echo "✅ OUI" || echo "❌ NON")"
echo "2. Nginx HTTP fonctionne: $(curl -f -m 5 http://127.0.0.1:80 > /dev/null 2>&1 && echo "✅ OUI" || echo "❌ NON")"
echo "3. Nginx HTTPS fonctionne: $(curl -k -f -m 5 https://127.0.0.1:443 > /dev/null 2>&1 && echo "✅ OUI" || echo "❌ NON")"
echo "4. Configuration Nginx valide: $(sudo nginx -t > /dev/null 2>&1 && echo "✅ OUI" || echo "❌ NON")"

echo ""
echo "✅ Diagnostic terminé"
echo ""
echo "💡 Prochaines étapes selon les résultats:"
echo "   - Si Docker ne fonctionne pas → Problème de conteneur"
echo "   - Si Nginx ne fonctionne pas → Problème de configuration"
echo "   - Si tout fonctionne localement → Problème de domaine/DNS"