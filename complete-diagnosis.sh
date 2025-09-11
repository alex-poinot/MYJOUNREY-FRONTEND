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

section "10. Certificat SSL"
echo "Fichiers SSL:"
ls -la /etc/nginx/ssl/ 2>/dev/null || echo "❌ Répertoire SSL non trouvé"

echo ""
echo "Vérification du certificat:"
if [ -f /etc/nginx/ssl/myjourney.crt ]; then
    sudo openssl x509 -in /etc/nginx/ssl/myjourney.crt -text -noout | grep -E "(Subject|Not After|DNS)" | head -5
else
    echo "❌ Certificat SSL non trouvé"
fi

section "11. Tests de connectivité TCP"
echo "Test connexion TCP port 80:"
timeout 5 bash -c "</dev/tcp/10.100.9.40/80" && echo "✅ Port 80 accessible" || echo "❌ Port 80 inaccessible"

echo ""
echo "Test connexion TCP port 443:"
timeout 5 bash -c "</dev/tcp/10.100.9.40/443" && echo "✅ Port 443 accessible" || echo "❌ Port 443 inaccessible"

echo ""
echo "Test connexion TCP port 8080:"
timeout 5 bash -c "</dev/tcp/10.100.9.40/8080" && echo "✅ Port 8080 accessible" || echo "❌ Port 8080 inaccessible"

section "12. Configuration Docker Compose"
echo "Fichier docker-compose.yml:"
if [ -f docker-compose.yml ]; then
    cat docker-compose.yml
else
    echo "❌ docker-compose.yml non trouvé"
fi

section "13. Tests avec différents User-Agents"
echo "Test avec curl standard:"
timeout 10 curl -s http://10.100.9.40 2>&1 | head -3 || echo "❌ Échec"

echo ""
echo "Test avec User-Agent navigateur:"
timeout 10 curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" http://10.100.9.40 2>&1 | head -3 || echo "❌ Échec"

section "14. Vérification des processus"
echo "Processus Nginx:"
ps aux | grep nginx | grep -v grep || echo "❌ Aucun processus Nginx"

echo ""
echo "Processus Docker:"
ps aux | grep docker | grep -v grep | head -3 || echo "❌ Aucun processus Docker"

echo ""
echo "✅ DIAGNOSTIC TERMINÉ"
echo "===================="