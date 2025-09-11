#!/bin/bash

echo "🌐 SOLUTION SSL POUR EDGE ET NAVIGATEURS RÉCENTS"
echo "==============================================="

echo ""
echo "🔍 PROBLÈME IDENTIFIÉ:"
echo "Les versions récentes d'Edge et Chrome ont durci leurs politiques SSL"
echo "et n'affichent plus toujours le bouton 'Continuer' pour les certificats auto-signés."

echo ""
echo "🔧 SOLUTION 1: Méthodes spécifiques Edge"
echo "========================================"
echo ""
echo "📱 Edge - Méthodes alternatives:"
echo "1. Sur la page d'erreur SSL, cherchez 'Détails' ou 'Advanced'"
echo "2. Si pas de bouton visible, essayez:"
echo "   - Clic droit → 'Inspecter l'élément'"
echo "   - Appuyez sur F12 pour ouvrir les outils développeur"
echo "   - Dans la console, tapez: window.location.href = 'https://10.100.9.40'"
echo ""
echo "3. Ou utilisez le raccourci clavier:"
echo "   - Appuyez sur Alt + D (barre d'adresse)"
echo "   - Tapez: edge://flags/#allow-insecure-localhost"
echo "   - Activez cette option et redémarrez Edge"

echo ""
echo "🔧 SOLUTION 2: Configuration d'un certificat accepté"
echo "===================================================="

# Créer un certificat avec des paramètres plus compatibles
echo "Génération d'un certificat SSL plus compatible..."

sudo mkdir -p /etc/nginx/ssl
sudo rm -f /etc/nginx/ssl/myjourney.*

# Créer un fichier de configuration SSL ultra-compatible
sudo tee /tmp/ssl-edge-compatible.conf > /dev/null << 'EOF'
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
O=MyJourney
OU=Development
CN=10.100.9.40
emailAddress=admin@myjourney.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = critical, serverAuth, clientAuth
subjectAltName = @alt_names
authorityKeyIdentifier = keyid,issuer:always
subjectKeyIdentifier = hash

[alt_names]
DNS.1 = 10.100.9.40
IP.1 = 10.100.9.40
DNS.2 = localhost
IP.2 = 127.0.0.1
DNS.3 = myjourney.local
DNS.4 = app.myjourney.local
EOF

# Générer le certificat ultra-compatible
sudo openssl req -new -x509 -days 365 -nodes \
    -out /etc/nginx/ssl/myjourney.crt \
    -keyout /etc/nginx/ssl/myjourney.key \
    -config /tmp/ssl-edge-compatible.conf \
    -extensions v3_req

sudo chmod 644 /etc/nginx/ssl/myjourney.crt
sudo chmod 600 /etc/nginx/ssl/myjourney.key

sudo rm -f /tmp/ssl-edge-compatible.conf

echo "✅ Certificat SSL ultra-compatible généré"

echo ""
echo "🔧 SOLUTION 3: Configuration Nginx optimisée pour Edge"
echo "====================================================="

# Créer une configuration Nginx spécialement optimisée pour Edge
sudo tee /etc/nginx/sites-available/myjourney.edge > /dev/null << 'EOF'
# Configuration HTTP
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location /test {
        return 200 "HTTP Test OK - Edge Compatible\n";
        add_header Content-Type text/plain;
    }
    
    # Pas de redirection forcée - laisse le choix
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }
}

# Configuration HTTPS optimisée pour Edge
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL ultra-compatible Edge
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # Headers spéciaux pour Edge
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Pas de HSTS pour éviter les blocages Edge
    # add_header Strict-Transport-Security "max-age=31536000" always;
    
    location /test {
        return 200 "HTTPS Test OK - Edge Compatible SSL\n";
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

# Activer la nouvelle configuration
sudo ln -sf /etc/nginx/sites-available/myjourney.edge /etc/nginx/sites-enabled/myjourney

echo "✅ Configuration Nginx optimisée pour Edge créée"

# Tester et redémarrer
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx redémarré avec la configuration Edge"
else
    echo "❌ Erreur de configuration"
    sudo nginx -t
fi

echo ""
echo "🔧 SOLUTION 4: Script d'installation du certificat"
echo "=================================================="

# Créer un script pour installer le certificat dans Windows
cat > install-cert-windows.bat << 'EOF'
@echo off
echo Installation du certificat MyJourney dans Windows
echo ================================================

echo Telechargement du certificat...
curl -k https://10.100.9.40/cert -o myjourney.crt

echo Installation du certificat...
certlm.msc

echo Instructions:
echo 1. Dans certlm.msc, allez dans "Autorites de certification racines de confiance"
echo 2. Clic droit > Toutes les taches > Importer
echo 3. Selectionnez le fichier myjourney.crt
echo 4. Redemarrez Edge

pause
EOF

echo "✅ Script d'installation Windows créé: install-cert-windows.bat"

echo ""
echo "🎯 SOLUTIONS DISPONIBLES POUR EDGE:"
echo "==================================="
echo ""
echo "1. 🌐 ACCÈS HTTP (Sans SSL - Fonctionne immédiatement):"
echo "   👉 http://10.100.9.40"
echo ""
echo "2. 🔧 EDGE - Méthodes de contournement:"
echo "   - F12 → Console → window.location.href = 'https://10.100.9.40'"
echo "   - edge://flags/#allow-insecure-localhost (activer et redémarrer)"
echo "   - Clic droit sur la page d'erreur → Inspecter → Console"
echo ""
echo "3. 🦊 FIREFOX (Plus permissif):"
echo "   - Généralement plus facile avec les certificats auto-signés"
echo ""
echo "4. 📱 CHROME:"
echo "   - Tapez 'thisisunsafe' sur la page d'erreur"
echo ""
echo "5. 💻 INSTALLATION CERTIFICAT:"
echo "   - Exécutez install-cert-windows.bat sur Windows"
echo "   - Ou ajoutez manuellement le certificat au système"

echo ""
echo "🧪 TESTS:"
echo "========="
sleep 3

echo "Test HTTP (devrait fonctionner):"
curl -s http://10.100.9.40/test || echo "❌ HTTP ne fonctionne pas"

echo ""
echo "Test HTTPS (certificat amélioré):"
curl -k -s https://10.100.9.40/test || echo "❌ HTTPS ne fonctionne pas"

echo ""
echo "✅ CONFIGURATION EDGE TERMINÉE !"
echo "================================"
echo ""
echo "🚀 RECOMMANDATION:"
echo "   Utilisez http://10.100.9.40 pour un accès immédiat"
echo "   Ou suivez les méthodes Edge ci-dessus pour HTTPS"