#!/bin/bash

echo "🔧 Restauration de la configuration HTTPS"
echo "========================================="

# Vérifier l'état actuel
echo "📊 État actuel de Nginx:"
sudo systemctl status nginx --no-pager -l | head -5

echo ""
echo "🔍 Test de la configuration actuelle:"
sudo nginx -t

echo ""
echo "📋 Configuration actuelle:"
sudo cat /etc/nginx/sites-available/myjourney | head -20

echo ""
echo "🔧 Création d'une configuration HTTPS complète et fonctionnelle..."

# Créer une configuration HTTPS complète
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

# Configuration HTTPS complète
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
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
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
EOF

echo "✅ Configuration HTTPS créée"

# Vérifier que le certificat SSL existe
if [ ! -f /etc/nginx/ssl/myjourney.crt ]; then
    echo "🔒 Génération du certificat SSL..."
    sudo mkdir -p /etc/nginx/ssl
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/myjourney.key \
        -out /etc/nginx/ssl/myjourney.crt \
        -subj "/C=FR/ST=France/L=Paris/O=GrantThornton/CN=10.100.9.40" \
        2>/dev/null
    echo "✅ Certificat SSL généré"
fi

# Tester la configuration
echo ""
echo "🧪 Test de la nouvelle configuration:"
if sudo nginx -t; then
    echo "✅ Configuration valide"
    
    # Redémarrer Nginx
    echo "🔄 Redémarrage de Nginx..."
    sudo systemctl reload nginx
    
    # Attendre un peu
    sleep 3
    
    # Tests
    echo ""
    echo "🔍 Tests de connectivité:"
    
    echo "Test HTTP:"
    curl -m 10 http://10.100.9.40/test 2>/dev/null || echo "❌ HTTP ne fonctionne pas"
    
    echo ""
    echo "Test HTTPS:"
    curl -k -m 10 https://10.100.9.40/test 2>/dev/null || echo "❌ HTTPS ne fonctionne pas"
    
    echo ""
    echo "✅ Configuration HTTPS restaurée !"
    echo ""
    echo "🌐 URLs à tester:"
    echo "   - http://10.100.9.40/test"
    echo "   - https://10.100.9.40/test"
    echo "   - https://10.100.9.40 (tapez 'thisisunsafe' dans Chrome)"
    
else
    echo "❌ Configuration invalide"
    sudo nginx -t
fi