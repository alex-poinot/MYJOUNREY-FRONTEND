#!/bin/bash

echo "🔧 Correction de l'erreur 'Not Found' - MyJourney"
echo "==============================================="

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

step "1. DIAGNOSTIC DU PROBLÈME"
echo "Vérification de l'état actuel..."

echo "📊 État Docker:"
docker ps | grep myjourney || echo "❌ Conteneur non trouvé"

echo ""
echo "📊 Test Docker direct:"
curl -I http://127.0.0.1:8080 2>/dev/null | head -3 || echo "❌ Docker ne répond pas"

echo ""
echo "📊 Configuration Nginx active:"
sudo nginx -t && echo "✅ Config valide" || echo "❌ Config invalide"

step "2. ARRÊT ET NETTOYAGE"
sudo systemctl stop nginx
docker compose down

step "3. CORRECTION DE LA CONFIGURATION NGINX"
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/ec-test-gt

# Configuration Nginx corrigée pour éviter le "Not Found"
sudo tee /etc/nginx/sites-available/ec-test-gt > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name ec-test.grant-thornton.fr 10.100.9.40;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS corrigée
server {
    listen 443 ssl http2;
    server_name ec-test.grant-thornton.fr 10.100.9.40;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/ec-test-gt.crt;
    ssl_certificate_key /etc/nginx/ssl/ec-test-gt.key;
    
    # Configuration SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Headers de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Page de test (pour vérifier que Nginx fonctionne)
    location /test {
        return 200 "MyJourney Server OK - Nginx fonctionne\n";
        add_header Content-Type text/plain;
    }
    
    # Redirection racine vers /myjourney/
    location = / {
        return 301 https://$server_name/myjourney/;
    }
    
    # Configuration pour /myjourney/ - CORRIGÉE
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
    
    # Gestion spéciale pour les assets Angular
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
sudo ln -sf /etc/nginx/sites-available/ec-test-gt /etc/nginx/sites-enabled/

echo "✅ Configuration Nginx corrigée"

step "4. VÉRIFICATION DU CERTIFICAT SSL"
if [ ! -f /etc/nginx/ssl/ec-test-gt.crt ]; then
    echo "🔐 Génération du certificat SSL..."
    sudo mkdir -p /etc/nginx/ssl
    
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/ec-test-gt.key \
        -out /etc/nginx/ssl/ec-test-gt.crt \
        -subj "/C=FR/ST=France/L=Paris/O=GrantThornton/CN=ec-test.grant-thornton.fr" \
        2>/dev/null
    
    sudo chmod 644 /etc/nginx/ssl/ec-test-gt.crt
    sudo chmod 600 /etc/nginx/ssl/ec-test-gt.key
    echo "✅ Certificat SSL généré"
else
    echo "✅ Certificat SSL existe déjà"
fi

step "5. CORRECTION DE LA CONFIGURATION ANGULAR"
echo "Mise à jour d'Angular pour le sous-chemin..."

# Corriger angular.json pour le baseHref
if grep -q '"baseHref": "/myjourney/"' angular.json; then
    echo "✅ baseHref déjà configuré"
else
    # Mise à jour du baseHref pour staging
    sed -i 's/"baseHref": "\/",/"baseHref": "\/myjourney\/",/g' angular.json
    echo "✅ baseHref mis à jour"
fi

# Corriger index.html
if grep -q '<base href="/myjourney/">' src/index.html; then
    echo "✅ Base href déjà configuré dans index.html"
else
    sed -i 's|<base href="/">|<base href="/myjourney/">|g' src/index.html
    echo "✅ Base href mis à jour dans index.html"
fi

step "6. TEST DE LA CONFIGURATION NGINX"
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

step "7. DÉMARRAGE DES SERVICES"
# Démarrer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
echo "✅ Nginx démarré"

# Rebuild et démarrer Docker
echo "🐳 Rebuild de l'application..."
docker compose up -d --build

echo "⏳ Attente du démarrage (30 secondes)..."
sleep 30

step "8. TESTS DE CONNECTIVITÉ DÉTAILLÉS"

echo "🧪 Test 1: Docker direct (doit fonctionner)"
if curl -f -m 10 http://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ Docker répond sur port 8080"
else
    echo "❌ Docker ne répond pas sur port 8080"
    echo "📋 Logs Docker:"
    docker logs myjourney-staging --tail 10
fi

echo ""
echo "🧪 Test 2: Page de test Nginx"
if curl -k -m 10 https://127.0.0.1/test 2>/dev/null | grep -q "MyJourney Server OK"; then
    echo "✅ Nginx fonctionne"
else
    echo "❌ Nginx ne fonctionne pas"
fi

echo ""
echo "🧪 Test 3: Application via /myjourney/"
if curl -k -m 10 https://127.0.0.1/myjourney/ 2>/dev/null | head -3; then
    echo "✅ Application accessible via /myjourney/"
else
    echo "❌ Application non accessible via /myjourney/"
    echo "📋 Logs Nginx:"
    sudo tail -5 /var/log/nginx/error.log
fi

echo ""
echo "🧪 Test 4: Test externe"
if curl -k -m 10 https://10.100.9.40/myjourney/ 2>/dev/null | head -3; then
    echo "✅ Application accessible depuis l'extérieur"
else
    echo "❌ Application non accessible depuis l'extérieur"
fi

step "9. INFORMATIONS DE DÉBOGAGE"
echo "📊 État final des services:"
echo "Docker:"
docker ps | grep myjourney

echo ""
echo "Nginx:"
sudo systemctl status nginx --no-pager -l | head -5

echo ""
echo "Ports en écoute:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' | head -5

step "10. SOLUTION FINALE"
echo ""
echo "🎉 CORRECTION APPLIQUÉE !"
echo "========================"
echo ""
echo "🌐 URLs à tester:"
echo "   1. https://ec-test.grant-thornton.fr/test"
echo "   2. https://ec-test.grant-thornton.fr/myjourney/"
echo "   3. https://10.100.9.40/myjourney/ (si hosts configuré)"
echo ""
echo "🔧 Si 'Not Found' persiste:"
echo "   1. Vérifiez que Docker répond: curl http://127.0.0.1:8080"
echo "   2. Vérifiez les logs: docker logs myjourney-staging"
echo "   3. Vérifiez Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "⚠️  N'oubliez pas de mettre à jour Azure AD Portal:"
echo "   Redirect URI: https://ec-test.grant-thornton.fr/myjourney/"