import { Injectable } from '@angular/core';
import { Optional } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult, AccountInfo } from '@azure/msal-browser';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { loginRequest, graphConfig } from '../auth/auth.config';
import { environment } from '../environments/environment';

export interface UserProfile {
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
  isAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private impersonatedEmailSubject = new BehaviorSubject<string | null>(null);
  public impersonatedEmail$ = this.impersonatedEmailSubject.asObservable();

  private originalUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public originalUser$ = this.originalUserSubject.asObservable();
  constructor(
    @Optional() private msalService: MsalService,
    private http: HttpClient
  ) {
    if (environment.features.skipAuthentication) {
      // Mode Bolt : simuler un utilisateur connecté
      this.simulateBoltUser();
    } else {
      this.checkAuthenticationStatus();
    }
  }

  private simulateBoltUser(): void {
    // Simuler un utilisateur pour Bolt
    const mockUser: UserProfile = {
      displayName: 'Utilisateur Bolt',
      mail: 'bolt.user@demo.com',
      userPrincipalName: 'bolt.user@demo.com',
      jobTitle: 'Développeur',
      department: 'IT',
      photoUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100'
    };
    
    this.isAuthenticatedSubject.next(true);
    this.userProfileSubject.next(mockUser);
  }

  private checkAuthenticationStatus(): void {
    if (!this.msalService) return;
    
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.isAuthenticatedSubject.next(true);
      // Charger le profil utilisateur de manière asynchrone
      this.loadUserProfile().catch(error => {
        console.error('Erreur lors du chargement du profil:', error);
      });
    }
  }

  async login(): Promise<void> {
    if (environment.features.skipAuthentication) {
      // Mode Bolt : déjà connecté
      return;
    }
    
    try {
      if (!this.msalService) {
        throw new Error('MSAL Service not available');
      }
      
      const result = await firstValueFrom(this.msalService.loginPopup(loginRequest));
      if (result) {
        this.msalService.instance.setActiveAccount(result.account);
        this.isAuthenticatedSubject.next(true);
        await this.loadUserProfile();
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  logout(): void {
    if (!environment.features.skipAuthentication && this.msalService) {
      this.msalService.logout();
    }
    this.isAuthenticatedSubject.next(false);
    this.userProfileSubject.next(null);
  }

  private async loadUserProfile(): Promise<void> {
    if (environment.features.skipAuthentication) {
      // Mode Bolt : profil déjà chargé
      return;
    }
    
    try {
      if (!this.msalService) return;
      
      const account = this.msalService.instance.getActiveAccount();
      if (!account) return;

      // Acquérir un token pour Microsoft Graph
      const tokenResponse = await firstValueFrom(this.msalService.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: account
      }));

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${tokenResponse.accessToken}`
      });

      // Récupérer les informations du profil
      const profile = await this.http.get<any>(graphConfig.graphMeEndpoint, { headers }).toPromise();
      
      // Récupérer la photo de profil
      let photoUrl = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100';
      try {
        const photoBlob = await this.http.get(graphConfig.graphPhotoEndpoint, { 
          headers, 
          responseType: 'blob' 
        }).toPromise();
        
        if (photoBlob) {
          photoUrl = URL.createObjectURL(photoBlob);
        }
      } catch (photoError) {
        console.log('Photo de profil non disponible, utilisation de l\'image par défaut');
      }

      const userProfile: UserProfile = {
        displayName: profile.displayName || profile.userPrincipalName,
        mail: profile.mail || profile.userPrincipalName,
        userPrincipalName: profile.userPrincipalName,
        jobTitle: profile.jobTitle,
        department: profile.department,
        photoUrl: photoUrl,
        isAdmin: this.isAdminUser(profile.mail || profile.userPrincipalName)
      };

      this.userProfileSubject.next(userProfile);
      // Sauvegarder l'utilisateur original
      if (!this.originalUserSubject.value) {
        this.originalUserSubject.next(userProfile);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  }

  private isAdminUser(email: string): boolean {
    const adminEmails = ['alexandre.poinot@fr.gt.com', 'rochelle.thevaseelan@fr.gt.com', 'romain.tetillon@fr.gt.com'];
    return adminEmails.includes(email.toLowerCase());
  }

  // Méthodes d'impersonation
  impersonateUser(email: string): void {
    if (!this.isCurrentUserAdmin()) {
      console.error('Seuls les administrateurs peuvent utiliser l\'impersonation');
      return;
    }
    
    this.impersonatedEmailSubject.next(email);
  }

  stopImpersonation(): void {
    this.impersonatedEmailSubject.next(null);
  }

  isCurrentUserAdmin(): boolean {
    const currentUser = this.userProfileSubject.value;
    return currentUser?.isAdmin === true || currentUser?.mail === 'alexandre.poinot@fr.gt.com' || currentUser?.mail === 'rochelle.thevaseelan@fr.gt.com' || currentUser?.mail === 'romain.tetillon@fr.gt.com';
  }

  isImpersonating(): boolean {
    return this.impersonatedEmailSubject.value !== null;
  }

  getEffectiveUserEmail(): string {
    const impersonatedEmail = this.impersonatedEmailSubject.value;
    if (impersonatedEmail) {
      return impersonatedEmail;
    }
    
    const currentUser = this.userProfileSubject.value;
    return currentUser?.mail || currentUser?.userPrincipalName || '';
  }
  getCurrentUser(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}