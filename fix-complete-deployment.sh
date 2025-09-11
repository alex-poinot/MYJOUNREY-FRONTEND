#!/bin/bash

echo "🔧 Correction complète du déploiement MyJourney"
echo "=============================================="

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

# Étape 1: Arrêt complet de tous les services
step "Arrêt complet de tous les services"
docker compose down --remove-orphans 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
sudo pkill -f nginx 2>/dev/null || true
sudo pkill -f docker-proxy 2>/dev/null || true

# Attendre que les ports se libèrent
sleep 5

# Étape 2: Vérification et libération des ports
step "Libération des ports 80, 443 et 8080"
for port in 80 443 8080; do
    echo "Vérification du port $port..."
    if sudo lsof -i :$port 2>/dev/null; then
        echo "⚠️ Port $port occupé, libération..."
        sudo lsof -i :$port | grep -v COMMAND | awk '{print $2}' | xargs -r sudo kill -9 2>/dev/null || true
    else
        echo "✅ Port $port libre"
    fi
done

# Étape 3: Nettoyage Docker complet
step "Nettoyage Docker complet"
docker system prune -af
docker network prune -f

# Étape 4: Correction de docker-compose.yml
step "Correction de docker-compose.yml"
cat > docker-compose.yml << 'EOF'
services:
  myjourney-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: myjourney-staging
    ports:
      - "8080:80"  # Docker sur port 8080, Nginx sur 80/443
    restart: unless-stopped
    environment:
      - NODE_ENV=staging
      - API_URL=https://10.100.9.40:3000
    networks:
      - myjourney-network

networks:
  myjourney-network:
    driver: bridge
EOF

echo "✅ docker-compose.yml corrigé (Docker → port 8080)"

# Étape 5: Création de la configuration Nginx complète
step "Création de la configuration Nginx complète"
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/myjourney

# S'assurer que le répertoire SSL existe
sudo mkdir -p /etc/nginx/ssl

# Générer le certificat SSL si nécessaire
if [ ! -f /etc/nginx/ssl/myjourney.crt ]; then
    echo "🔒 Génération du certificat SSL..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/myjourney.key \
        -out /etc/nginx/ssl/myjourney.crt \
        -subj "/C=FR/ST=France/L=Paris/O=GrantThornton/CN=10.100.9.40" \
        2>/dev/null
    echo "✅ Certificat SSL généré"
fi

# Configuration Nginx complète et fonctionnelle
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 10.100.9.40 _;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name 10.100.9.40 _;
    
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
        return 200 "MyJourney HTTPS Server OK - Port 443 -> 8080\n";
        add_header Content-Type text/plain;
    }
    
    # Proxy vers l'application Docker (port 8080)
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

# Activer le site
sudo ln -sf /etc/nginx/sites-available/myjourney /etc/nginx/sites-enabled/

echo "✅ Configuration Nginx créée"

# Étape 6: Test de la configuration Nginx
step "Test de la configuration Nginx"
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

# Étape 7: Démarrage de Docker
step "Démarrage de Docker"
docker compose up -d

# Attendre que Docker soit prêt
echo "⏳ Attente du démarrage Docker (30 secondes)..."
sleep 30

# Vérifier que Docker répond
echo "🔍 Vérification de Docker sur port 8080..."
if curl -f -m 10 http://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ Docker répond sur le port 8080"
else
    echo "❌ Docker ne répond pas sur le port 8080"
    echo "📋 Logs Docker:"
    docker logs myjourney-staging --tail 10
    echo ""
    echo "🔍 État du conteneur:"
    docker ps | grep myjourney
    echo ""
    echo "⚠️ Tentative de redémarrage du conteneur..."
    docker restart myjourney-staging
    sleep 15
    
    if curl -f -m 10 http://127.0.0.1:8080 > /dev/null 2>&1; then
        echo "✅ Docker répond après redémarrage"
    else
        echo "❌ Docker ne répond toujours pas"
        echo "Continuons avec Nginx..."
    fi
fi

# Étape 8: Démarrage de Nginx
step "Démarrage de Nginx"
if sudo systemctl start nginx; then
    echo "✅ Nginx démarré"
    sudo systemctl enable nginx
else
    echo "❌ Échec du démarrage de Nginx"
    echo "📋 Status Nginx:"
    sudo systemctl status nginx --no-pager -l
    echo ""
    echo "📋 Logs d'erreur:"
    sudo journalctl -xeu nginx.service --no-pager | tail -10
    exit 1
fi

# Attendre un peu
sleep 5

# Étape 9: Tests de connectivité complets
step "Tests de connectivité complets"

echo "🧪 Test 1: Page de test HTTPS locale"
if curl -k -m 10 https://127.0.0.1/test 2>/dev/null; then
    echo "✅ Page de test HTTPS locale OK"
else
    echo "❌ Page de test HTTPS locale échoue"
fi

echo ""
echo "🧪 Test 2: Page de test HTTPS externe"
if curl -k -m 10 https://10.100.9.40/test 2>/dev/null; then
    echo "✅ Page de test HTTPS externe OK"
else
    echo "❌ Page de test HTTPS externe échoue"
fi

echo ""
echo "🧪 Test 3: Application HTTPS locale"
if curl -k -m 10 https://127.0.0.1 2>/dev/null | head -3; then
    echo "✅ Application HTTPS locale accessible"
else
    echo "❌ Application HTTPS locale inaccessible"
fi

echo ""
echo "🧪 Test 4: Application HTTPS externe"
if curl -k -m 10 https://10.100.9.40 2>/dev/null | head -3; then
    echo "✅ Application HTTPS externe accessible"
else
    echo "❌ Application HTTPS externe inaccessible"
fi

echo ""
echo "🧪 Test 5: Redirection HTTP vers HTTPS"
if curl -m 10 http://10.100.9.40 2>/dev/null | grep -q "301 Moved Permanently"; then
    echo "✅ Redirection HTTP → HTTPS fonctionne"
else
    echo "❌ Redirection HTTP → HTTPS ne fonctionne pas"
fi

# Étape 10: État final des services
step "État final des services"

echo "📊 Docker:"
docker ps | grep myjourney || echo "❌ Conteneur MyJourney non trouvé"

echo ""
echo "📊 Nginx:"
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx actif"
else
    echo "❌ Nginx inactif"
fi

echo ""
echo "📊 Ports en écoute:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' | head -5

echo ""
echo "📊 Processus sur les ports:"
echo "Port 80:"
sudo lsof -i :80 2>/dev/null | head -3 || echo "Aucun processus"
echo "Port 443:"
sudo lsof -i :443 2>/dev/null | head -3 || echo "Aucun processus"
echo "Port 8080:"
sudo lsof -i :8080 2>/dev/null | head -3 || echo "Aucun processus"

# Résumé final
echo ""
echo "🎉 CORRECTION TERMINÉE !"
echo "======================="
echo ""
echo "📋 Configuration finale:"
echo "   - Docker: port 8080 (application Angular)"
echo "   - Nginx: ports 80 (redirect) et 443 (HTTPS)"
echo "   - Proxy: 443 → 8080"
echo ""
echo "🌐 URLs de test:"
echo "   - https://10.100.9.40/test (page de test)"
echo "   - https://10.100.9.40 (application MyJourney)"
echo "   - http://10.100.9.40 (redirection automatique vers HTTPS)"
echo ""
echo "⚠️  Note: Acceptez le certificat auto-signé dans votre navigateur"
echo ""
echo "🔧 Si des problèmes persistent:"
echo "   - Vérifiez le firewall: sudo ufw status"
echo "   - Vérifiez les logs: docker logs myjourney-staging"
echo "   - Vérifiez Nginx: sudo systemctl status nginx"