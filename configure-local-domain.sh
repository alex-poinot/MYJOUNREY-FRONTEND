#!/bin/bash

echo "🌐 Configuration du domaine local localhost.grant-thornton.fr"
echo "=========================================================="

# Étape 1: Ajouter le domaine au fichier hosts
echo "1️⃣ Configuration du fichier hosts..."
if ! grep -q "localhost.grant-thornton.fr" /etc/hosts; then
    echo "127.0.0.1 localhost.grant-thornton.fr" | sudo tee -a /etc/hosts
    echo "10.100.9.40 localhost.grant-thornton.fr" | sudo tee -a /etc/hosts
    echo "✅ Domaine ajouté au fichier hosts"
else
    echo "✅ Domaine déjà présent dans hosts"
fi

# Étape 2: Générer un certificat SSL pour le domaine
echo "2️⃣ Génération du certificat SSL pour localhost.grant-thornton.fr..."
sudo mkdir -p /etc/nginx/ssl

# Créer un fichier de configuration SSL pour le domaine
sudo tee /tmp/ssl-domain.conf > /dev/null << 'EOF'
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
O=Grant Thornton
OU=IT Department
CN=localhost.grant-thornton.fr

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost.grant-thornton.fr
DNS.2 = localhost
IP.1 = 127.0.0.1
IP.2 = 10.100.9.40
EOF

# Générer le certificat pour le domaine
sudo openssl req -new -x509 -days 365 -nodes \
    -out /etc/nginx/ssl/grant-thornton.crt \
    -keyout /etc/nginx/ssl/grant-thornton.key \
    -config /tmp/ssl-domain.conf \
    -extensions v3_req

sudo chmod 644 /etc/nginx/ssl/grant-thornton.crt
sudo chmod 600 /etc/nginx/ssl/grant-thornton.key
sudo rm -f /tmp/ssl-domain.conf

echo "✅ Certificat SSL généré pour localhost.grant-thornton.fr"

# Étape 3: Configuration Nginx pour le domaine
echo "3️⃣ Configuration Nginx pour localhost.grant-thornton.fr..."
sudo tee /etc/nginx/sites-available/grant-thornton > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name localhost.grant-thornton.fr;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS pour Grant Thornton
server {
    listen 443 ssl http2;
    server_name localhost.grant-thornton.fr;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/grant-thornton.crt;
    ssl_certificate_key /etc/nginx/ssl/grant-thornton.key;
    
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
        return 200 "Grant Thornton HTTPS Server OK\n";
        add_header Content-Type text/plain;
    }
    
    # Proxy vers l'application Angular
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffers
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/grant-thornton /etc/nginx/sites-enabled/

echo "✅ Configuration Nginx créée"

# Étape 4: Mettre à jour la configuration Angular
echo "4️⃣ Mise à jour de la configuration Angular..."
cat > src/environments/environment.staging.ts << 'EOF'
// Configuration pour l'environnement de recette avec domaine local
export const environment = {
  production: false,
  name: 'staging',
  apiUrl: 'https://localhost.grant-thornton.fr:3000',
  azure: {
    clientId: '61afef70-d6d1-45cd-a015-82063f882824',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'https://localhost.grant-thornton.fr/',
    postLogoutRedirectUri: 'https://localhost.grant-thornton.fr/'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false
  }
};
EOF

echo "✅ Configuration Angular mise à jour"

# Étape 5: Tester la configuration
echo "5️⃣ Test de la configuration Nginx..."
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
    sudo systemctl reload nginx
    echo "✅ Nginx rechargé"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

# Étape 6: Rebuild de l'application
echo "6️⃣ Rebuild de l'application avec la nouvelle configuration..."
docker compose down
docker compose up -d --build

echo "⏳ Attente du démarrage (20 secondes)..."
sleep 20

# Étape 7: Tests
echo "7️⃣ Tests de connectivité..."

echo "Test HTTP:"
curl -s http://localhost.grant-thornton.fr/test || echo "❌ HTTP ne fonctionne pas"

echo ""
echo "Test HTTPS:"
curl -k -s https://localhost.grant-thornton.fr/test || echo "❌ HTTPS ne fonctionne pas"

echo ""
echo "✅ CONFIGURATION TERMINÉE !"
echo "=========================="
echo ""
echo "🌐 Nouvelle URL de votre application:"
echo "   https://localhost.grant-thornton.fr"
echo ""
echo "🔧 Prochaines étapes:"
echo "1. Mettez à jour Azure AD Portal avec la nouvelle URL:"
echo "   - Redirect URI: https://localhost.grant-thornton.fr/"
echo "   - Logout URL: https://localhost.grant-thornton.fr/"
echo ""
echo "2. Testez dans votre navigateur:"
echo "   https://localhost.grant-thornton.fr"
echo ""
echo "💡 Cette URL sera plus facilement acceptée par les navigateurs !"