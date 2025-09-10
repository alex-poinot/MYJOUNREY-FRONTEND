// Configuration pour l'environnement de recette
export const environment = {
  production: false,
  name: 'staging',
  apiUrl: 'http://10.100.9.40:3000',
  azure: {
    clientId: '61afef70-d6d1-45cd-a015-82063f882824',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'http://10.100.9.40/',
    postLogoutRedirectUri: 'http://10.100.9.40/'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false  // Authentification Azure AD activée
  }
};