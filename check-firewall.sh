#!/bin/bash

echo "🔥 Vérification du firewall et connectivité réseau"
echo "================================================="

# Vérifier l'état du firewall
echo "🛡️ État du firewall:"
if command -v ufw >/dev/null 2>&1; then
    echo "UFW Status:"
    sudo ufw status verbose
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "Firewalld Status:"
    sudo firewall-cmd --state
    sudo firewall-cmd --list-all
else
    echo "Aucun firewall détecté (ufw/firewalld)"
fi

echo ""
echo "📡 Configuration réseau:"
echo "Interfaces réseau:"
ip addr show | grep -E "(inet |UP|DOWN)" | head -10

echo ""
echo "🌐 Routes réseau:"
ip route | head -5

echo ""
echo "🔍 Test de connectivité réseau:"
echo "Ping localhost:"
ping -c 2 127.0.0.1 || echo "❌ Ping localhost échoué"

echo ""
echo "Ping IP locale:"
ping -c 2 10.100.9.40 || echo "❌ Ping IP locale échoué"

echo ""
echo "🔌 Ports en écoute sur toutes les interfaces:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' | grep -v '127.0.0.1'

echo ""
echo "📋 Processus écoutant sur 0.0.0.0:"
sudo lsof -i :80 | grep '0.0.0.0' || echo "Aucun processus sur 0.0.0.0:80"
sudo lsof -i :443 | grep '0.0.0.0' || echo "Aucun processus sur 0.0.0.0:443"

echo ""
echo "🧪 Test de connectivité depuis l'extérieur:"
echo "Tentative de connexion TCP sur port 80:"
timeout 5 bash -c "</dev/tcp/10.100.9.40/80" && echo "✅ Port 80 accessible" || echo "❌ Port 80 inaccessible"

echo ""
echo "Tentative de connexion TCP sur port 443:"
timeout 5 bash -c "</dev/tcp/10.100.9.40/443" && echo "✅ Port 443 accessible" || echo "❌ Port 443 inaccessible"

echo ""
echo "✅ Vérification terminée"