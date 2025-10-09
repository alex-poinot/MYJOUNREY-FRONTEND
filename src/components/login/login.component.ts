import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <!--<div class="logo-robot">🤖</div>-->
            <div class="logo-robot"><img src="/assets/images/logo_MyJourney.png" alt="Logo MyJourney"></div>
            <h1 class="brand-title">MyJourney</h1>
          </div>
          <h2>Connexion requise</h2>
          <p>Connectez-vous avec votre compte Microsoft pour accéder à l'application</p>
        </div>
        
        <div class="login-content">
          <button class="login-btn" (click)="login()" [disabled]="isLoading">
            <i class="fab fa-microsoft" *ngIf="!isLoading"></i>
            <div class="spinner" *ngIf="isLoading"></div>
            {{ isLoading ? 'Connexion en cours...' : 'Se connecter avec Microsoft' }}
          </button>
          
          <div class="login-info">
            <div class="info-item">
              <i class="fas fa-shield-alt"></i>
              <span>Connexion sécurisée via Azure AD</span>
            </div>
            <div class="info-item">
              <i class="fas fa-user-check"></i>
              <span>Authentification unique (SSO)</span>
            </div>
            <div class="info-item">
              <i class="fas fa-lock"></i>
              <span>Vos données sont protégées</span>
            </div>
          </div>
        </div>
        
        <div class="login-footer">
          <p>© 2025 MyJourney - Grant Thornton</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: var(--shadow-xl);
      padding: 40px;
      max-width: 450px;
      width: 100%;
      text-align: center;
    }

    .login-header {
      margin-bottom: 32px;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .logo-robot img {
      width: 2.5vw;
      height: auto;
    }

    .brand-title {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .login-header h2 {
      color: var(--gray-800);
      margin: 0 0 12px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .login-header p {
      color: var(--gray-600);
      margin: 0;
      font-size: 16px;
      line-height: 1.5;
    }

    .login-content {
      margin-bottom: 32px;
    }

    .login-btn {
      width: 100%;
      background: #0078d4;
      color: white;
      border: none;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .login-btn:hover:not(:disabled) {
      background: #106ebe;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .login-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--gray-600);
      font-size: 14px;
    }

    .info-item i {
      color: var(--primary-color);
      width: 20px;
      text-align: center;
    }

    .login-footer {
      border-top: 1px solid var(--gray-200);
      padding-top: 20px;
    }

    .login-footer p {
      color: var(--gray-500);
      font-size: 12px;
      margin: 0;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 24px;
        margin: 0 16px;
      }
      
      .brand-title {
        font-size: 24px;
      }
      
      .login-header h2 {
        font-size: 20px;
      }
    }
  `]
})
export class LoginComponent {
  isLoading = false;

  constructor(private authService: AuthService) {}

  async login(): Promise<void> {
    console.log('🔐 Tentative de connexion...');
    this.isLoading = true;
    try {
      await this.authService.login();
      console.log('✅ Connexion réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      alert('Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      this.isLoading = false;
    }
  }
}