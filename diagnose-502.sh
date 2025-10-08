#!/bin/bash

# Script de diagnostic pour erreur 502 Bad Gateway
echo "🔍 Diagnostic MyJourney - Erreur 502 Bad Gateway"
echo "=================================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Vérifier que Docker est en cours d'exécution
echo -e "${BLUE}1. Vérification Docker${NC}"
echo "----------------------------"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas accessible${NC}"
    echo "Exécutez: sudo systemctl status docker"
    exit 1
else
    echo -e "${GREEN}✅ Docker est actif${NC}"
fi
echo ""

# 2. Vérifier l'état des conteneurs
echo -e "${BLUE}2. État des conteneurs${NC}"
echo "----------------------------"
CONTAINER_STATUS=$(docker ps -a --filter "name=myjourney-production" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
echo "$CONTAINER_STATUS"
echo ""

CONTAINER_RUNNING=$(docker ps --filter "name=myjourney-production" --format "{{.Names}}")
if [ -z "$CONTAINER_RUNNING" ]; then
    echo -e "${RED}❌ Le conteneur myjourney-production n'est pas en cours d'exécution${NC}"
    echo ""
    echo -e "${YELLOW}Logs du conteneur:${NC}"
    docker logs myjourney-production 2>&1 | tail -50
    echo ""
    echo -e "${YELLOW}💡 Solutions:${NC}"
    echo "   - Redémarrer: docker compose -f docker-compose.prod.yml restart"
    echo "   - Reconstruire: ./build-and-deploy-prod.sh"
    exit 1
else
    echo -e "${GREEN}✅ Le conteneur est actif${NC}"
fi
echo ""

# 3. Vérifier les ports utilisés
echo -e "${BLUE}3. Vérification des ports${NC}"
echo "----------------------------"
echo "Port 8080 (Application Docker):"
PORT_8080=$(netstat -tlnp 2>/dev/null | grep :8080 || ss -tlnp 2>/dev/null | grep :8080)
if [ -z "$PORT_8080" ]; then
    echo -e "${RED}❌ Port 8080 n'est pas en écoute${NC}"
    echo "Le conteneur Docker doit exposer le port 8080"
else
    echo -e "${GREEN}✅ Port 8080 en écoute${NC}"
    echo "$PORT_8080"
fi
echo ""

echo "Port 80 (Nginx reverse proxy):"
PORT_80=$(netstat -tlnp 2>/dev/null | grep :80 || ss -tlnp 2>/dev/null | grep :80)
if [ -z "$PORT_80" ]; then
    echo -e "${RED}❌ Port 80 n'est pas en écoute${NC}"
else
    echo -e "${GREEN}✅ Port 80 en écoute${NC}"
    echo "$PORT_80"
fi
echo ""

echo "Port 443 (HTTPS):"
PORT_443=$(netstat -tlnp 2>/dev/null | grep :443 || ss -tlnp 2>/dev/null | grep :443)
if [ -z "$PORT_443" ]; then
    echo -e "${RED}❌ Port 443 n'est pas en écoute${NC}"
else
    echo -e "${GREEN}✅ Port 443 en écoute${NC}"
    echo "$PORT_443"
fi
echo ""

# 4. Tester la connexion au conteneur Docker
echo -e "${BLUE}4. Test de connexion Docker (port 8080)${NC}"
echo "----------------------------"
DOCKER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>&1)
if [ "$DOCKER_RESPONSE" = "200" ] || [ "$DOCKER_RESPONSE" = "304" ]; then
    echo -e "${GREEN}✅ Le conteneur répond correctement (HTTP $DOCKER_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Le conteneur ne répond pas correctement (HTTP $DOCKER_RESPONSE)${NC}"
    echo ""
    echo -e "${YELLOW}Test avec curl détaillé:${NC}"
    curl -v http://localhost:8080 2>&1 | head -20
fi
echo ""

# 5. Vérifier la configuration Nginx du système
echo -e "${BLUE}5. Configuration Nginx système${NC}"
echo "----------------------------"
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx est installé${NC}"

    # Status Nginx
    echo ""
    echo "Status du service Nginx:"
    systemctl is-active nginx 2>/dev/null || echo "Service nginx non actif"

    # Test de la configuration
    echo ""
    echo "Test de la configuration Nginx:"
    sudo nginx -t 2>&1

    # Vérifier le site myjourney-prod-gt
    echo ""
    echo "Configuration du site myjourney-prod-gt:"
    if [ -f "/etc/nginx/sites-available/myjourney-prod-gt" ]; then
        echo -e "${GREEN}✅ Fichier de configuration existe${NC}"

        if [ -L "/etc/nginx/sites-enabled/myjourney-prod-gt" ]; then
            echo -e "${GREEN}✅ Site activé (lien symbolique présent)${NC}"
        else
            echo -e "${RED}❌ Site non activé (lien symbolique manquant)${NC}"
            echo -e "${YELLOW}💡 Activer avec: sudo ln -s /etc/nginx/sites-available/myjourney-prod-gt /etc/nginx/sites-enabled/${NC}"
        fi
    else
        echo -e "${RED}❌ Fichier de configuration manquant${NC}"
        echo "Attendu: /etc/nginx/sites-available/myjourney-prod-gt"
    fi
else
    echo -e "${RED}❌ Nginx n'est pas installé sur le système${NC}"
    echo -e "${YELLOW}💡 Installer avec: sudo apt install nginx${NC}"
fi
echo ""

# 6. Vérifier les certificats SSL
echo -e "${BLUE}6. Certificats SSL${NC}"
echo "----------------------------"
if [ -f "/etc/nginx/ssl/myjourney-gt.crt" ] && [ -f "/etc/nginx/ssl/myjourney-gt.key" ]; then
    echo -e "${GREEN}✅ Certificats SSL présents${NC}"
    echo "Certificat: /etc/nginx/ssl/myjourney-gt.crt"
    echo "Clé privée: /etc/nginx/ssl/myjourney-gt.key"

    echo ""
    echo "Informations du certificat:"
    openssl x509 -in /etc/nginx/ssl/myjourney-gt.crt -noout -subject -dates 2>/dev/null || echo "Impossible de lire le certificat"
else
    echo -e "${RED}❌ Certificats SSL manquants${NC}"
    echo "Attendus:"
    echo "  - /etc/nginx/ssl/myjourney-gt.crt"
    echo "  - /etc/nginx/ssl/myjourney-gt.key"
fi
echo ""

# 7. Logs Nginx système
echo -e "${BLUE}7. Logs Nginx (20 dernières lignes)${NC}"
echo "----------------------------"
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Erreurs Nginx:"
    sudo tail -20 /var/log/nginx/error.log
else
    echo "Fichier error.log non trouvé"
fi
echo ""

# 8. Logs du conteneur Docker
echo -e "${BLUE}8. Logs conteneur Docker (20 dernières lignes)${NC}"
echo "----------------------------"
docker logs myjourney-production 2>&1 | tail -20
echo ""

# 9. Test de connectivité depuis le serveur
echo -e "${BLUE}9. Tests de connectivité${NC}"
echo "----------------------------"
echo "Test localhost:8080 (Docker):"
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://localhost:8080 || echo "Échec"
echo ""

echo "Test 10.100.6.40:8080 (Docker via IP):"
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://10.100.6.40:8080 || echo "Échec"
echo ""

echo "Test 10.100.6.40 (Nginx):"
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://10.100.6.40 || echo "Échec"
echo ""

# 10. Résumé et recommandations
echo -e "${BLUE}10. Résumé et recommandations${NC}"
echo "=============================="
echo ""

# Diagnostic automatique
ISSUES=()

if [ -z "$CONTAINER_RUNNING" ]; then
    ISSUES+=("Le conteneur Docker n'est pas en cours d'exécution")
fi

if [ -z "$PORT_8080" ]; then
    ISSUES+=("Le port 8080 n'est pas en écoute (conteneur Docker)")
fi

if [ -z "$PORT_443" ]; then
    ISSUES+=("Le port 443 n'est pas en écoute (HTTPS)")
fi

if ! systemctl is-active --quiet nginx 2>/dev/null; then
    ISSUES+=("Le service Nginx n'est pas actif")
fi

if [ ! -L "/etc/nginx/sites-enabled/myjourney-prod-gt" ]; then
    ISSUES+=("Le site Nginx n'est pas activé")
fi

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Aucun problème majeur détecté${NC}"
    echo ""
    echo "Le 502 peut être causé par:"
    echo "  1. Un redémarrage récent - attendez quelques secondes"
    echo "  2. Une configuration proxy_pass incorrecte dans Nginx"
    echo "  3. Un problème de réseau entre Nginx et Docker"
else
    echo -e "${RED}❌ Problèmes détectés:${NC}"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    echo ""
    echo -e "${YELLOW}💡 Actions recommandées:${NC}"

    if [ -z "$CONTAINER_RUNNING" ]; then
        echo "  1. Redémarrer le conteneur:"
        echo "     docker compose -f docker-compose.prod.yml restart"
    fi

    if ! systemctl is-active --quiet nginx 2>/dev/null; then
        echo "  2. Démarrer Nginx:"
        echo "     sudo systemctl start nginx"
    fi

    if [ ! -L "/etc/nginx/sites-enabled/myjourney-prod-gt" ]; then
        echo "  3. Activer le site:"
        echo "     sudo ln -s /etc/nginx/sites-available/myjourney-prod-gt /etc/nginx/sites-enabled/"
        echo "     sudo nginx -t && sudo systemctl reload nginx"
    fi
fi

echo ""
echo -e "${BLUE}Diagnostic terminé${NC}"
