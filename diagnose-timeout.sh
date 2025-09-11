#!/bin/bash

echo "🔍 Diagnostic du problème de timeout"
echo "===================================="

# Vérifier l'état général du système
echo "💻 État du système:"
echo "- Uptime: $(uptime)"
echo "- Charge système: $(cat /proc/loadavg)"
echo "- Mémoire libre: $(free -h | grep Mem)"

echo ""
echo "🐳 État des conteneurs Docker:"
docker ps -a | grep myjourney || echo "❌ Aucun conteneur MyJourney trouvé"

echo ""
echo "📊 Logs du conteneur (dernières 20 lignes):"
docker logs myjourney-staging --tail 20 2>/dev/null || echo "❌ Impossible de lire les logs du conteneur"

echo ""
echo "🔌 Ports en écoute détaillés:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' || echo "❌ Aucun port 80/443/8080 en écoute"

echo ""
echo "⚙️ État de Nginx:"
sudo systemctl status nginx --no-pager -l | head -10

echo ""
echo "🔍 Test de connectivité interne:"
echo "Test localhost:80:"
timeout 5 curl -I http://localhost:80 2>&1 | head -3 || echo "❌ Timeout ou erreur sur localhost:80"

echo ""
echo "Test localhost:443:"
timeout 5 curl -I -k https://localhost:443 2>&1 | head -3 || echo "❌ Timeout ou erreur sur localhost:443"

echo ""
echo "Test localhost:8080 (Docker direct):"
timeout 5 curl -I http://localhost:8080 2>&1 | head -3 || echo "❌ Timeout ou erreur sur localhost:8080"

echo ""
echo "🌐 Test de connectivité externe:"
echo "Test 10.100.9.40:80:"
timeout 5 curl -I http://10.100.9.40:80 2>&1 | head -3 || echo "❌ Timeout ou erreur sur 10.100.9.40:80"

echo ""
echo "Test 10.100.9.40:443:"
timeout 5 curl -I -k https://10.100.9.40:443 2>&1 | head -3 || echo "❌ Timeout ou erreur sur 10.100.9.40:443"

echo ""
echo "🔥 Processus utilisant les ports:"
echo "Port 80:"
sudo lsof -i :80 2>/dev/null | head -5 || echo "Rien sur le port 80"

echo ""
echo "Port 443:"
sudo lsof -i :443 2>/dev/null | head -5 || echo "Rien sur le port 443"

echo ""
echo "Port 8080:"
sudo lsof -i :8080 2>/dev/null | head -5 || echo "Rien sur le port 8080"

echo ""
echo "🚨 Logs d'erreur Nginx récents:"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "❌ Pas de logs d'erreur ou fichier inaccessible"

echo ""
echo "📋 Logs d'accès Nginx récents:"
sudo tail -5 /var/log/nginx/access.log 2>/dev/null || echo "❌ Pas de logs d'accès ou fichier inaccessible"

echo ""
echo "🔧 Configuration Nginx active:"
echo "Sites activés:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "❌ Répertoire sites-enabled inaccessible"

echo ""
echo "Configuration du site MyJourney:"
cat /etc/nginx/sites-available/myjourney 2>/dev/null | head -20 || echo "❌ Configuration MyJourney non trouvée"

echo ""
echo "🧪 Test de configuration Nginx:"
sudo nginx -t 2>&1 || echo "❌ Configuration Nginx invalide"

echo ""
echo "🔄 Tentative de redémarrage des services:"
echo "Redémarrage de Nginx..."
sudo systemctl restart nginx && echo "✅ Nginx redémarré" || echo "❌ Échec redémarrage Nginx"

echo ""
echo "Redémarrage du conteneur Docker..."
docker restart myjourney-staging 2>/dev/null && echo "✅ Conteneur redémarré" || echo "❌ Échec redémarrage conteneur"

echo ""
echo "⏳ Attente de 10 secondes pour stabilisation..."
sleep 10

echo ""
echo "🔍 Test final après redémarrage:"
timeout 10 curl -I http://localhost:80 2>&1 | head -3 || echo "❌ Toujours en échec"

echo ""
echo "✅ Diagnostic terminé"
echo ""
echo "💡 Si tous les tests localhost fonctionnent mais pas 10.100.9.40,"
echo "   le problème peut être:"
echo "   - Firewall bloquant les connexions externes"
echo "   - Configuration réseau de la VM"
echo "   - Problème de routage réseau"