#!/bin/bash

# Script de configuration VM Ubuntu pour MyJourney Production
# IP: 10.100.6.40
# DNS: myjourney.grant-thronton.fr

set -e

echo "=========================================="
echo "Configuration VM Ubuntu - MyJourney Prod"
echo "=========================================="
echo ""

# Mise à jour du système
echo "📦 Mise à jour du système..."
sudo apt-get update
sudo apt-get upgrade -y

# Installation de Docker
echo "🐋 Installation de Docker..."
if ! command -v docker &> /dev/null; then
    # Installer les dépendances
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Ajouter la clé GPG officielle de Docker
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Ajouter le dépôt Docker
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Installer Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Ajouter l'utilisateur au groupe docker
    sudo usermod -aG docker $USER

    echo "✅ Docker installé avec succès"
else
    echo "✅ Docker déjà installé"
fi

# Installation de Nginx (hors Docker pour gérer le SSL)
echo "🌐 Installation de Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
    echo "✅ Nginx installé avec succès"
else
    echo "✅ Nginx déjà installé"
fi

# Installer git
echo "📥 Installation de Git..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
    echo "✅ Git installé avec succès"
else
    echo "✅ Git déjà installé"
fi

# Installer curl
echo "📥 Installation de curl..."
if ! command -v curl &> /dev/null; then
    sudo apt-get install -y curl
    echo "✅ curl installé avec succès"
else
    echo "✅ curl déjà installé"
fi

# Créer le répertoire de l'application
echo "📁 Création du répertoire de l'application..."
APP_DIR="/opt/myjourney-prod"
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    echo "✅ Répertoire créé: $APP_DIR"
else
    echo "✅ Répertoire déjà existant: $APP_DIR"
fi

# Créer le répertoire des logs
echo "📁 Création du répertoire des logs..."
LOGS_DIR="$APP_DIR/logs-prod"
if [ ! -d "$LOGS_DIR" ]; then
    mkdir -p $LOGS_DIR
    echo "✅ Répertoire logs créé: $LOGS_DIR"
else
    echo "✅ Répertoire logs déjà existant: $LOGS_DIR"
fi

# Configuration de Nginx pour SSL
echo "🔒 Configuration de Nginx pour SSL..."
NGINX_CONF="/etc/nginx/sites-available/myjourney-prod"

sudo tee $NGINX_CONF > /dev/null <<'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name myjourney.grant-thronton.fr 10.100.6.40;

    # Rediriger tout le trafic HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name myjourney.grant-thronton.fr 10.100.6.40;

    # Certificats SSL
    ssl_certificate /etc/ssl/certs/myjourney.crt;
    ssl_certificate_key /etc/ssl/private/myjourney.key;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logs
    access_log /var/log/nginx/myjourney-prod-access.log;
    error_log /var/log/nginx/myjourney-prod-error.log;

    # Proxy vers le conteneur Docker
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activer le site
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/myjourney-prod

# Désactiver le site par défaut
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration Nginx
echo "🔍 Test de la configuration Nginx..."
sudo nginx -t

# Configuration du firewall (UFW)
echo "🔥 Configuration du firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw allow 22/tcp comment 'SSH'
    sudo ufw allow 80/tcp comment 'HTTP'
    sudo ufw allow 443/tcp comment 'HTTPS'
    sudo ufw status
    echo "✅ Firewall configuré"
else
    echo "⚠️  UFW non installé, firewall non configuré"
fi

# Activer Docker au démarrage
echo "🔄 Activation de Docker au démarrage..."
sudo systemctl enable docker
sudo systemctl start docker

# Activer Nginx au démarrage
echo "🔄 Activation de Nginx au démarrage..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Vérifier la version de Docker
echo ""
echo "🔍 Versions installées:"
docker --version
docker compose version
nginx -v

echo ""
echo "=========================================="
echo "✅ Configuration terminée avec succès!"
echo "=========================================="
echo ""
echo "📋 Prochaines étapes:"
echo "1. Déconnectez-vous et reconnectez-vous pour appliquer les permissions Docker"
echo "   (ou exécutez: newgrp docker)"
echo ""
echo "2. Copiez vos certificats SSL:"
echo "   sudo cp votre-certificat.crt /etc/ssl/certs/myjourney.crt"
echo "   sudo cp votre-cle.key /etc/ssl/private/myjourney.key"
echo "   sudo chmod 644 /etc/ssl/certs/myjourney.crt"
echo "   sudo chmod 600 /etc/ssl/private/myjourney.key"
echo ""
echo "3. Copiez les fichiers du projet dans: $APP_DIR"
echo "   - docker-compose.prod.yml"
echo "   - Dockerfile.prod"
echo "   - build-and-deploy-prod.sh"
echo "   - Tous les fichiers source de l'application"
echo ""
echo "4. Allez dans le répertoire: cd $APP_DIR"
echo ""
echo "5. Rendez le script exécutable:"
echo "   chmod +x build-and-deploy-prod.sh"
echo ""
echo "6. Lancez le déploiement:"
echo "   ./build-and-deploy-prod.sh"
echo ""
echo "🌐 L'application sera accessible sur:"
echo "   - https://myjourney.grant-thronton.fr"
echo "   - https://10.100.6.40"
echo ""
