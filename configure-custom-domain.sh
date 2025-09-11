#!/bin/bash

echo "🌐 Configuration du domaine ec-test.grant-thornton.fr/myjourney/"
echo "============================================================"

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "🔹 $1"
    echo "----------------------------------------"
}

step "1. ARRÊT DES SERVICES"
sudo systemctl stop nginx 2>/dev/null || true
docker compose down 2>/dev/null || true

step "2. CONFIGURATION DU FICHIER HOSTS"
echo "Configuration du fichier hosts pour le domaine local..."
if ! grep -q "ec-test.grant-thornton.fr" /etc/hosts; then
    echo "127.0.0.1 ec-test.grant-thornton.fr" | sudo tee -a /etc/hosts
    echo "10.100.9.40 ec-test.grant-thornton.fr" | sudo tee -a /etc/hosts
    echo "✅ Domaine ajouté au fichier hosts"
else
    echo "✅ Domaine déjà présent dans hosts"
fi

step "3. GÉNÉRATION DU CERTIFICAT SSL POUR LE DOMAINE"
sudo mkdir -p /etc/nginx/ssl

# Créer un fichier de configuration SSL pour le domaine personnalisé
sudo tee /tmp/ssl-custom-domain.conf > /dev/null << 'EOF'
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
O=Grant Thornton France
OU=Digital Solutions
CN=ec-test.grant-thornton.fr
emailAddress=admin@grant-thornton.fr

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ec-test.grant-thornton.fr
DNS.2 = localhost
IP.1 = 127.0.0.1
IP.2 = 10.100.9.40
EOF

# Générer le certificat SSL pour le domaine personnalisé
echo "🔐 Génération du certificat SSL pour ec-test.grant-thornton.fr..."
sudo openssl req -new -x509 -days 3650 -nodes \
    -out /etc/nginx/ssl/ec-test-gt.crt \
    -keyout /etc/nginx/ssl/ec-test-gt.key \
    -config /tmp/ssl-custom-domain.conf \
    -extensions v3_req

sudo chmod 644 /etc/nginx/ssl/ec-test-gt.crt
sudo chmod 600 /etc/nginx/ssl/ec-test-gt.key
sudo rm -f /tmp/ssl-custom-domain.conf

echo "✅ Certificat SSL généré pour ec-test.grant-thornton.fr (valide 10 ans)"

step "4. CONFIGURATION NGINX POUR LE DOMAINE ET SOUS-CHEMIN"
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/myjourney*

# Configuration Nginx avec sous-chemin /myjourney/
sudo tee /etc/nginx/sites-available/ec-test-gt > /dev/null << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name ec-test.grant-thornton.fr;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS pour Grant Thornton avec sous-chemin
server {
    listen 443 ssl http2;
    server_name ec-test.grant-thornton.fr;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/ec-test-gt.crt;
    ssl_certificate_key /etc/nginx/ssl/ec-test-gt.key;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité pour MSAL
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Redirection racine vers /myjourney/
    location = / {
        return 301 https://$server_name/myjourney/;
    }
    
    # Page de test
    location /test {
        return 200 "Grant Thornton MyJourney Server OK\n";
        add_header Content-Type text/plain;
    }
    
    # Configuration pour l'application MyJourney
    location /myjourney/ {
        # Supprimer le préfixe /myjourney/ avant de proxy vers Docker
        rewrite ^/myjourney/(.*)$ /$1 break;
        
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header X-Forwarded-Prefix /myjourney;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffers
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Gestion des assets statiques avec le bon chemin
    location /myjourney/assets/ {
        rewrite ^/myjourney/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        
        # Cache pour les assets
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/ec-test-gt /etc/nginx/sites-enabled/

echo "✅ Configuration Nginx créée pour ec-test.grant-thornton.fr/myjourney/"

step "5. MISE À JOUR DE LA CONFIGURATION ANGULAR"
echo "Mise à jour de la configuration Angular pour le nouveau domaine et sous-chemin..."

# Mettre à jour l'environnement staging
cat > src/environments/environment.staging.ts << 'EOF'
// Configuration pour l'environnement de recette avec domaine personnalisé
export const environment = {
  production: false,
  name: 'staging',
  apiUrl: 'https://ec-test.grant-thornton.fr:3000',
  azure: {
    clientId: '61afef70-d6d1-45cd-a015-82063f882824',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'https://ec-test.grant-thornton.fr/myjourney/',
    postLogoutRedirectUri: 'https://ec-test.grant-thornton.fr/myjourney/'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false
  }
};
EOF

# Mettre à jour angular.json pour le base href
cat > angular.json << 'EOF'
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "cli": {
    "analytics": "1e1de97b-a744-405a-8b5a-0397bb3d01ce"
  },
  "newProjectRoot": "projects",
  "projects": {
    "demo": {
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "configurations": {
            "development": {
              "extractLicenses": false,
              "namedChunks": true,
              "optimization": false,
              "sourceMap": true,
              "baseHref": "/",
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.ts"
                }
              ]
            },
            "staging": {
              "extractLicenses": true,
              "namedChunks": false,
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": false,
              "baseHref": "/myjourney/",
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.staging.ts"
                }
              ]
            },
            "production": {
              "aot": true,
              "extractLicenses": true,
              "namedChunks": false,
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": false,
              "baseHref": "/myjourney/",
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.production.ts"
                }
              ]
            },
            "bolt": {
              "extractLicenses": false,
              "namedChunks": true,
              "optimization": false,
              "sourceMap": true,
              "baseHref": "/",
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.bolt.ts"
                }
              ]
            }
          },
          "options": {
            "assets": [],
            "index": "src/index.html",
            "browser": "src/main.ts",
            "outputPath": "dist/demo",
            "polyfills": ["zone.js"],
            "scripts": [],
            "styles": ["src/global_styles.css"],
            "tsConfig": "tsconfig.app.json"
          }
        },
        "serve": {
          "builder": "@angular/build:dev-server",
          "configurations": {
            "development": {
              "buildTarget": "demo:build:development"
            },
            "staging": {
              "buildTarget": "demo:build:staging"
            },
            "bolt": {
              "buildTarget": "demo:build:bolt"
            },
            "production": {
              "buildTarget": "demo:build:production"
            }
          },
          "defaultConfiguration": "development"
        }
      },
      "prefix": "app",
      "projectType": "application",
      "root": "",
      "schematics": {},
      "sourceRoot": "src"
    }
  },
  "version": 1
}
EOF

# Mettre à jour index.html avec le bon base href
sed -i 's|<base href="/">|<base href="/myjourney/">|g' src/index.html

echo "✅ Configuration Angular mise à jour"

step "6. TEST DE LA CONFIGURATION NGINX"
if sudo nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
    sudo nginx -t
    exit 1
fi

step "7. DÉMARRAGE DES SERVICES"
# Démarrer Nginx
if sudo systemctl start nginx; then
    echo "✅ Nginx démarré"
    sudo systemctl enable nginx
else
    echo "❌ Échec du démarrage de Nginx"
    exit 1
fi

# Rebuild et démarrer Docker avec la nouvelle configuration
echo "🐳 Rebuild de l'application avec la nouvelle configuration..."
docker compose up -d --build

echo "⏳ Attente du démarrage (30 secondes)..."
sleep 30

step "8. TESTS DE CONNECTIVITÉ"

echo "🧪 Test 1: Page de test HTTP"
if curl -s http://ec-test.grant-thornton.fr/test | grep -q "Grant Thornton"; then
    echo "✅ HTTP fonctionne (redirection vers HTTPS)"
else
    echo "❌ HTTP ne fonctionne pas"
fi

echo ""
echo "🧪 Test 2: Page de test HTTPS"
if curl -k -s https://ec-test.grant-thornton.fr/test | grep -q "Grant Thornton"; then
    echo "✅ HTTPS fonctionne"
else
    echo "❌ HTTPS ne fonctionne pas"
fi

echo ""
echo "🧪 Test 3: Application MyJourney"
if curl -k -s https://ec-test.grant-thornton.fr/myjourney/ | grep -q -E "(html|DOCTYPE)"; then
    echo "✅ Application MyJourney accessible"
else
    echo "❌ Application MyJourney non accessible"
fi

echo ""
echo "🧪 Test 4: Redirection racine"
if curl -s -I http://ec-test.grant-thornton.fr/ | grep -q "301"; then
    echo "✅ Redirection racine fonctionne"
else
    echo "❌ Redirection racine ne fonctionne pas"
fi

step "9. INFORMATIONS FINALES"

echo ""
echo "🎉 CONFIGURATION TERMINÉE !"
echo "=========================="
echo ""
echo "🌐 Votre application MyJourney est maintenant accessible via :"
echo "   👉 https://ec-test.grant-thornton.fr/myjourney/"
echo ""
echo "🔧 URLs de test :"
echo "   - https://ec-test.grant-thornton.fr/test"
echo "   - https://ec-test.grant-thornton.fr/ (redirige vers /myjourney/)"
echo ""
echo "⚠️  IMPORTANT - Mise à jour Azure AD Portal :"
echo "   1. Allez sur https://portal.azure.com"
echo "   2. Azure Active Directory → App registrations"
echo "   3. Trouvez votre application MyJourney"
echo "   4. Authentication → Redirect URIs"
echo "   5. Remplacez par : https://ec-test.grant-thornton.fr/myjourney/"
echo "   6. Logout URL : https://ec-test.grant-thornton.fr/myjourney/"
echo ""
echo "🔓 Dans votre navigateur :"
echo "   - Chrome : Tapez 'thisisunsafe' sur l'erreur SSL"
echo "   - Edge : F12 → Console → window.location.href = 'https://ec-test.grant-thornton.fr/myjourney/'"
echo "   - Firefox : Cliquez 'Avancé' → 'Accepter le risque'"
echo ""
echo "✅ L'application est prête avec authentification Azure AD !"