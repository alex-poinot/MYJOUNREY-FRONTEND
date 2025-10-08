#!/bin/bash

# Script de diagnostic pour le problème 502 Bad Gateway
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Diagnostic 502 Bad Gateway - MyJourney Production    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour afficher les erreurs
error() {
    echo -e "${RED}❌ ERREUR: $1${NC}"
}

# Fonction pour afficher les succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher les informations
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour afficher les avertissements
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "${BLUE}═══ 1. Vérification des conteneurs Docker ═══${NC}"

# Vérifier si le conteneur existe et son état
CONTAINER_NAME="myjourney-production"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        success "Conteneur '$CONTAINER_NAME' en cours d'exécution"
        
        # Vérifier les ports
        CONTAINER_PORTS=$(docker port $CONTAINER_NAME 2>/dev/null || echo "Aucun port exposé")
        info "Ports du conteneur: $CONTAINER_PORTS"
        
        # Vérifier les logs du conteneur
        info "Dernières lignes des logs du conteneur:"
        docker logs --tail=10 $CONTAINER_NAME
        
    else
        error "Conteneur '$CONTAINER_NAME' arrêté"
        info "État du conteneur:"
        docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        info "Logs du conteneur arrêté:"
        docker logs --tail=20 $CONTAINER_NAME
    fi
else
    error "Conteneur '$CONTAINER_NAME' introuvable"
    info "Conteneurs disponibles:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

echo ""
echo -e "${BLUE}═══ 2. Test de connectivité vers le conteneur ═══${NC}"

# Test direct du conteneur sur le port 8080
info "Test de connectivité vers le conteneur (port 8080)..."
if curl -f -s -o /dev/null --max-time 5 http://localhost:8080; then
    success "Conteneur accessible sur le port 8080"
else
    error "Conteneur non accessible sur le port 8080"
    
    # Vérifier si le port est en écoute
    if netstat -tuln 2>/dev/null | grep -q ":8080 "; then
        warning "Port 8080 en écoute mais ne répond pas"
    else
        error "Port 8080 non en écoute"
    fi
fi

echo ""
echo -e "${BLUE}═══ 3. Vérification de la configuration Nginx ═══${NC}"

# Vérifier la configuration Nginx
NGINX_CONFIG="/etc/nginx/sites-available/myjourney-prod-gt"
if [ -f "$NGINX_CONFIG" ]; then
    success "Configuration Nginx trouvée"
    
    # Vérifier la syntaxe
    if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
        success "Configuration Nginx valide"
    else
        error "Erreur de syntaxe dans la configuration Nginx"
        sudo nginx -t
    fi
    
    # Vérifier les upstreams dans la config
    info "Vérification des upstreams dans la configuration:"
    grep -n "proxy_pass\|upstream" "$NGINX_CONFIG" || echo "Aucun upstream trouvé"
    
else
    error "Configuration Nginx manquante: $NGINX_CONFIG"
fi

echo ""
echo -e "${BLUE}═══ 4. Vérification des logs Nginx ═══${NC}"

# Logs d'erreur Nginx
if [ -f /var/log/nginx/error.log ]; then
    info "Dernières erreurs Nginx:"
    sudo tail -10 /var/log/nginx/error.log | grep -E "(error|502|upstream)" || echo "Aucune erreur 502 récente"
else
    warning "Fichier de log Nginx introuvable"
fi

# Logs d'accès Nginx
if [ -f /var/log/nginx/access.log ]; then
    info "Derniers accès avec erreur 502:"
    sudo tail -20 /var/log/nginx/access.log | grep " 502 " || echo "Aucun accès 502 récent"
else
    warning "Fichier de log d'accès Nginx introuvable"
fi

echo ""
echo -e "${BLUE}═══ 5. Vérification des ports et processus ═══${NC}"

# Vérifier les ports en écoute
info "Ports en écoute sur le système:"
sudo netstat -tuln | grep -E ":80 |:443 |:8080 " || echo "Aucun port web en écoute"

# Vérifier les processus Nginx
info "Processus Nginx:"
ps aux | grep nginx | grep -v grep || echo "Aucun processus Nginx"

echo ""
echo -e "${BLUE}═══ 6. Test de résolution DNS ═══${NC}"

# Test de résolution DNS
info "Test de résolution DNS:"
nslookup myjourney.grant-thornton.fr || echo "Résolution DNS échouée"

echo ""
echo -e "${BLUE}═══ RECOMMANDATIONS ═══${NC}"
echo ""
echo "1. Redémarrer le conteneur Docker:"
echo "   docker compose -f docker-compose.prod.yml restart"
echo ""
echo "2. Vérifier les logs en temps réel:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "3. Redémarrer Nginx:"
echo "   sudo systemctl restart nginx"
echo ""
echo "4. Vérifier la configuration du port dans docker-compose.prod.yml"
echo ""
echo "5. Si le problème persiste, reconstruire l'image:"
echo "   docker compose -f docker-compose.prod.yml down"
echo "   docker compose -f docker-compose.prod.yml build --no-cache"
echo "   docker compose -f docker-compose.prod.yml up -d"