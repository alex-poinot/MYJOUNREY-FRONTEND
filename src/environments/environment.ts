// Configuration pour l'environnement de développement (local)
export const environment = {
  production: false,
  name: 'development',
  apiUrl: 'http://localhost:3000',
  azure: {
    clientId: '634d3680-46b5-48e4-bdae-b7c6ed6b218a',
    tenantId: 'e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200'
  },
  features: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    skipAuthentication: false
  }
};