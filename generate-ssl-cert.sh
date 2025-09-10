#!/bin/bash

echo "🔒 Génération d'un certificat SSL auto-signé"
echo "==========================================="

# Créer le répertoire pour les certificats
sudo mkdir -p /etc/nginx/ssl

# Générer le certificat auto-signé
echo "🔑 Génération du certificat SSL..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/myjourney.key \
    -out /etc/nginx/ssl/myjourney.crt \
    -subj "/C=FR/ST=France/L=Paris/O=GrantThornton/CN=10.100.9.40"

# Mettre à jour la configuration Nginx pour HTTPS
echo "⚙️ Configuration Nginx pour HTTPS..."
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name 10.100.9.40;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
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
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
    }
}
EOF

# Tester et redémarrer Nginx
echo "🧪 Test de la configuration Nginx..."
if sudo nginx -t; then
    echo "🔄 Redémarrage de Nginx..."
    sudo systemctl restart nginx
    echo "✅ HTTPS configuré avec succès!"
    echo ""
    echo "🌐 Votre application est maintenant accessible via:"
    echo "   https://10.100.9.40"
    echo ""
    echo "⚠️  Note: Le navigateur affichera un avertissement de sécurité"
    echo "   car le certificat est auto-signé. Cliquez sur 'Avancé' puis"
    echo "   'Continuer vers 10.100.9.40' pour accéder à l'application."
else
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi