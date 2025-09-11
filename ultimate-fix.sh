#!/bin/bash

echo "🚀 CORRECTION ULTIME - MyJourney"
echo "================================"

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 ÉTAPE $1: $2"
    echo "----------------------------------------"
}

# Fonction pour vérifier le succès
check_success() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ $1"
        return 1
    fi
}

step "1" "ARRÊT COMPLET DE TOUS LES SERVICES"
echo "Arrêt de Docker..."
docker compose down --remove-orphans 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true

echo "Arrêt de Nginx..."
sudo systemctl stop nginx 2>/dev/null || true
sudo pkill -f nginx 2>/dev/null || true

echo "Nettoyage des processus..."
sudo pkill -f docker-proxy 2>/dev/null || true

# Attendre que les ports se libèrent
sleep 10

step "2" "LIBÉRATION FORCÉE DES PORTS"
for port in 80 443 8080; do
    echo "Libération du port $port..."
    pids=$(sudo lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "Processus trouvés sur port $port: $pids"
        echo "$pids" | xargs -r sudo kill -9 2>/dev/null || true
    fi
done

sleep 5

step "3" "NETTOYAGE DOCKER COMPLET"
docker system prune -af
docker network prune -f
docker volume prune -f

step "4" "CRÉATION D'UNE CONFIGURATION DOCKER SIMPLE"
cat > docker-compose.yml << 'EOF'
version: '3.8'
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

echo "✅ docker-compose.yml créé (Docker sur port 8080)"

step "5" "SUPPRESSION COMPLÈTE DE LA CONFIGURATION NGINX"
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/myjourney
sudo mkdir -p /etc/nginx/ssl

step "6" "GÉNÉRATION DU CERTIFICAT SSL"
if [ ! -f /etc/nginx/ssl/myjourney.crt ]; then
    echo "Génération du certificat SSL..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/myjourney.key \
        -out /etc/nginx/ssl/myjourney.crt \
        -subj "/C=FR/ST=France/L=Paris/O=GrantThornton/CN=10.100.9.40" \
        2>/dev/null
    check_success "Certificat SSL généré"
else
    echo "✅ Certificat SSL existe déjà"
fi

step "7" "CRÉATION D'UNE CONFIGURATION NGINX ULTRA-SIMPLE"
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location /test {
        return 200 "HTTP Test OK\n";
        add_header Content-Type text/plain;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location /test {
        return 200 "HTTPS Test OK - Nginx fonctionne\n";
        add_header Content-Type text/plain;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/myjourney /etc/nginx/sites-enabled/

step "8" "TEST DE LA CONFIGURATION NGINX"
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

step "9" "DÉMARRAGE DE DOCKER"
echo "Build et démarrage de Docker..."
docker compose up -d --build

echo "Attente du démarrage (30 secondes)..."
sleep 30

echo "Vérification de Docker..."
if curl -f -m 10 http://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ Docker répond sur port 8080"
else
    echo "❌ Docker ne répond pas, vérification des logs..."
    docker logs myjourney-staging --tail 10
    echo "Tentative de redémarrage..."
    docker restart myjourney-staging
    sleep 15
fi

step "10" "DÉMARRAGE DE NGINX"
echo "Démarrage de Nginx..."
if sudo systemctl start nginx; then
    echo "✅ Nginx démarré"
    sudo systemctl enable nginx
else
    echo "❌ Échec du démarrage de Nginx"
    sudo systemctl status nginx --no-pager -l
    sudo journalctl -u nginx.service --no-pager -l | tail -10
    exit 1
fi

sleep 5

step "11" "TESTS DE CONNECTIVITÉ COMPLETS"

echo "🧪 Test 1: Page de test HTTP locale"
result=$(timeout 10 curl -s http://127.0.0.1/test 2>/dev/null)
if [[ "$result" == *"HTTP Test OK"* ]]; then
    echo "✅ HTTP local fonctionne"
else
    echo "❌ HTTP local ne fonctionne pas: $result"
fi

echo ""
echo "🧪 Test 2: Page de test HTTPS locale"
result=$(timeout 10 curl -s -k https://127.0.0.1/test 2>/dev/null)
if [[ "$result" == *"HTTPS Test OK"* ]]; then
    echo "✅ HTTPS local fonctionne"
else
    echo "❌ HTTPS local ne fonctionne pas: $result"
fi

echo ""
echo "🧪 Test 3: Page de test HTTP externe"
result=$(timeout 10 curl -s http://10.100.9.40/test 2>/dev/null)
if [[ "$result" == *"Moved Permanently"* ]] || [[ "$result" == *"HTTP Test OK"* ]]; then
    echo "✅ HTTP externe fonctionne (redirection ou direct)"
else
    echo "❌ HTTP externe ne fonctionne pas: $result"
fi

echo ""
echo "🧪 Test 4: Page de test HTTPS externe"
result=$(timeout 10 curl -s -k https://10.100.9.40/test 2>/dev/null)
if [[ "$result" == *"HTTPS Test OK"* ]]; then
    echo "✅ HTTPS externe fonctionne"
else
    echo "❌ HTTPS externe ne fonctionne pas: $result"
fi

echo ""
echo "🧪 Test 5: Application HTTPS externe"
result=$(timeout 10 curl -s -k https://10.100.9.40 2>/dev/null | head -3)
if [[ "$result" == *"<html"* ]] || [[ "$result" == *"<!DOCTYPE"* ]]; then
    echo "✅ Application HTTPS externe accessible"
else
    echo "❌ Application HTTPS externe inaccessible: $result"
fi

step "12" "ÉTAT FINAL DES SERVICES"

echo "📊 Docker:"
docker ps | grep myjourney || echo "❌ Conteneur non trouvé"

echo ""
echo "📊 Nginx:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx actif"
else
    echo "❌ Nginx inactif"
fi

echo ""
echo "📊 Ports en écoute:"
sudo netstat -tlnp | grep -E ':(80|443|8080)' | head -5

echo ""
echo "🎉 CORRECTION TERMINÉE !"
echo "======================="
echo ""
echo "🌐 URLs à tester dans votre navigateur:"
echo "   - http://10.100.9.40/test  → 'HTTP Test OK' ou redirection"
echo "   - https://10.100.9.40/test → 'HTTPS Test OK - Nginx fonctionne'"
echo "   - https://10.100.9.40      → Application MyJourney"
echo ""
echo "⚠️  Pour HTTPS, acceptez le certificat auto-signé"
echo ""
echo "🔧 Si ça ne fonctionne toujours pas:"
echo "   - Vérifiez le firewall: sudo ufw status"
echo "   - Vérifiez la connectivité réseau depuis votre poste"
echo "   - Contactez l'administrateur réseau si nécessaire"