#!/bin/bash

# Script de correction rapide pour le problème de port
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Correction rapide du problème de port 502            ║${NC}"
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

# Fonction pour afficher les erreurs
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Étape 1: Copier la configuration Nginx corrigée
info "Mise à jour de la configuration Nginx..."
sudo cp etc/nginx/sites-available/myjourney-prod-gt /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/myjourney-prod-gt /etc/nginx/sites-enabled/

# Étape 2: Tester la configuration Nginx
info "Test de la configuration Nginx..."
if sudo nginx -t; then
    success "Configuration Nginx valide"
else
    error "Configuration Nginx invalide"
    exit 1
fi

# Étape 3: Recharger Nginx
info "Rechargement de Nginx..."
sudo systemctl reload nginx

# Étape 4: Attendre un peu
info "Attente de la propagation des changements..."
sleep 3

# Étape 5: Tests de connectivité
info "Test de connectivité..."

# Test du conteneur direct
if curl -f -s -o /dev/null --max-time 5 http://localhost:8080; then
    success "✅ Conteneur accessible (http://localhost:8080)"
else
    error "❌ Conteneur non accessible"
fi

# Test via Nginx local
if curl -f -s -o /dev/null --max-time 5 http://localhost/myjourney/; then
    success "✅ Application accessible via Nginx local"
else
    error "❌ Application non accessible via Nginx local"
fi

# Test via IP
if curl -f -s -o /dev/null --max-time 5 http://10.100.6.40/myjourney/; then
    success "✅ Application accessible via IP (http://10.100.6.40/myjourney/)"
else
    error "❌ Application non accessible via IP"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 CORRECTION TERMINÉE                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "🌐 URLs de test:"
echo "   - Production: https://myjourney.grant-thornton.fr/myjourney/"
echo "   - IP directe: http://10.100.6.40/myjourney/"
echo ""
echo "📋 Si le problème persiste:"
echo "   - Vérifier les logs: sudo tail -f /var/log/nginx/error.log"
echo "   - Redémarrer le conteneur: docker compose -f docker-compose.prod.yml restart"
echo ""