#!/bin/bash

echo "🔧 Mise à jour de la configuration Nginx pour MSAL"
echo "================================================="

# Créer une configuration Nginx optimisée pour MSAL
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS (obligatoire pour MSAL)
server {
    listen 80;
    server_name 10.100.9.40;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS optimisée pour MSAL
server {
    listen 443 ssl http2;
    server_name 10.100.9.40;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL moderne pour MSAL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité requis pour MSAL
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    
    # Configuration pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        # Cache pour les assets
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Configuration principale
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        # Headers pour MSAL
        proxy_set_header X-Forwarded-Ssl on;
        proxy_set_header X-Url-Scheme https;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffers
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
EOF

echo "✅ Configuration Nginx mise à jour"

# Tester et redémarrer Nginx
echo "🧪 Test de la configuration..."
if sudo nginx -t; then
    echo "🔄 Redémarrage de Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx redémarré avec succès"
else
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi

echo ""
echo "🌐 Configuration terminée !"
echo "   - HTTP redirige automatiquement vers HTTPS"
echo "   - Headers de sécurité optimisés pour MSAL"
echo "   - Cache configuré pour les assets"