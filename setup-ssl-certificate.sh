#!/bin/bash

# Script pour créer un certificat SSL auto-signé pour MyJourney Production
# Usage: sudo ./setup-ssl-certificate.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "   Configuration SSL pour MyJourney Production"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
DOMAIN="myjourney.grant-thornton.fr"
SSL_DIR="/etc/nginx/ssl"
CERT_FILE="$SSL_DIR/myjourney-prod-gt.crt"
KEY_FILE="$SSL_DIR/myjourney-prod-gt.key"
DAYS_VALID=365

# Vérification des permissions root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (utilisez sudo)"
    exit 1
fi

echo "═══ 1. Création du répertoire SSL ═══"
if [ ! -d "$SSL_DIR" ]; then
    mkdir -p "$SSL_DIR"
    echo "✅ Répertoire $SSL_DIR créé"
else
    echo "ℹ️  Répertoire $SSL_DIR existe déjà"
fi

echo ""
echo "═══ 2. Génération du certificat auto-signé ═══"
echo "ℹ️  Génération d'un certificat valide pour $DAYS_VALID jours..."

# Génération de la clé privée et du certificat
openssl req -x509 -nodes -days $DAYS_VALID \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=FR/ST=Ile-de-France/L=Paris/O=Grant Thornton/OU=IT/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN" \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Certificat généré avec succès"
else
    echo "❌ Erreur lors de la génération du certificat"
    exit 1
fi

echo ""
echo "═══ 3. Configuration des permissions ═══"
chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"
chown root:root "$CERT_FILE" "$KEY_FILE"
echo "✅ Permissions configurées"

echo ""
echo "═══ 4. Vérification du certificat ═══"
echo "ℹ️  Informations du certificat:"
openssl x509 -in "$CERT_FILE" -noout -subject -dates -issuer
echo ""

echo "═══ 5. Test de la configuration Nginx ═══"
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuration Nginx valide"
    echo ""
    echo "═══ 6. Rechargement de Nginx ═══"
    systemctl reload nginx
    echo "✅ Nginx rechargé avec succès"
else
    echo ""
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Configuration SSL terminée avec succès!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 Résumé:"
echo "  • Certificat: $CERT_FILE"
echo "  • Clé privée: $KEY_FILE"
echo "  • Domaine: $DOMAIN"
echo "  • Validité: $DAYS_VALID jours"
echo ""
echo "⚠️  IMPORTANT:"
echo "  Ce certificat est auto-signé. Les navigateurs afficheront"
echo "  un avertissement de sécurité. Pour la production, utilisez"
echo "  Let's Encrypt ou un certificat d'une autorité de certification."
echo ""
echo "🔗 Pour tester:"
echo "  https://$DOMAIN/myjourney/"
echo ""
