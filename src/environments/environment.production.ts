// Configuration pour l'environnement de production
export const environment = {
  production: true,
  name: 'production',
  apiUrl: 'https://myjourney.grant-thornton.fr/api/myjourney',
  apiUrlMyVision: 'https://ec.grant-thornton.fr/transformapi/api',
  azure: {
    clientId: 'c1a41f6c-3d28-45a0-bfde-a6fdd413b61b',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'https://myjourney.grant-thornton.fr/myjourney/',
    postLogoutRedirectUri: 'https://myjourney.grant-thornton.fr/myjourney/'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false
  }
};