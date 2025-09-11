// Configuration pour l'environnement de recette
export const environment = {
  production: false,
  name: 'staging',
  apiUrl: 'https://myjourney-test.grant-thornton.fr/api/myjourney',
  azure: {
    clientId: '61afef70-d6d1-45cd-a015-82063f882824',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'https://myjourney-test.grant-thornton.fr/myjourney/',
    postLogoutRedirectUri: 'https://myjourney-test.grant-thornton.fr/myjourney/'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false  // Authentification Azure AD activée
  }
};