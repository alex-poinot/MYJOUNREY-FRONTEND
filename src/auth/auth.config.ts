import { Configuration, LogLevel } from '@azure/msal-browser';
import { environment } from '../environments/environment';

export const msalConfig: Configuration = {
  auth: {
    clientId: environment.azure.clientId,
    authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
    redirectUri: environment.azure.redirectUri,
    postLogoutRedirectUri: environment.azure.postLogoutRedirectUri
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  },
  system: {
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string) => {
        if (environment.features.enableLogging) {
          console.log(message);
        }
      },
      logLevel: environment.production ? LogLevel.Error : LogLevel.Info,
      piiLoggingEnabled: false
    }
  }
};

export const loginRequest = {
  scopes: ['User.Read', 'profile', 'openid', 'email']
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphPhotoEndpoint: 'https://graph.microsoft.com/v1.0/me/photo/$value'
};