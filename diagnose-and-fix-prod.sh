#!/bin/bash

# Script de diagnostic et réparation pour l'environnement de production MyJourney
# Ce script analyse et résout automatiquement les problèmes courants

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MyJourney Production - Diagnostic et Réparation      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour afficher les erreurs
error() {
    echo -e "${RED}❌ ERREUR: $1${NC}"
}

# Fonction pour afficher les avertissements
warning() {
    echo -e "${YELLOW}⚠️  ATTENTION: $1${NC}"
}

# Fonction pour afficher les succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher les informations
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Compteur de problèmes
ISSUES_FOUND=0
ISSUES_FIXED=0

# ==============================================================================
# 1. VÉRIFICATION DOCKER
# ==============================================================================
echo -e "\n${BLUE}═══ 1. Vérification Docker ═══${NC}"

if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    info "Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    success "Docker installé avec succès"
    ISSUES_FIXED=$((ISSUES_FIXED + 1))
else
    success "Docker est installé"
fi

if ! docker info > /dev/null 2>&1; then
    warning "Permissions Docker insuffisantes"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    info "Ajout de l'utilisateur au groupe docker..."
    sudo usermod -aG docker $USER
    warning "Vous devez vous reconnecter pour appliquer les changements: newgrp docker"
else
    success "Permissions Docker OK"
fi

# Vérifier que Docker Compose est disponible
if ! docker compose version &> /dev/null; then
    error "Docker Compose n'est pas disponible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    success "Docker Compose est disponible ($(docker compose version))"
fi

# ==============================================================================
# 2. VÉRIFICATION NGINX
# ==============================================================================
echo -e "\n${BLUE}═══ 2. Vérification Nginx ═══${NC}"

if ! command -v nginx &> /dev/null; then
    error "Nginx n'est pas installé"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    info "Installation de Nginx..."
    sudo apt update
    sudo apt install -y nginx
    success "Nginx installé avec succès"
    ISSUES_FIXED=$((ISSUES_FIXED + 1))
else
    success "Nginx est installé ($(nginx -v 2>&1))"
fi

# Vérifier que Nginx est en cours d'exécution
if ! systemctl is-active --quiet nginx; then
    warning "Nginx n'est pas en cours d'exécution"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    info "Démarrage de Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    success "Nginx démarré avec succès"
    ISSUES_FIXED=$((ISSUES_FIXED + 1))
else
    success "Nginx est en cours d'exécution"
fi

# ==============================================================================
# 3. VÉRIFICATION DE LA CONFIGURATION NGINX
# ==============================================================================
echo -e "\n${BLUE}═══ 3. Vérification de la configuration Nginx ═══${NC}"

NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/myjourney-prod-gt"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/myjourney-prod-gt"
PROJECT_NGINX_CONFIG="./etc/nginx/sites-available/myjourney-prod-gt"

# Vérifier que le fichier de configuration existe dans le projet
if [ ! -f "$PROJECT_NGINX_CONFIG" ]; then
    error "Fichier de configuration Nginx manquant: $PROJECT_NGINX_CONFIG"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    success "Fichier de configuration Nginx trouvé dans le projet"

    # Copier la configuration vers sites-available
    if [ ! -f "$NGINX_SITE_AVAILABLE" ]; then
        warning "Configuration Nginx absente de sites-available"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        info "Copie de la configuration Nginx..."
        sudo mkdir -p /etc/nginx/sites-available
        sudo cp "$PROJECT_NGINX_CONFIG" "$NGINX_SITE_AVAILABLE"
        success "Configuration copiée vers sites-available"
        ISSUES_FIXED=$((ISSUES_FIXED + 1))
    else
        # Vérifier si la configuration a changé
        if ! sudo diff -q "$PROJECT_NGINX_CONFIG" "$NGINX_SITE_AVAILABLE" > /dev/null 2>&1; then
            warning "Configuration Nginx différente de celle du projet"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
            info "Mise à jour de la configuration Nginx..."
            sudo cp "$PROJECT_NGINX_CONFIG" "$NGINX_SITE_AVAILABLE"
            success "Configuration mise à jour"
            ISSUES_FIXED=$((ISSUES_FIXED + 1))
        else
            success "Configuration Nginx à jour"
        fi
    fi

    # Activer le site
    if [ ! -L "$NGINX_SITE_ENABLED" ]; then
        warning "Site Nginx non activé"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        info "Activation du site..."
        sudo mkdir -p /etc/nginx/sites-enabled
        sudo ln -sf "$NGINX_SITE_AVAILABLE" "$NGINX_SITE_ENABLED"
        success "Site activé"
        ISSUES_FIXED=$((ISSUES_FIXED + 1))
    else
        success "Site Nginx activé"
    fi
fi

# Vérifier la syntaxe de la configuration Nginx
if ! sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    error "Erreur de syntaxe dans la configuration Nginx"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    sudo nginx -t
else
    success "Configuration Nginx valide"
fi

# ==============================================================================
# 4. VÉRIFICATION DES CERTIFICATS SSL
# ==============================================================================
echo -e "\n${BLUE}═══ 4. Vérification des certificats SSL ═══${NC}"

SSL_CERT="/etc/nginx/ssl/myjourney-prod-gt.crt"
SSL_KEY="/etc/nginx/ssl/myjourney-prod-gt.key"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    error "Certificats SSL manquants"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    info "Génération d'un certificat SSL auto-signé..."

    # Créer le répertoire SSL
    sudo mkdir -p /etc/nginx/ssl

    # Générer un certificat auto-signé
    sudo openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$SSL_KEY" \
        -out "$SSL_CERT" \
        -subj "/C=FR/ST=Ile-de-France/L=Paris/O=Grant Thornton/OU=IT/CN=myjourney.grant-thornton.fr" \
        -addext "subjectAltName=DNS:myjourney.grant-thornton.fr,DNS:www.myjourney.grant-thornton.fr" \
        2>/dev/null

    # Configurer les permissions
    sudo chmod 644 "$SSL_CERT"
    sudo chmod 600 "$SSL_KEY"
    sudo chown root:root "$SSL_CERT" "$SSL_KEY"

    success "Certificat SSL auto-signé généré"
    warning "Certificat auto-signé - Les navigateurs afficheront un avertissement"
    ISSUES_FIXED=$((ISSUES_FIXED + 1))
else
    success "Certificats SSL trouvés"

    # Vérifier la validité du certificat
    CERT_EXPIRY=$(sudo openssl x509 -enddate -noout -in "$SSL_CERT" 2>/dev/null | cut -d= -f2)
    if [ -n "$CERT_EXPIRY" ]; then
        info "Certificat expire le: $CERT_EXPIRY"

        # Vérifier si le certificat expire bientôt (dans moins de 30 jours)
        EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

        if [ $DAYS_UNTIL_EXPIRY -lt 30 ] && [ $DAYS_UNTIL_EXPIRY -gt 0 ]; then
            warning "Le certificat SSL expire dans $DAYS_UNTIL_EXPIRY jours"
        elif [ $DAYS_UNTIL_EXPIRY -le 0 ]; then
            error "Le certificat SSL a expiré!"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    fi
fi

# ==============================================================================
# 5. VÉRIFICATION DU CONTENEUR DOCKER
# ==============================================================================
echo -e "\n${BLUE}═══ 5. Vérification du conteneur Docker ═══${NC}"

CONTAINER_NAME="myjourney-production"

if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    warning "Conteneur '$CONTAINER_NAME' introuvable"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    info "Le conteneur sera créé lors du prochain déploiement"
else
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        success "Conteneur '$CONTAINER_NAME' en cours d'exécution"

        # Vérifier que le conteneur répond
        if curl -f -s http://localhost:8081 > /dev/null; then
            success "Conteneur répond sur le port 8081"
        else
            error "Conteneur ne répond pas sur le port 8081"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
            warning "Le conteneur doit peut-être être redémarré"
        fi
    else
        warning "Conteneur '$CONTAINER_NAME' arrêté"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        info "Démarrage du conteneur..."
        docker compose -f docker-compose.prod.yml up -d
        sleep 5

        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            success "Conteneur démarré avec succès"
            ISSUES_FIXED=$((ISSUES_FIXED + 1))
        else
            error "Échec du démarrage du conteneur"
            docker compose -f docker-compose.prod.yml logs --tail=50
        fi
    fi
fi

# ==============================================================================
# 6. VÉRIFICATION DES PORTS
# ==============================================================================
echo -e "\n${BLUE}═══ 6. Vérification des ports ═══${NC}"

# Port 80 (HTTP)
if sudo netstat -tuln | grep -q ":80 "; then
    success "Port 80 (HTTP) en écoute"
else
    warning "Port 80 (HTTP) non disponible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Port 443 (HTTPS)
if sudo netstat -tuln | grep -q ":443 "; then
    success "Port 443 (HTTPS) en écoute"
else
    warning "Port 443 (HTTPS) non disponible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Port 8081 (Docker)
if sudo netstat -tuln | grep -q ":8081 "; then
    success "Port 8081 (Docker) en écoute"
else
    warning "Port 8081 (Docker) non disponible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# ==============================================================================
# 7. TESTS DE CONNECTIVITÉ
# ==============================================================================
echo -e "\n${BLUE}═══ 7. Tests de connectivité ═══${NC}"

# Test Docker direct
info "Test du conteneur Docker (http://localhost:8081)..."
if curl -f -s -o /dev/null http://localhost:8081; then
    success "Conteneur Docker accessible"
else
    error "Conteneur Docker non accessible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Test IP locale
info "Test de l'IP locale (http://10.100.6.40)..."
if curl -f -s -o /dev/null http://10.100.6.40; then
    success "IP locale accessible"
else
    warning "IP locale non accessible (Nginx par défaut?)"
fi

# Test du path /myjourney/
info "Test du path /myjourney/ (http://10.100.6.40/myjourney/)..."
if curl -f -s -o /dev/null http://10.100.6.40/myjourney/; then
    success "Path /myjourney/ accessible"
else
    error "Path /myjourney/ non accessible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Test HTTPS (si certificat présent)
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    info "Test HTTPS (https://myjourney.grant-thornton.fr/test)..."
    if curl -f -s -k -o /dev/null https://myjourney.grant-thornton.fr/test 2>/dev/null; then
        success "HTTPS accessible"
    else
        warning "HTTPS non accessible (peut nécessiter une configuration DNS/réseau)"
    fi
fi

# ==============================================================================
# 8. VÉRIFICATION DES LOGS
# ==============================================================================
echo -e "\n${BLUE}═══ 8. Vérification des logs ═══${NC}"

# Logs Nginx
if [ -f /var/log/nginx/error.log ]; then
    ERROR_COUNT=$(sudo tail -100 /var/log/nginx/error.log | grep -c "error" || echo "0")
    if [ $ERROR_COUNT -gt 0 ]; then
        warning "$ERROR_COUNT erreurs trouvées dans les logs Nginx (dernières 100 lignes)"
        info "Dernières erreurs Nginx:"
        sudo tail -10 /var/log/nginx/error.log | grep "error"
    else
        success "Aucune erreur récente dans les logs Nginx"
    fi
fi

# Logs Docker
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    info "Dernières lignes des logs Docker:"
    docker compose -f docker-compose.prod.yml logs --tail=10
fi

# ==============================================================================
# 9. RECHARGEMENT DES SERVICES (SI NÉCESSAIRE)
# ==============================================================================
if [ $ISSUES_FIXED -gt 0 ]; then
    echo -e "\n${BLUE}═══ 9. Rechargement des services ═══${NC}"
    info "Rechargement de Nginx pour appliquer les changements..."

    if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
        sudo systemctl reload nginx
        success "Nginx rechargé avec succès"
    else
        error "Configuration Nginx invalide, rechargement annulé"
        sudo nginx -t
    fi
fi

# ==============================================================================
# RÉSUMÉ
# ==============================================================================
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      RÉSUMÉ                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    success "Aucun problème détecté ! ✨"
else
    warning "$ISSUES_FOUND problème(s) détecté(s)"
    success "$ISSUES_FIXED problème(s) corrigé(s)"

    REMAINING=$((ISSUES_FOUND - ISSUES_FIXED))
    if [ $REMAINING -gt 0 ]; then
        error "$REMAINING problème(s) nécessite(nt) une intervention manuelle"
    fi
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}INFORMATIONS DE DÉPLOIEMENT${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo "📍 URL de test interne:"
echo "   - http://10.100.6.40/myjourney/"
echo "   - http://10.100.6.40:8081 (direct Docker)"
echo ""
echo "🌐 URL de production:"
echo "   - https://myjourney.grant-thornton.fr/myjourney/"
echo ""
echo "🐳 Conteneur Docker:"
echo "   - Nom: $CONTAINER_NAME"
echo "   - Port: 8081"
echo ""
echo "📋 Commandes utiles:"
echo "   - Logs Docker: docker compose -f docker-compose.prod.yml logs -f"
echo "   - Logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo "   - Redémarrer Docker: docker compose -f docker-compose.prod.yml restart"
echo "   - Recharger Nginx: sudo systemctl reload nginx"
echo "   - Vérifier Nginx: sudo nginx -t"
echo ""

if [ $ISSUES_FOUND -gt $ISSUES_FIXED ]; then
    echo -e "${YELLOW}⚠️  Actions manuelles requises:${NC}"
    echo ""
    echo "1. Vérifier la configuration réseau et DNS"
    echo "2. Vérifier les règles de pare-feu (ports 80, 443, 8081)"
    echo ""
    echo "💡 Pour installer un certificat SSL officiel (Let's Encrypt):"
    echo "   sudo apt install certbot python3-certbot-nginx"
    echo "   sudo certbot --nginx -d myjourney.grant-thornton.fr"
    echo ""
fi

exit 0
