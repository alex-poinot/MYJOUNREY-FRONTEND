#!/bin/bash

echo "🌐 Configuration du domaine myjourney-test.grant-thornton.fr"
echo "=========================================================="

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

step "1. ARRÊT DES SERVICES"
sudo systemctl stop nginx 2>/dev/null || true
docker compose down 2>/dev/null || true

step "2. CONFIGURATION DU FICHIER HOSTS LOCAL"
echo "Configuration du fichier hosts pour le domaine local..."
if ! grep -q "myjourney-test.grant-thornton.fr" /etc/hosts; then
    echo "127.0.0.1 myjourney-test.grant-thornton.fr" | sudo tee -a /etc/hosts
    echo "10.100.9.40 myjourney-test.grant-thornton.fr" | sudo tee -a /etc/hosts
    echo "✅ Domaine ajouté au fichier hosts"
else
    echo "✅ Domaine déjà présent dans hosts"
fi

step "3. GÉNÉRATION DU CERTIFICAT SSL POUR LE NOUVEAU DOMAINE"
sudo mkdir -p /etc/nginx/ssl

# Créer un fichier de configuration SSL pour le nouveau domaine
sudo tee /tmp/ssl-myjourney-test.conf > /dev/null << 'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=FR
ST=France
L=Paris
O=Grant Thornton France
OU=Digital Solutions - MyJourney
CN=myjourney-test.grant-thornton.fr
emailAddress=admin@grant-thornton.fr

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = myjourney-test.grant-thornton.fr
DNS.2 = localhost
IP.1 = 127.0.0.1
IP.2 = 10.100.9.40
EOF

# Générer le certificat SSL pour le nouveau domaine
echo "🔐 Génération du certificat SSL pour myjourney-test.grant-thornton.fr..."
sudo openssl req -new -x509 -days 3650 -nodes \
    -out /etc/nginx/ssl/myjourney-test-gt.crt \
    -keyout /etc/nginx/ssl/myjourney-test-gt.key \
    -config /tmp/ssl-myjourney-test.conf \
    -extensions v3_req

sudo chmod 644 /etc/nginx/ssl/myjourney-test-gt.crt
sudo chmod 600 /etc/nginx/ssl/myjourney-test-gt.key
sudo rm -f /tmp/ssl-myjourney-test.conf

echo "✅ Certificat SSL généré pour myjourney-test.grant-thornton.fr (valide 10 ans)"

step "4. CONFIGURATION NGINX POUR LE NOUVEAU DOMAINE"
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/myjourney-test-gt

# Configuration Nginx avec les nouveaux chemins
sudo tee /etc/nginx/sites-available/myjourney-test-gt > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name myjourney-test.grant-thornton.fr;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS pour MyJourney Test
server {
    listen 443 ssl http2;
    server_name myjourney-test.grant-thornton.fr;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney-test-gt.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney-test-gt.key;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité pour MSAL
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Redirection racine vers /myjourney/
    location = / {
        return 301 https://$server_name/myjourney/;
    }
    
    # Page de test
    location /test {
        return 200 "MyJourney Test Server OK - Nginx fonctionne\n";
        add_header Content-Type text/plain;
    }
    
    # Configuration pour l'application MyJourney (/myjourney/)
    location /myjourney/ {
        # Proxy direct vers Docker sans rewrite
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        # Headers pour Angular
        proxy_set_header X-Forwarded-Prefix /myjourney;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Pas de cache pour l'application
        proxy_buffering off;
        proxy_cache off;
        
        # Gestion des erreurs
        proxy_intercept_errors off;
    }
    
    # Configuration pour l'API MyJourney (/api/myjourney/)
    location /api/myjourney/ {
        # Proxy vers l'API Docker sur port 3000
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        # Headers pour l'API
        proxy_set_header X-Forwarded-Prefix /api/myjourney;
        
        # Timeouts pour l'API
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # CORS headers pour l'API
        add_header Access-Control-Allow-Origin "https://myjourney-test.grant-thornton.fr" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Gestion des requêtes OPTIONS (preflight CORS)
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://myjourney-test.grant-thornton.fr";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Gestion des assets Angular
    location /myjourney/assets/ {
        proxy_pass http://127.0.0.1:8080/assets/;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gestion des fichiers JS/CSS avec hash
    location ~* /myjourney/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        rewrite ^/myjourney/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/myjourney-test-gt /etc/nginx/sites-enabled/

echo "✅ Configuration Nginx créée pour myjourney-test.grant-thornton.fr"

step "5. TEST DE LA CONFIGURATION NGINX"
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

step "6. DÉMARRAGE DES SERVICES"
# Démarrer Nginx
if sudo systemctl start nginx; then
    echo "✅ Nginx démarré"
    sudo systemctl enable nginx
else
    echo "❌ Échec du démarrage de Nginx"
    exit 1
fi

# Rebuild et démarrer Docker avec la nouvelle configuration
echo "🐳 Rebuild de l'application avec la nouvelle configuration..."
docker compose up -d --build

echo "⏳ Attente du démarrage (30 secondes)..."
sleep 30

step "7. TESTS DE CONNECTIVITÉ"

echo "🧪 Test 1: Page de test HTTPS"
if curl -k -s https://myjourney-test.grant-thornton.fr/test | grep -q "MyJourney Test"; then
    echo "✅ HTTPS fonctionne"
else
    echo "❌ HTTPS ne fonctionne pas"
fi

echo ""
echo "🧪 Test 2: Application MyJourney"
if curl -k -s https://myjourney-test.grant-thornton.fr/myjourney/ | grep -q -E "(html|DOCTYPE)"; then
    echo "✅ Application MyJourney accessible"
else
    echo "❌ Application MyJourney non accessible"
fi

echo ""
echo "🧪 Test 3: API MyJourney (si disponible)"
if curl -k -s https://myjourney-test.grant-thornton.fr/api/myjourney/ | head -3; then
    echo "✅ API accessible"
else
    echo "❌ API non accessible (normal si pas encore déployée)"
fi

step "8. INFORMATIONS FINALES"

echo ""
echo "🎉 CONFIGURATION TERMINÉE !"
echo "=========================="
echo ""
echo "🌐 Nouvelles URLs de votre application :"
echo "   👉 https://myjourney-test.grant-thornton.fr/myjourney/"
echo "   👉 https://myjourney-test.grant-thornton.fr/api/myjourney/"
echo ""
echo "🔧 URLs de test :"
echo "   - https://myjourney-test.grant-thornton.fr/test"
echo "   - https://myjourney-test.grant-thornton.fr/ (redirige vers /myjourney/)"
echo ""
echo "⚠️  IMPORTANT - Mise à jour Azure AD Portal :"
echo "   1. Allez sur https://portal.azure.com"
echo "   2. Azure Active Directory → App registrations"
echo "   3. Trouvez votre application MyJourney"
echo "   4. Authentication → Redirect URIs"
echo "   5. Remplacez par : https://myjourney-test.grant-thornton.fr/myjourney/"
echo "   6. Logout URL : https://myjourney-test.grant-thornton.fr/myjourney/"
echo ""
echo "📧 MESSAGE POUR L'ADMINISTRATEUR RÉSEAU :"
echo "   Demandez l'ajout de cette entrée DNS :"
echo "   10.100.9.40    myjourney-test.grant-thornton.fr"
echo ""
echo "✅ L'application est prête avec les nouvelles URLs !"