import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  get apiUrl(): string {
    return environment.apiUrl;
  }
  
  get isProduction(): boolean {
    return environment.production;
  }
  
  get environmentName(): string {
    return environment.name;
  }
  
  get azureConfig() {
    return environment.azure;
  }
  
  get features() {
    return environment.features;
  }
  
  // Méthode utilitaire pour construire des URLs d'API
  buildApiUrl(endpoint: string): string {
    return `${this.apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }
  
  // Méthode pour logger conditionnellement
  log(message: string, ...args: any[]): void {
    if (environment.features.enableLogging) {
      console.log(`[${environment.name.toUpperCase()}] ${message}`, ...args);
    }
  }
  
  // Méthode pour les erreurs (toujours loggées)
  logError(message: string, error?: any): void {
    console.error(`[${environment.name.toUpperCase()}] ${message}`, error);
  }
}