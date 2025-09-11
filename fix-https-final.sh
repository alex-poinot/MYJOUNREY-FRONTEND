#!/bin/bash

echo "🔒 CORRECTION FINALE HTTPS - MyJourney"
echo "====================================="

# Arrêter Nginx temporairement
echo "⏹️ Arrêt temporaire de Nginx..."
sudo systemctl stop nginx

# Supprimer et recréer le certificat SSL
echo "🔑 Régénération complète du certificat SSL..."
sudo rm -f /etc/nginx/ssl/myjourney.*
sudo mkdir -p /etc/nginx/ssl

# Générer un nouveau certificat avec tous les paramètres corrects
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/myjourney.key \
    -out /etc/nginx/ssl/myjourney.crt \
    -subj "/C=FR/ST=France/L=Paris/O=GrantThornton/CN=10.100.9.40" \
    -addext "subjectAltName=DNS:10.100.9.40,IP:10.100.9.40,DNS:localhost,IP:127.0.0.1" \
    2>/dev/null

# Vérifier les permissions
sudo chmod 600 /etc/nginx/ssl/myjourney.key
sudo chmod 644 /etc/nginx/ssl/myjourney.crt

echo "✅ Certificat SSL régénéré"

# Créer une configuration HTTPS ultra-simple
echo "⚙️ Création d'une configuration HTTPS ultra-simple..."
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
# Configuration HTTP avec redirection
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location /test {
        return 200 "HTTP Test OK - Redirection HTTPS disponible\n";
        add_header Content-Type text/plain;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS ultra-simple
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL minimale mais fonctionnelle
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location /test {
        return 200 "HTTPS Test OK - Certificat SSL fonctionnel\n";
        add_header Content-Type text/plain;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF

echo "✅ Configuration HTTPS ultra-simple créée"

# Tester la configuration
echo "🧪 Test de la configuration..."
if sudo nginx -t; then
    echo "✅ Configuration valide"
else
    echo "❌ Configuration invalide"
    sudo nginx -t
    exit 1
fi

# Démarrer Nginx
echo "🚀 Démarrage de Nginx..."
sudo systemctl start nginx

# Attendre un peu
sleep 3

# Tests détaillés
echo ""
echo "🔍 Tests détaillés:"

echo "Test 1 - HTTP local:"
curl -s http://127.0.0.1/test || echo "❌ Échec HTTP local"

echo ""
echo "Test 2 - HTTPS local (détaillé):"
curl -k -s https://127.0.0.1/test 2>/dev/null || echo "❌ Échec HTTPS local"

echo ""
echo "Test 3 - HTTPS externe:"
curl -k -s https://10.100.9.40/test 2>/dev/null || echo "❌ Échec HTTPS externe"

echo ""
echo "Test 4 - Vérification du certificat:"
echo | openssl s_client -connect 127.0.0.1:443 -servername 10.100.9.40 2>/dev/null | grep -E "(subject|issuer)" || echo "❌ Problème certificat"

echo ""
echo "✅ CORRECTION HTTPS TERMINÉE !"
echo "=============================="
echo ""
echo "🌐 Testez maintenant:"
echo "   - https://10.100.9.40/test"
echo "   - https://10.100.9.40"
echo ""
echo "🔓 Dans Chrome, tapez 'thisisunsafe' sur la page d'erreur SSL"