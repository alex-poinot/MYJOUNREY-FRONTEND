#!/bin/bash

echo "🔧 Correction étape par étape du problème HTTPS"
echo "=============================================="

# Étape 1: Arrêter tous les services qui pourraient être en conflit
echo "1️⃣ Arrêt des services en conflit..."
sudo systemctl stop nginx 2>/dev/null || true
docker compose down 2>/dev/null || true

# Étape 2: Installer Nginx si nécessaire
echo "2️⃣ Installation/vérification de Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt update
    sudo apt install -y nginx
fi

# Étape 3: Supprimer les anciennes configurations
echo "3️⃣ Nettoyage des anciennes configurations..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/myjourney
sudo rm -f /etc/nginx/sites-available/myjourney

# Étape 4: Créer le répertoire SSL
echo "4️⃣ Création du répertoire SSL..."
sudo mkdir -p /etc/nginx/ssl

# Étape 5: Générer le certificat SSL
echo "5️⃣ Génération du certificat SSL..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/myjourney.key \
    -out /etc/nginx/ssl/myjourney.crt \
    -subj "/C=FR/ST=France/L=Paris/O=GrantThornton/CN=10.100.9.40" \
    2>/dev/null

# Étape 6: Créer une configuration Nginx simple
echo "6️⃣ Création de la configuration Nginx..."
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
# Configuration HTTP simple (pour test)
server {
    listen 80;
    server_name 10.100.9.40;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl;
    server_name 10.100.9.40;
    
    ssl_certificate /etc/nginx/ssl/myjourney.crt;
    ssl_certificate_key /etc/nginx/ssl/myjourney.key;
    
    # Configuration SSL basique
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

# Étape 7: Activer le site
echo "7️⃣ Activation du site..."
sudo ln -sf /etc/nginx/sites-available/myjourney /etc/nginx/sites-enabled/

# Étape 8: Tester la configuration
echo "8️⃣ Test de la configuration Nginx..."
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

# Étape 9: Démarrer Nginx
echo "9️⃣ Démarrage de Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Étape 10: Mettre à jour Docker pour utiliser le port 8080
echo "🔟 Mise à jour de Docker..."
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
      - API_URL=https://10.100.9.40:3000
    networks:
      - myjourney-network

networks:
  myjourney-network:
    driver: bridge
EOF

# Étape 11: Démarrer Docker
echo "1️⃣1️⃣ Démarrage de Docker..."
docker compose up -d

# Étape 12: Attendre et tester
echo "1️⃣2️⃣ Test final..."
sleep 10

echo ""
echo "🧪 Tests de connectivité:"
echo "HTTP (port 80):"
curl -I http://10.100.9.40 2>/dev/null | head -3 || echo "❌ HTTP ne fonctionne pas"

echo ""
echo "HTTPS (port 443):"
curl -I -k https://10.100.9.40 2>/dev/null | head -3 || echo "❌ HTTPS ne fonctionne pas"

echo ""
echo "Docker direct (port 8080):"
curl -I http://10.100.9.40:8080 2>/dev/null | head -3 || echo "❌ Docker ne fonctionne pas"

echo ""
echo "✅ Configuration terminée!"
echo "🌐 Testez maintenant:"
echo "   - HTTP:  http://10.100.9.40"
echo "   - HTTPS: https://10.100.9.40 (acceptez le certificat auto-signé)"