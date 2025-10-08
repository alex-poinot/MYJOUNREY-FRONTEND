#!/bin/bash

# Script de correction automatique pour le problème 502 Bad Gateway
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Correction automatique 502 Bad Gateway               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour afficher les informations
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour afficher les succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Étape 1: Arrêter les services
info "Arrêt des services existants..."
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# Étape 2: Nettoyer les conteneurs et images
info "Nettoyage des conteneurs et images..."
docker system prune -f
docker volume prune -f

# Étape 3: Copier la nouvelle configuration Nginx
info "Mise à jour de la configuration Nginx..."
sudo cp etc/nginx/sites-available/myjourney-prod-gt /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/myjourney-prod-gt /etc/nginx/sites-enabled/

# Étape 4: Tester la configuration Nginx
info "Test de la configuration Nginx..."
if sudo nginx -t; then
    success "Configuration Nginx valide"
else
    echo -e "${RED}❌ Configuration Nginx invalide${NC}"
    exit 1
fi

# Étape 5: Reconstruire et démarrer les conteneurs
info "Reconstruction de l'image Docker..."
docker compose -f docker-compose.prod.yml build --no-cache

info "Démarrage des conteneurs..."
docker compose -f docker-compose.prod.yml up -d

# Étape 6: Attendre que le conteneur soit prêt
info "Attente du démarrage du conteneur..."
sleep 15

# Étape 7: Vérifier que le conteneur répond
info "Test de connectivité du conteneur..."
for i in {1..10}; do
    if curl -f -s -o /dev/null --max-time 5 http://localhost:8081; then
        success "Conteneur accessible sur le port 8081"
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Conteneur non accessible après 10 tentatives${NC}"
            echo "Logs du conteneur:"
            docker compose -f docker-compose.prod.yml logs --tail=20
            exit 1
        fi
        echo "Tentative $i/10 - En attente..."
        sleep 3
    fi
done

# Étape 8: Démarrer Nginx
info "Démarrage de Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Étape 9: Tests finaux
info "Tests de connectivité finale..."
sleep 5

# Test du conteneur direct
if curl -f -s -o /dev/null --max-time 5 http://localhost:8081; then
    success "✅ Conteneur accessible (http://localhost:8081)"
else
    echo -e "${RED}❌ Conteneur non accessible${NC}"
fi

# Test via Nginx
if curl -f -s -o /dev/null --max-time 5 http://localhost/myjourney/; then
    success "✅ Application accessible via Nginx (http://localhost/myjourney/)"
else
    echo -e "${YELLOW}⚠️  Application non accessible via Nginx${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    CORRECTION TERMINÉE                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "🌐 URLs de test:"
echo "   - Conteneur direct: http://localhost:8081"
echo "   - Via Nginx: http://localhost/myjourney/"
echo "   - Production: https://myjourney.grant-thornton.fr/myjourney/"
echo ""
echo "📋 Commandes de diagnostic:"
echo "   - Logs conteneur: docker compose -f docker-compose.prod.yml logs -f"
echo "   - Logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo "   - État services: sudo systemctl status nginx"
echo ""