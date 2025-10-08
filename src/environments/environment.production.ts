// Configuration pour l'environnement de production
export const environment = {
  production: true,
  name: 'production',
  apiUrl: 'https://api.myjourney.com',
  azure: {
    clientId: '634d3680-46b5-48e4-bdae-b7c6ed6b218a',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'https://myjourney.grant-thronton.fr',
    postLogoutRedirectUri: 'https://myjourney.grant-thronton.fr'
  },
  features: {
    enableLogging: false,
    enableDebugMode: false,
    enableMockData: false,
    skipAuthentication: false
  }
};