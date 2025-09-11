#!/bin/bash

echo "🔧 Correction des problèmes réseau et services"
echo "=============================================="

# Arrêter tous les services
echo "⏹️ Arrêt de tous les services..."
docker compose down 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# Nettoyer les processus qui pourraient bloquer les ports
echo "🧹 Nettoyage des processus bloquants..."
sudo pkill -f nginx 2>/dev/null || true
sudo pkill -f docker-proxy 2>/dev/null || true

# Attendre un peu
sleep 5

# Vérifier qu'aucun processus n'utilise les ports
echo "🔍 Vérification des ports libres..."
if sudo lsof -i :80 2>/dev/null; then
    echo "⚠️ Le port 80 est encore utilisé"
    sudo lsof -i :80 | grep -v COMMAND | awk '{print $2}' | xargs -r sudo kill -9
fi

if sudo lsof -i :443 2>/dev/null; then
    echo "⚠️ Le port 443 est encore utilisé"
    sudo lsof -i :443 | grep -v COMMAND | awk '{print $2}' | xargs -r sudo kill -9
fi

# Nettoyer Docker complètement
echo "🐳 Nettoyage Docker complet..."
docker system prune -af
docker network prune -f

# Recréer une configuration Nginx simple
echo "⚙️ Recréation de la configuration Nginx..."
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/myjourney

# Configuration Nginx ultra-simple pour test
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts pour éviter les blocages
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    # Page de test simple
    location /test {
        return 200 "MyJourney Server OK\n";
        add_header Content-Type text/plain;
    }
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # Timeouts pour éviter les blocages
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    # Page de test simple
    location /test {
        return 200 "MyJourney HTTPS Server OK\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/myjourney /etc/nginx/sites-enabled/

# Tester la configuration
echo "🧪 Test de la configuration Nginx..."
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

# Démarrer Nginx
echo "🚀 Démarrage de Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Attendre un peu
sleep 3

# Vérifier que Nginx fonctionne
echo "🔍 Vérification de Nginx..."
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx actif"
else
    echo "❌ Nginx non actif"
    sudo systemctl status nginx --no-pager -l
    exit 1
fi

# Créer une configuration Docker simplifiée
echo "🐳 Configuration Docker simplifiée..."
cat > docker-compose.yml << 'EOF'
services:
  myjourney-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: myjourney-staging
    ports:
      - "8080:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=staging
    networks:
      - myjourney-network

networks:
  myjourney-network:
    driver: bridge
EOF

# Démarrer Docker
echo "🚀 Démarrage de Docker..."
docker compose up -d

# Attendre le démarrage
echo "⏳ Attente du démarrage (30 secondes)..."
sleep 30

# Tests de connectivité
echo ""
echo "🔍 Tests de connectivité:"

echo "Test page de test Nginx HTTP:"
curl -m 10 http://localhost/test 2>/dev/null || echo "❌ Échec test HTTP"

echo ""
echo "Test page de test Nginx HTTPS:"
curl -k -m 10 https://localhost/test 2>/dev/null || echo "❌ Échec test HTTPS"

echo ""
echo "Test Docker direct:"
curl -m 10 http://localhost:8080 2>/dev/null | head -3 || echo "❌ Échec Docker direct"

echo ""
echo "Test application HTTP:"
curl -m 10 http://localhost 2>/dev/null | head -3 || echo "❌ Échec application HTTP"

echo ""
echo "Test application HTTPS:"
curl -k -m 10 https://localhost 2>/dev/null | head -3 || echo "❌ Échec application HTTPS"

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "🌐 Testez maintenant:"
echo "   - http://10.100.9.40/test (page de test)"
echo "   - http://10.100.9.40 (application)"
echo "   - https://10.100.9.40 (application HTTPS)"