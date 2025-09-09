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

export function MSALInstanceFactory(): PublicClientApplication {
  return new PublicClientApplication(msalConfig);
}

export function initializeMsal(msalService: MsalService): () => Promise<void> {
  return () => {
    return new Promise<void>((resolve) => {
      if (environment.features.skipAuthentication) {
        // Mode Bolt : pas d'initialisation MSAL
        resolve();
      } else {
        msalService.instance.initialize().then(() => {
          msalService.handleRedirectObservable().subscribe(() => {
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
    <app-login *ngIf="!isAuthenticated && !isBoltMode"></app-login>
    
    <!-- Application principale si authentifié -->
    <div class="app-container" *ngIf="isAuthenticated || isBoltMode">
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
  isBoltMode = environment.features.skipAuthentication;

  constructor(private authService: AuthService) {
    if (this.isBoltMode) {
      // Mode Bolt : toujours authentifié
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
    ...(environment.features.skipAuthentication ? [] : [
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