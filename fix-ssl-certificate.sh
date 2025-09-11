#!/bin/bash

echo "🔒 Correction du problème de certificat SSL"
echo "=========================================="

# Solution 1: Régénérer un certificat SSL avec des paramètres corrects
echo "🔑 Régénération du certificat SSL avec des paramètres corrects..."

# Supprimer l'ancien certificat
sudo rm -f /etc/nginx/ssl/myjourney.crt
sudo rm -f /etc/nginx/ssl/myjourney.key

# Créer un fichier de configuration pour le certificat
sudo tee /tmp/ssl.conf > /dev/null << 'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=FR
ST=France
L=Paris
O=Grant Thornton
OU=IT Department
CN=10.100.9.40

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = 10.100.9.40
IP.1 = 10.100.9.40
DNS.2 = localhost
IP.2 = 127.0.0.1
EOF

# Générer le nouveau certificat avec SAN (Subject Alternative Names)
echo "🔐 Génération du nouveau certificat SSL..."
sudo openssl req -new -x509 -days 365 -nodes \
    -out /etc/nginx/ssl/myjourney.crt \
    -keyout /etc/nginx/ssl/myjourney.key \
    -config /tmp/ssl.conf \
    -extensions v3_req

# Vérifier le certificat généré
echo "🔍 Vérification du certificat généré..."
sudo openssl x509 -in /etc/nginx/ssl/myjourney.crt -text -noout | grep -A 3 "Subject Alternative Name"

# Nettoyer le fichier temporaire
sudo rm -f /tmp/ssl.conf

# Redémarrer Nginx pour prendre en compte le nouveau certificat
echo "🔄 Redémarrage de Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Nouveau certificat SSL généré avec succès !"
echo ""
echo "🌐 Solutions pour accéder au site :"
echo ""
echo "1. 🔓 SOLUTION TEMPORAIRE (Recommandée) :"
echo "   - Allez sur https://10.100.9.40"
echo "   - Cliquez sur 'Avancé' ou 'Advanced'"
echo "   - Cliquez sur 'Continuer vers 10.100.9.40 (non sécurisé)'"
echo "   - Ou 'Proceed to 10.100.9.40 (unsafe)'"
echo ""
echo "2. 🔒 SOLUTION PERMANENTE :"
echo "   - Utilisez Firefox au lieu de Chrome (plus permissif)"
echo "   - Ou configurez un vrai certificat SSL (Let's Encrypt)"
echo ""
echo "3. 🚫 CONTOURNEMENT Chrome :"
echo "   - Lancez Chrome avec : --ignore-certificate-errors --ignore-ssl-errors"
echo "   - Ou utilisez le mode navigation privée"
echo ""
echo "4. 📱 TEST RAPIDE :"
echo "   - Testez d'abord : http://10.100.9.40/test"
echo "   - Puis : https://10.100.9.40/test"