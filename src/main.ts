import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { APP_INITIALIZER } from '@angular/core';
import { MSAL_INSTANCE, MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './auth/auth.config';
import { AuthService } from './services/auth.service';
import { NavbarComponent } from './components/navbar/navbar.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { NogEditorComponent } from './components/nog-editor/nog-editor.component';
import { LoginComponent } from './components/login/login.component';
import { environment } from './environments/environment';

// Ajout de logs pour le diagnostic
console.log('🚀 Démarrage de l\'application MyJourney');
console.log('📊 Environnement:', environment.name);

// Vérifier si l'API crypto est disponible (requis pour MSAL)
const isCryptoAvailable = () => {
  try {
    // Vérification complète de l'API crypto
    return !!(window.crypto && 
              window.crypto.subtle && 
              typeof window.crypto.subtle.digest === 'function' &&
              window.isSecureContext);
  } catch (e) {
    console.error('🚨 Erreur lors de la vérification crypto:', e);
    return false;
  }
};

const cryptoAvailable = isCryptoAvailable();
console.log('🔐 Crypto API disponible:', cryptoAvailable);
console.log('🔒 Contexte sécurisé:', window.isSecureContext);
console.log('🌐 Protocole:', window.location.protocol);

// Utiliser l'authentification Azure AD seulement si crypto est disponible
const shouldSkipAuth = environment.features.skipAuthentication || !cryptoAvailable;
console.log('⚠️ Mode sans authentification:', shouldSkipAuth);

export function MSALInstanceFactory(): PublicClientApplication {
  console.log('🔑 Initialisation MSAL...');
  const msalInstance = new PublicClientApplication(msalConfig);
  
  // Configuration spéciale pour l'environnement staging (HTTP)
  if (environment.name === 'staging') {
    console.log('⚠️ Configuration MSAL pour environnement staging (HTTP)');
    // Désactiver certaines vérifications crypto pour HTTP
    (msalInstance as any).config.system.allowNativeBroker = false;
  }
  
  return msalInstance;
}

export function initializeMsal(msalService: MsalService): () => Promise<void> {
  return () => {
    console.log('🔐 Configuration MSAL...');
    return new Promise<void>((resolve) => {
      const shouldSkipAuth = environment.features.skipAuthentication || !cryptoAvailable;
      if (shouldSkipAuth) {
        console.log('⚠️ Mode sans authentification activé (crypto:', cryptoAvailable, ')');
        resolve();
      } else {
        console.log('🔒 Initialisation authentification Azure AD...');
        msalService.instance.initialize().then(() => {
          msalService.handleRedirectObservable().subscribe(() => {
            console.log('✅ MSAL initialisé avec succès');
            resolve();
          });
        });
      }
    });
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NavbarComponent, DashboardComponent, NogEditorComponent, LoginComponent],
  template: `
    <!-- Page de connexion si non authentifié -->
    <app-login *ngIf="!isAuthenticated && !shouldSkipAuth"></app-login>
    
    <!-- Application principale si authentifié -->
    <div class="app-container" *ngIf="isAuthenticated || shouldSkipAuth">
      <app-navbar 
        [activeTab]="currentTab"
        (tabChange)="onTabSelected($event)">
      </app-navbar>
      <main class="main-content">
        <app-dashboard *ngIf="currentTab === 'dashboard'"></app-dashboard>
        <app-nog-editor *ngIf="currentTab === 'NOG'"></app-nog-editor>
        <div *ngIf="currentTab !== 'dashboard' && currentTab !== 'NOG'" class="coming-soon">
          <h2>{{ currentTab }}</h2>
          <p>Cette fonctionnalité sera bientôt disponible.</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: calc(100vh - 8vh);
    }
    
    .main-content {
      margin-top: 8vh;
      background: #f8fafc;
      min-height: calc(100vh - 8vh);
    }
    
    .coming-soon {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      padding: 20px;
    }
    
    .coming-soon h2 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .coming-soon p {
      color: #666;
      font-size: 16px;
    }
  `]
})
export class AppComponent {
  currentTab = 'dashboard';
  isAuthenticated = false;
  shouldSkipAuth = environment.features.skipAuthentication || !cryptoAvailable;

  constructor(private authService: AuthService) {
    console.log('🎯 AppComponent - shouldSkipAuth:', this.shouldSkipAuth);
    
    if (this.shouldSkipAuth) {
      // Mode sans authentification : toujours authentifié
      this.isAuthenticated = true;
    } else {
      // Mode normal : écouter les changements d'état d'authentification
      this.authService.isAuthenticated$.subscribe(authenticated => {
        this.isAuthenticated = authenticated;
      });
    }
  }

  onTabSelected(tab: string) {
    this.currentTab = tab;
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    ...(environment.features.skipAuthentication || !cryptoAvailable ? [] : [
      {
        provide: MSAL_INSTANCE,
        useFactory: MSALInstanceFactory
      },
      MsalService,
      MsalBroadcastService,
      {
        provide: APP_INITIALIZER,
        useFactory: initializeMsal,
        deps: [MsalService],
        multi: true
      }
    ]),
    AuthService
  ]
});