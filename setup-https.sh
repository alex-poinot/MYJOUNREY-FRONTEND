#!/bin/bash

echo "🔒 Configuration HTTPS pour MyJourney sur VM Ubuntu"
echo "=================================================="

# Vérifier les permissions sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Ce script nécessite les permissions sudo"
    exit 1
fi

# Installer Nginx et Certbot si pas déjà installés
echo "📦 Installation des dépendances..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Arrêter les conteneurs Docker temporairement
echo "⏸️ Arrêt temporaire des conteneurs Docker..."
docker compose down 2>/dev/null || true

# Créer la configuration Nginx pour HTTP (temporaire)
echo "⚙️ Configuration Nginx temporaire..."
sudo tee /etc/nginx/sites-available/myjourney > /dev/null << 'EOF'
server {
    listen 80;
    server_name 10.100.9.40;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/myjourney /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration Nginx
echo "🧪 Test de la configuration Nginx..."
if ! sudo nginx -t; then
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi

# Redémarrer Nginx
echo "🔄 Redémarrage de Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Modifiez docker-compose.yml pour utiliser le port 8080"
echo "2. Redémarrez les conteneurs Docker"
echo "3. Testez l'accès via Nginx"
echo ""
echo "🔧 Commandes à exécuter:"
echo "   ./update-docker-port.sh"
echo "   ./build-and-deploy.sh"
echo ""