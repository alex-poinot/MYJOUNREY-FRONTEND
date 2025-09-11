#!/bin/bash

echo "🔧 Correction de la configuration Nginx et proxy"
echo "==============================================="

# Arrêter temporairement les services
echo "⏹️ Arrêt temporaire des services..."
sudo systemctl stop nginx
docker compose down

# Attendre un peu
sleep 3

# Recréer une configuration Nginx complète et fonctionnelle
echo "⚙️ Création d'une configuration Nginx complète..."
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name 10.100.9.40;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS complète
server {
    listen 443 ssl http2;
    server_name 10.100.9.40;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité pour MSAL
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Page de test
    location /test {
        return 200 "MyJourney HTTPS Server OK\n";
        add_header Content-Type text/plain;
    }
    
    # Proxy vers l'application Docker
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        # Timeouts pour éviter les blocages
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffers
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        
        # Gestion des erreurs
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }
}
EOF

# Vérifier la configuration
echo "🧪 Test de la configuration Nginx..."
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

# Démarrer Docker d'abord
echo "🐳 Démarrage de Docker..."
docker compose up -d

# Attendre que Docker soit prêt
echo "⏳ Attente du démarrage Docker (20 secondes)..."
sleep 20

# Vérifier que Docker répond
echo "🔍 Vérification de Docker..."
if curl -f http://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ Docker répond sur le port 8080"
else
    echo "❌ Docker ne répond pas sur le port 8080"
    echo "📋 Logs Docker:"
    docker logs myjourney-staging --tail 10
fi

# Démarrer Nginx
echo "🚀 Démarrage de Nginx..."
sudo systemctl start nginx

# Attendre un peu
sleep 5

# Tests de connectivité
echo ""
echo "🔍 Tests de connectivité:"

echo "Test page de test HTTPS:"
curl -k -m 10 https://127.0.0.1/test 2>/dev/null || echo "❌ Échec test HTTPS local"

echo ""
echo "Test page de test HTTPS externe:"
curl -k -m 10 https://10.100.9.40/test 2>/dev/null || echo "❌ Échec test HTTPS externe"

echo ""
echo "Test application HTTPS locale:"
curl -k -m 10 https://127.0.0.1 2>/dev/null | head -3 || echo "❌ Échec application HTTPS locale"

echo ""
echo "Test application HTTPS externe:"
curl -k -m 10 https://10.100.9.40 2>/dev/null | head -3 || echo "❌ Échec application HTTPS externe"

echo ""
echo "📊 État final des services:"
echo "Nginx:"
sudo systemctl status nginx --no-pager -l | head -3

echo ""
echo "Docker:"
docker ps | grep myjourney

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "🌐 Testez maintenant:"
echo "   - https://10.100.9.40/test (page de test)"
echo "   - https://10.100.9.40 (application)"