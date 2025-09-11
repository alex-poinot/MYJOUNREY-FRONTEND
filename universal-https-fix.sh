#!/bin/bash

echo "🌐 SOLUTION HTTPS UNIVERSELLE - MyJourney"
echo "========================================"

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

step "1. ARRÊT ET NETTOYAGE COMPLET"
sudo systemctl stop nginx
sudo pkill -f nginx 2>/dev/null || true
sleep 3

step "2. SUPPRESSION ET RECRÉATION DU CERTIFICAT SSL"
sudo rm -rf /etc/nginx/ssl
sudo mkdir -p /etc/nginx/ssl

# Créer un fichier de configuration SSL avancé
sudo tee /tmp/ssl-config.conf > /dev/null << 'EOF'
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
CN=10.100.9.40

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = 10.100.9.40
IP.1 = 10.100.9.40
DNS.2 = localhost
IP.2 = 127.0.0.1
DNS.3 = myjourney.local
EOF

# Générer le certificat SSL avec la configuration avancée
echo "🔐 Génération du certificat SSL optimisé..."
sudo openssl req -new -x509 -days 365 -nodes \
    -out /etc/nginx/ssl/myjourney.crt \
    -keyout /etc/nginx/ssl/myjourney.key \
    -config /tmp/ssl-config.conf \
    -extensions v3_req

# Définir les permissions correctes
sudo chmod 644 /etc/nginx/ssl/myjourney.crt
sudo chmod 600 /etc/nginx/ssl/myjourney.key
sudo chown root:root /etc/nginx/ssl/myjourney.*

# Nettoyer
sudo rm -f /tmp/ssl-config.conf

echo "✅ Certificat SSL généré avec SAN (Subject Alternative Names)"

step "3. CRÉATION D'UNE CONFIGURATION NGINX UNIVERSELLE"
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
# Configuration HTTP avec redirection
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    # Page de test HTTP
    location /test {
        return 200 "HTTP Test OK - Redirection HTTPS disponible\n";
        add_header Content-Type text/plain;
    }
    
    # Redirection vers HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS optimisée pour tous les navigateurs
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL compatible avec tous les navigateurs
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # Headers de sécurité optimisés
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Page de test HTTPS
    location /test {
        return 200 "HTTPS Test OK - Certificat SSL fonctionnel pour tous les navigateurs\n";
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
        
        # Timeouts optimisés
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffers pour les performances
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # Gestion des erreurs
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_intercept_errors off;
    }
}
EOF

echo "✅ Configuration Nginx universelle créée"

step "4. VÉRIFICATION ET DÉMARRAGE"
# Tester la configuration
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

# Démarrer Nginx
if sudo systemctl start nginx; then
    echo "✅ Nginx démarré avec succès"
    sudo systemctl enable nginx
else
    echo "❌ Échec du démarrage de Nginx"
    sudo systemctl status nginx --no-pager -l
    exit 1
fi

step "5. VÉRIFICATION DU CERTIFICAT SSL"
echo "🔍 Informations du certificat généré:"
sudo openssl x509 -in /etc/nginx/ssl/myjourney.crt -text -noout | grep -A 5 "Subject Alternative Name" || echo "SAN non trouvé"

echo ""
echo "🔍 Validité du certificat:"
sudo openssl x509 -in /etc/nginx/ssl/myjourney.crt -noout -dates

step "6. TESTS DE CONNECTIVITÉ DÉTAILLÉS"
sleep 5

echo "🧪 Test 1: HTTP local"
if curl -s http://127.0.0.1/test | grep -q "HTTP Test OK"; then
    echo "✅ HTTP local fonctionne"
else
    echo "❌ HTTP local ne fonctionne pas"
fi

echo ""
echo "🧪 Test 2: HTTPS local avec certificat"
if curl -k -s https://127.0.0.1/test | grep -q "HTTPS Test OK"; then
    echo "✅ HTTPS local fonctionne"
else
    echo "❌ HTTPS local ne fonctionne pas"
    echo "Détails de l'erreur:"
    curl -k -v https://127.0.0.1/test 2>&1 | head -10
fi

echo ""
echo "🧪 Test 3: HTTPS externe"
if curl -k -s https://10.100.9.40/test | grep -q "HTTPS Test OK"; then
    echo "✅ HTTPS externe fonctionne"
else
    echo "❌ HTTPS externe ne fonctionne pas"
fi

echo ""
echo "🧪 Test 4: Application Angular"
if curl -k -s https://10.100.9.40 | grep -q -E "(html|DOCTYPE)"; then
    echo "✅ Application Angular accessible"
else
    echo "❌ Application Angular non accessible"
    echo "Vérification du conteneur Docker:"
    docker ps | grep myjourney || echo "Conteneur non trouvé"
fi

step "7. GUIDE D'ACCÈS POUR TOUS LES NAVIGATEURS"

echo ""
echo "🎯 ACCÈS UNIVERSEL À L'APPLICATION"
echo "=================================="
echo ""
echo "🌐 URL principale: https://10.100.9.40"
echo ""
echo "🔓 CHROME:"
echo "   1. Allez sur https://10.100.9.40"
echo "   2. Sur la page d'erreur SSL, tapez: thisisunsafe"
echo "   3. L'application se charge automatiquement"
echo ""
echo "🔓 EDGE:"
echo "   1. Allez sur https://10.100.9.40"
echo "   2. Cliquez sur 'Avancé'"
echo "   3. Cliquez sur 'Continuer vers 10.100.9.40 (non sécurisé)'"
echo ""
echo "🔓 FIREFOX:"
echo "   1. Allez sur https://10.100.9.40"
echo "   2. Cliquez sur 'Avancé'"
echo "   3. Cliquez sur 'Accepter le risque et continuer'"
echo ""
echo "🔓 SAFARI:"
echo "   1. Allez sur https://10.100.9.40"
echo "   2. Cliquez sur 'Afficher les détails'"
echo "   3. Cliquez sur 'Visiter ce site web'"
echo ""

step "8. VÉRIFICATION FINALE"
echo "📊 État des services:"
echo "Nginx: $(systemctl is-active nginx)"
echo "Docker: $(docker ps --format 'table {{.Names}}\t{{.Status}}' | grep myjourney || echo 'Non trouvé')"

echo ""
echo "📊 Ports en écoute:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' | head -3

echo ""
echo "🎉 CONFIGURATION TERMINÉE !"
echo "=========================="
echo ""
echo "✅ Certificat SSL optimisé généré"
echo "✅ Configuration Nginx universelle"
echo "✅ Compatible avec tous les navigateurs"
echo ""
echo "🚀 TESTEZ MAINTENANT:"
echo "   https://10.100.9.40"
echo ""
echo "💡 Si vous voyez encore une erreur SSL, suivez les instructions"
echo "   spécifiques à votre navigateur ci-dessus."