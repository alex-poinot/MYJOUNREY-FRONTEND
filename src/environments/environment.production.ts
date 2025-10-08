// Configuration pour l'environnement de production
export const environment = {
  production: true,
  name: 'production',
  apiUrl: 'https://myjourney.grant-thornton.fr/api/myjourney',
  azure: {
    clientId: 'LFT8Q~xYFEeO-3qrnH-DpD-i1OZnaBp3xlynsbNo',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'https://myjourney.grant-thronton.fr',
    postLogoutRedirectUri: 'https://myjourney.grant-thronton.fr'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false
  }
};