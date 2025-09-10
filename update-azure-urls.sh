#!/bin/bash

echo "🔧 Mise à jour des URLs Azure AD pour HTTPS"
echo "=========================================="

# Mettre à jour l'environnement staging pour HTTPS
cat > src/environments/environment.staging.ts << 'EOF'
// Configuration pour l'environnement de recette avec HTTPS
export const environment = {
  production: false,
  name: 'staging',
  apiUrl: 'https://10.100.9.40:3000',
  azure: {
    clientId: '61afef70-d6d1-45cd-a015-82063f882824',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'https://10.100.9.40/',
    postLogoutRedirectUri: 'https://10.100.9.40/'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false  // Authentification Azure AD activée avec HTTPS
  }
};
EOF

echo "✅ URLs mises à jour pour HTTPS"
echo "📋 Changements:"
echo "   - redirectUri: https://10.100.9.40/"
echo "   - postLogoutRedirectUri: https://10.100.9.40/"
echo "   - apiUrl: https://10.100.9.40:3000"
echo ""
echo "⚠️  IMPORTANT: Vous devez également mettre à jour la configuration"
echo "   dans Azure AD Portal avec ces nouvelles URLs HTTPS:"
echo ""
echo "   1. Allez sur https://portal.azure.com"
echo "   2. Azure Active Directory → App registrations"
echo "   3. Trouvez 'GT-MyJourney-RCT'"
echo "   4. Authentication → Redirect URIs"
echo "   5. Remplacez http://10.100.9.40/ par https://10.100.9.40/"
echo "   6. Sauvegardez"