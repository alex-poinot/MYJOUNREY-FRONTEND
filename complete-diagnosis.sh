#!/bin/bash

echo "🔍 DIAGNOSTIC COMPLET - MyJourney"
echo "================================="

# Fonction pour afficher les sections
section() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

section "1. État général du système"
echo "Uptime: $(uptime)"
echo "Charge: $(cat /proc/loadavg)"
echo "Mémoire: $(free -h | grep Mem)"

section "2. État des services"
echo "Docker:"
docker ps -a | grep myjourney || echo "❌ Aucun conteneur MyJourney"

echo ""
echo "Nginx:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx actif"
    systemctl status nginx --no-pager -l | head -5
else
    echo "❌ Nginx inactif"
    systemctl status nginx --no-pager -l | head -10
fi

section "3. Ports en écoute"
echo "Tous les ports 80, 443, 8080:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' || echo "❌ Aucun port en écoute"

echo ""
echo "Processus détaillés:"
for port in 80 443 8080; do
    echo "Port $port:"
    sudo lsof -i :$port 2>/dev/null | head -3 || echo "  Aucun processus"
done

section "4. Configuration Nginx"
echo "Sites activés:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "❌ Répertoire inaccessible"

echo ""
echo "Test de configuration:"
sudo nginx -t 2>&1

echo ""
echo "Configuration active (premières lignes):"
if [ -f /etc/nginx/sites-available/myjourney ]; then
    head -20 /etc/nginx/sites-available/myjourney
else
    echo "❌ Fichier de configuration non trouvé"
fi

section "5. Docker détaillé"
echo "Conteneurs:"
docker ps -a

echo ""
echo "Logs du conteneur (dernières 10 lignes):"
docker logs myjourney-staging --tail 10 2>/dev/null || echo "❌ Impossible de lire les logs"

echo ""
echo "Inspection du conteneur:"
docker inspect myjourney-staging --format='{{.NetworkSettings.Ports}}' 2>/dev/null || echo "❌ Conteneur non trouvé"

section "6. Tests de connectivité locaux"
echo "Test Docker direct (127.0.0.1:8080):"
timeout 10 curl -I http://127.0.0.1:8080 2>&1 | head -3 || echo "❌ Échec"

echo ""
echo "Test Nginx local HTTP (127.0.0.1:80):"
timeout 10 curl -I http://127.0.0.1:80 2>&1 | head -3 || echo "❌ Échec"

echo ""
echo "Test Nginx local HTTPS (127.0.0.1:443):"
timeout 10 curl -I -k https://127.0.0.1:443 2>&1 | head -3 || echo "❌ Échec"

section "7. Tests de connectivité externes"
echo "Test HTTP externe (10.100.9.40:80):"
timeout 10 curl -I http://10.100.9.40:80 2>&1 | head -3 || echo "❌ Échec"

echo ""
echo "Test HTTPS externe (10.100.9.40:443):"
timeout 10 curl -I -k https://10.100.9.40:443 2>&1 | head -3 || echo "❌ Échec"

section "8. Logs d'erreur"
echo "Logs d'erreur Nginx (dernières 5 lignes):"
sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "❌ Pas de logs d'erreur"

echo ""
echo "Logs système Nginx:"
sudo journalctl -u nginx.service --no-pager -l | tail -5

section "9. Réseau et firewall"
echo "Interfaces réseau:"
ip addr show | grep -E "(inet |UP|DOWN)" | head -5

echo ""
echo "Firewall (UFW):"
if command -v ufw >/dev/null 2>&1; then
    sudo ufw status
else
    echo "UFW non installé"
fi

echo ""
echo "✅ DIAGNOSTIC TERMINÉ"
echo "===================="