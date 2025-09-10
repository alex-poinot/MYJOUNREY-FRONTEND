#!/bin/bash

echo "🔍 Diagnostic du problème HTTPS"
echo "==============================="

# Vérifier si Nginx système est installé et fonctionne
echo "📦 État de Nginx système:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx système est actif"
    systemctl status nginx --no-pager -l
else
    echo "❌ Nginx système n'est pas actif"
    echo "Status:"
    systemctl status nginx --no-pager -l || true
fi

echo ""
echo "🔌 Ports en écoute sur le système:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' || echo "Aucun port 80/443/8080 en écoute"

echo ""
echo "🐳 État des conteneurs Docker:"
docker ps | grep myjourney || echo "❌ Conteneur MyJourney non trouvé"

echo ""
echo "⚙️ Configuration Nginx:"
if [ -f /etc/nginx/sites-available/myjourney ]; then
    echo "✅ Configuration MyJourney trouvée:"
    cat /etc/nginx/sites-available/myjourney
else
    echo "❌ Configuration MyJourney non trouvée"
fi

echo ""
echo "🔗 Sites Nginx activés:"
ls -la /etc/nginx/sites-enabled/ || echo "❌ Répertoire sites-enabled non trouvé"

echo ""
echo "🔒 Certificats SSL:"
if [ -f /etc/nginx/ssl/myjourney.crt ]; then
    echo "✅ Certificat SSL trouvé"
    openssl x509 -in /etc/nginx/ssl/myjourney.crt -text -noout | grep -E "(Subject|Not After)"
else
    echo "❌ Certificat SSL non trouvé"
fi

echo ""
echo "🧪 Test de configuration Nginx:"
sudo nginx -t 2>&1 || echo "❌ Configuration Nginx invalide"

echo ""
echo "📋 Logs d'erreur Nginx récents:"
sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "❌ Pas de logs d'erreur"

echo ""
echo "🌐 Test de connectivité locale:"
echo "Test HTTP (port 80):"
curl -I http://localhost:80 2>&1 | head -5 || echo "❌ Échec HTTP"

echo ""
echo "Test HTTPS (port 443):"
curl -I -k https://localhost:443 2>&1 | head -5 || echo "❌ Échec HTTPS"

echo ""
echo "Test Docker (port 8080):"
curl -I http://localhost:8080 2>&1 | head -5 || echo "❌ Échec Docker"

echo ""
echo "🔥 Processus utilisant les ports:"
sudo lsof -i :80 2>/dev/null || echo "Rien sur le port 80"
sudo lsof -i :443 2>/dev/null || echo "Rien sur le port 443"
sudo lsof -i :8080 2>/dev/null || echo "Rien sur le port 8080"

echo ""
echo "✅ Diagnostic terminé"