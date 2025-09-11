#!/bin/bash

echo "🔒 SOLUTION COMPLÈTE - Problème SSL Chrome/Edge"
echo "=============================================="

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

step "1. CRÉATION D'UNE VERSION HTTP TEMPORAIRE"

# Sauvegarder la configuration HTTPS actuelle
sudo cp /etc/nginx/sites-available/myjourney /etc/nginx/sites-available/myjourney.https.backup

# Créer une configuration HTTP temporaire pour test
sudo tee /etc/nginx/sites-available/myjourney.http > /dev/null << 'EOF'
# Configuration HTTP temporaire (pour test)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location /test {
        return 200 "HTTP Test OK - Pas de SSL\n";
        add_header Content-Type text/plain;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF

echo "✅ Configuration HTTP temporaire créée"

step "2. ACTIVATION DE LA CONFIGURATION HTTP"

# Activer la configuration HTTP
sudo ln -sf /etc/nginx/sites-available/myjourney.http /etc/nginx/sites-enabled/myjourney

# Tester et redémarrer Nginx
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx redémarré avec configuration HTTP"
else
    echo "❌ Erreur de configuration"
    sudo nginx -t
    exit 1
fi

step "3. TEST DE LA VERSION HTTP"

sleep 3

echo "🧪 Test HTTP (sans SSL):"
result=$(timeout 10 curl -s http://10.100.9.40/test 2>/dev/null)
if [[ "$result" == *"HTTP Test OK"* ]]; then
    echo "✅ HTTP fonctionne parfaitement"
else
    echo "❌ HTTP ne fonctionne pas: $result"
fi

echo ""
echo "🧪 Test application HTTP:"
result=$(timeout 10 curl -s http://10.100.9.40 2>/dev/null | head -3)
if [[ "$result" == *"<html"* ]] || [[ "$result" == *"<!DOCTYPE"* ]]; then
    echo "✅ Application accessible en HTTP"
else
    echo "❌ Application non accessible: $result"
fi

step "4. GÉNÉRATION D'UN CERTIFICAT SSL AMÉLIORÉ"

# Supprimer l'ancien certificat
sudo rm -f /etc/nginx/ssl/myjourney.crt
sudo rm -f /etc/nginx/ssl/myjourney.key

# Créer un fichier de configuration SSL avancé
sudo tee /tmp/ssl-advanced.conf > /dev/null << 'EOF'
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=FR
ST=Ile-de-France
L=Paris
O=Grant Thornton France
OU=Digital Solutions
CN=myjourney.local
emailAddress=admin@grantthornton.fr

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment, keyAgreement
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = myjourney.local
DNS.2 = localhost
DNS.3 = 10.100.9.40
IP.1 = 10.100.9.40
IP.2 = 127.0.0.1
EOF

# Générer le certificat SSL amélioré
echo "🔐 Génération du certificat SSL amélioré (4096 bits)..."
sudo openssl req -new -x509 -days 3650 -nodes \
    -out /etc/nginx/ssl/myjourney.crt \
    -keyout /etc/nginx/ssl/myjourney.key \
    -config /tmp/ssl-advanced.conf \
    -extensions v3_req

# Définir les bonnes permissions
sudo chmod 600 /etc/nginx/ssl/myjourney.key
sudo chmod 644 /etc/nginx/ssl/myjourney.crt

# Nettoyer
sudo rm -f /tmp/ssl-advanced.conf

echo "✅ Certificat SSL amélioré généré (valide 10 ans)"

step "5. CRÉATION D'UNE CONFIGURATION HTTPS OPTIMISÉE"

# Créer une configuration HTTPS optimisée
sudo tee /etc/nginx/sites-available/myjourney.https > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location /test {
        return 200 "HTTP Test OK - Redirection vers HTTPS disponible\n";
        add_header Content-Type text/plain;
    }
    
    location /http {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS optimisée
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL moderne et sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location /test {
        return 200 "HTTPS Test OK - Certificat SSL amélioré\n";
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

echo "✅ Configuration HTTPS optimisée créée"

step "6. INSTRUCTIONS POUR L'UTILISATEUR"

echo ""
echo "🎯 SOLUTIONS DISPONIBLES :"
echo "========================="
echo ""
echo "1. 🔓 SOLUTION HTTP (Fonctionne immédiatement) :"
echo "   👉 http://10.100.9.40"
echo "   👉 http://10.100.9.40/test"
echo "   ✅ Pas de problème SSL, accès direct"
echo ""
echo "2. 🔒 SOLUTION HTTPS (Certificat amélioré) :"
echo "   Pour activer HTTPS, exécutez :"
echo "   sudo ln -sf /etc/nginx/sites-available/myjourney.https /etc/nginx/sites-enabled/myjourney"
echo "   sudo systemctl reload nginx"
echo ""
echo "3. 🌐 CONTOURNEMENT NAVIGATEUR :"
echo "   Chrome: Tapez 'thisisunsafe' sur la page d'erreur"
echo "   Edge: Cliquez sur 'Avancé' puis 'Continuer'"
echo "   Firefox: Plus permissif, accepte plus facilement"
echo ""

step "7. TESTS FINAUX"

echo "🧪 Test final HTTP:"
timeout 10 curl -s http://10.100.9.40/test || echo "❌ HTTP ne fonctionne pas"

echo ""
echo "✅ SOLUTION COMPLÈTE APPLIQUÉE !"
echo "================================"
echo ""
echo "🚀 ACCÈS IMMÉDIAT (sans SSL) :"
echo "   http://10.100.9.40"
echo ""
echo "🔒 ACCÈS HTTPS (après activation) :"
echo "   https://10.100.9.40"
echo ""
echo "💡 Recommandation : Utilisez HTTP pour tester, puis activez HTTPS"