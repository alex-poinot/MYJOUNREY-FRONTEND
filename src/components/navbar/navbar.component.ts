import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, UserProfile } from '../../services/auth.service';
import { environment } from '../../environments/environment';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { Subject } from 'rxjs';

interface ApiUser {
  USR_ID: number;
  USR_NOM: string;
  USR_MAIL: string;
  USR_DATE_DEBUT: string | null;
  USR_UPDATE_DATE: string | null;
}

interface ApiResponse {
  success: boolean;
  data: ApiUser[];
  count: number;
  timestamp: string;
}

export interface TabGroup {
  name: string;
  tabs: string[];
  icon: string;
  collapsed: boolean;
  hovered?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <nav class="navbar-horizontal">
      <!-- Logo et titre -->
      <div class="navbar-brand" (click)="goToHome()">
        <!--<div class="logo-robot">🤖</div>-->
        <div class="logo-robot"><img src="assets/images/logo_MyJourney.png" alt="Logo MyJourney"></div>
        <h1 class="brand-title">MyJourney</h1>
      </div>

      <!-- Menu horizontal -->
      <div class="navbar-menu">
        <div *ngFor="let group of tabGroups" 
             class="menu-group"
             (mouseenter)="onGroupHover(group, true)"
             (mouseleave)="onGroupHover(group, false)">
          
          <!-- Icône du groupe -->
          <div class="group-button" 
               [class.active]="isGroupActive(group)"
               (click)="toggleGroup(group)">
            <span class="group-name">{{ group.name }}</span>
            <span class="expand-icon">{{ group.collapsed ? '▼' : '▲' }}</span>
          </div>
          
          <!-- Dropdown des onglets -->
          <div class="dropdown-menu" 
               [class.visible]="!group.collapsed || group.hovered">
            <div *ngFor="let tab of group.tabs" 
                 class="dropdown-item"
                 [class.active]="activeTab === tab"
                 [class.pageProjet]="tab != 'NOG'"
                 (click)="onTabClick(tab)">
              {{ tab }}
            </div>
          </div>
        </div>
      </div>

      <!-- Profil utilisateur -->
      <div class="navbar-profile">
        <!-- Badge d'impersonation -->
        <div *ngIf="isImpersonating" class="impersonation-badge">
          <i class="fas fa-user-secret"></i>
          <span>{{ impersonatedEmail }}</span>
          <button class="stop-impersonation-btn" (click)="stopImpersonation()" title="Reprendre mon profil">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <img [src]="currentUser?.photoUrl || defaultPhoto" [alt]="currentUser?.displayName || 'Utilisateur'" class="profile-photo">
        <div class="profile-info">
          <span class="profile-name">{{ currentUser?.displayName || 'Utilisateur' }}</span>
          <!-- <span class="profile-email">{{ isImpersonating ? impersonatedEmail : (currentUser?.mail || '') }}</span> -->
          <span class="profile-email">{{ currentUser?.mail || '' }}</span>
        </div>
        
        <!-- Bouton d'impersonation pour les admins -->
        <button *ngIf="isAdmin() && !isImpersonating" 
                class="impersonation-btn" 
                (click)="openImpersonationModal()" 
                title="Prendre le profil d'un autre utilisateur">
          <i class="fas fa-user-secret"></i>
        </button>
        
        <button class="logout-btn" (click)="logout()" title="Se déconnecter">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </nav>
    
    <!-- Modal d'impersonation -->
    <div *ngIf="showImpersonationModal" class="modal-overlay" (click)="closeImpersonationModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Prendre le profil d'un utilisateur</h3>
          <button class="modal-close" (click)="closeImpersonationModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="email-input">Adresse email de l'utilisateur :</label>
            <div class="autocomplete-container">
              <input 
                type="email" 
                id="email-input"
                [value]="impersonationEmailInput"
                (input)="onEmailInputChange($event.target.value)"
                (blur)="hideUserDropdown()"
                (keyup.enter)="startImpersonation()"
                placeholder="Tapez pour rechercher un utilisateur..."
                class="email-input"
                autocomplete="off">
              
              <!-- Dropdown des suggestions -->
              <div *ngIf="showUserDropdown" class="user-dropdown">
                <div *ngIf="isSearchingUsers" class="loading-item">
                  <i class="fas fa-spinner fa-spin"></i>
                  Recherche en cours...
                </div>
                <div *ngFor="let user of filteredUsers" 
                     class="user-item"
                     (mousedown)="selectUser(user)">
                  <div class="user-info">
                    <div class="user-name">{{ user.USR_NOM }}</div>
                    <div class="user-email">{{ user.USR_MAIL }}</div>
                  </div>
                </div>
                <div *ngIf="!isSearchingUsers && filteredUsers.length === 0 && impersonationEmailInput.length >= 2" 
                     class="no-results">
                  Aucun utilisateur trouvé
                </div>
              </div>
            </div>
          </div>
          <div class="warning-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Cette fonctionnalité est réservée aux administrateurs. Toutes les données affichées correspondront à l'utilisateur sélectionné.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="closeImpersonationModal()">Annuler</button>
          <button class="btn-confirm" (click)="startImpersonation()" [disabled]="!impersonationEmailInput.trim()">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .navbar-horizontal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 8vh;
      background: white;
      color: var(--gray-800);
      box-shadow: var(--shadow-md);
      border-bottom: 0.2vh solid var(--primary-color);
      z-index: 99999;
      display: flex;
      align-items: center;
      padding: 0 1vw;
      gap: 1.5vw;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 1vw;
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 1vh 1vw;
      border-radius: 0.5vw;
    }

    .navbar-brand:hover {
      background: rgba(34, 109, 104, 0.05);
    }

    .logo {
      font-size: 1.4vw;
    }

    .logo-robot img {
      max-width: 2vw;
      height: auto;
    }

    .brand-title {
      font-family: Inter, system-ui, sans-serif;
      font-size: 1.3vw;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .navbar-menu {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .menu-group {
      position: relative;
    }

    .group-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 1vh 1vw;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 0.5vw;
      white-space: nowrap;
    }

    .group-button:hover {
      background: rgba(34, 109, 104, 0.05);
    }

    .group-button.active {
      background: rgba(34, 109, 104, 0.1);
      border: 1px solid var(--primary-color);
    }

    .group-name {
      font-weight: 500;
      font-size: var(--font-size-md);
    }

    .expand-icon {
      font-size: var(--font-size-sm);
      color: var(--primary-color);
      transition: transform 0.2s ease;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 15vw;
      background: white;
      border: 1px solid var(--primary-color);
      border-radius: 0.5vw;
      box-shadow: var(--shadow-lg);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
      z-index: 1000;
      margin-top: 0.8vh;
    }

    .dropdown-menu.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-item {
      padding: 1vh 1vw;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 0.5vw;
      margin: 0.4vh 0.2vw;
      font-size: var(--font-size-md);
    }

    .dropdown-item:hover {
      background: rgba(37, 99, 235, 0.05);
    }

    .dropdown-item.active {
      background: var(--primary-color);
      color: white;
      font-weight: 600;
    }

    .navbar-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .navbar-profile:hover {
      background: rgba(34, 109, 104, 0.05);
    }

    .profile-photo {
      width: 2.5vw;
      height: 5vh;
      border-radius: 50%;
      border: 0.25vh solid var(--primary-color);
      object-fit: cover;
    }

    .profile-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .profile-name {
      font-weight: 500;
      color: var(--gray-700);
      font-size: var(--font-size-md);
      line-height: 1.2;
    }
    
    .profile-email {
      font-size: var(--font-size-sm);
      color: var(--gray-500);
      line-height: 1.2;
    }
    
    .impersonation-badge {
      display: flex;
      align-items: center;
      gap: 0.3vw;
      background: var(--warning-color);
      color: white;
      padding: 0.6vh 0.3vw;
      border-radius: 0.8vw;
      font-size: var(--font-size-sm);
      font-weight: 600;
      margin-right: 1vw;
    }
    
    .stop-impersonation-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 50%;
      width: 0.8vw;
      height: 1.6vh;
      cursor: pointer;
      font-size: var(--font-size-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    .stop-impersonation-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .impersonation-btn {
      background: var(--secondary-color);
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.6vh 0.3vw;
      border-radius: 4px;
      transition: all 0.2s ease;
      margin-left: 0.3vw;
      font-size: var(--font-size-lg);
    }
    
    .impersonation-btn:hover {
      background: var(--primary-color);
    }
    
    .logout-btn {
      background: none;
      border: none;
      color: var(--gray-600);
      cursor: pointer;
      padding: 0.6vh 0.3vw;
      border-radius: 4px;
      transition: all 0.2s ease;
      margin-left: 0.3vw;
      font-size: var(--font-size-lg);
    }
    
    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-xl);
      width: 90%;
      max-width: 30vw;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-body {
      padding: 1vh 1vw;
    }

    .form-group {
      margin-bottom: 2vh;
    }

    .form-group label {
      display: block;
      margin-bottom: 1vh;
      font-weight: 500;
      color: var(--gray-700);
      font-size: var(--font-size-lg);
    }

    .email-input {
      width: 100%;
      padding: 1vh 1vw;
      border: 0.2vh solid var(--gray-300);
      border-radius: 0.5vw;
      font-size: var(--font-size-md);
      transition: all 0.2s;
    }

    .email-input:focus {
      outline: none;
      border-color: var(--secondary-color);
      box-shadow: 0 0 0 3px rgba(100, 206, 199, 0.1);
    }

    .autocomplete-container {
      position: relative;
    }

    .user-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 0.1vh solid var(--gray-300);
      border-top: none;
      border-radius: 0 0 8px 8px;
      box-shadow: var(--shadow-lg);
      max-height: 15vh;
      overflow-y: auto;
      z-index: 1000;
    }

    .user-item {
      padding: 1vh 1vw;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 0.1vh solid var(--gray-100);
    }

    .user-item:hover {
      background: var(--gray-50);
    }

    .user-item:last-child {
      border-bottom: none;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-weight: 500;
      color: var(--gray-800);
      font-size: var(--font-size-md);
    }

    .user-email {
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }

    .loading-item {
      padding: 12px 16px;
      color: var(--gray-600);
      font-size: var(--font-size-md);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .no-results {
      padding: 12px 16px;
      color: var(--gray-500);
      font-size: var(--font-size-md);
      font-style: italic;
      text-align: center;
    }

    .warning-message {
      display: flex;
      align-items: flex-start;
      gap: 1vw;
      padding: 1vh 1vw;
      background: rgba(245, 158, 11, 0.1);
      border: 0.1vh solid var(--warning-color);
      border-radius: 0.5vw;
      color: var(--warning-color);
      font-size: var(--font-size-md);
    }

    .warning-message i {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5vw;
      padding: 2vh 1vw;
      border-top: 0.1vh solid var(--gray-200);
      background: var(--gray-50);
      border-radius: 0 0 0.5vw 0.5vw;
    }

    .btn-cancel {
      padding: 1vh 1vw;
      border: 0.1vh solid var(--gray-300);
      background: white;
      color: var(--gray-700);
      border-radius: 0.5vw;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      font-size: var(--font-size-md);
    }

    .btn-cancel:hover {
      background: var(--gray-50);
      border-color: var(--gray-400);
    }

    .btn-confirm {
      padding: 1vh 1vw;
      border: none;
      background: var(--secondary-color);
      color: white;
      border-radius: 0.5vw;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      font-size: var(--font-size-md);
    }

    .btn-confirm:hover:not(:disabled) {
      background: var(--primary-color);
    }

    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dropdown-item.pageProjet {
      cursor: not-allowed;
      color: var(--gray-300);
      font-style: italic;
      cursor: not-allowed;
    }
  `]
})
export class NavbarComponent {
  @Input() activeTab: string = 'dashboard';
  @Output() tabChange = new EventEmitter<string>();
  
  currentUser: UserProfile | null = null;
  originalUser: UserProfile | null = null;
  impersonatedEmail: string | null = null;
  showImpersonationModal = false;
  impersonationEmailInput = '';
  filteredUsers: ApiUser[] = [];
  allUsers: ApiUser[] = [];
  allAdminUsers: string[] = [];
  usersLoaded = false;
  showUserDropdown = false;
  isLoadingAllUsers = false;
  isSearchingUsers = false;
  isImpersonating = false;
  isAdminValue = false;
  defaultPhoto = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100';

  private searchSubject = new Subject<string>();
  tabGroups: TabGroup[] = [
    {
      name: 'Avant la mission',
      tabs: ['LDM'],
      icon: '📋',
      collapsed: true
    },
    {
      name: 'Pendant la mission',
      tabs: ['NOG', 'Checklist d\'actualités', 'Révision', 'Supervision'],
      icon: '⚙️',
      collapsed: true
    },
    {
      name: 'Fin de mission',
      tabs: ['NDS', 'QMM'],
      icon: '✅',
      collapsed: true
    }
  ];

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
    });
    
    this.authService.originalUser$.subscribe(user => {
      this.originalUser = user;
    });
    
    this.authService.impersonatedEmail$.subscribe(email => {
      this.impersonatedEmail = email;
      this.isImpersonating = email !== null;
    });

    this.http.get<{ success: boolean; data: string[]; count: number; timestamp: string }>(`${environment.apiUrl}/users/getAllAdminUsers`)
      .subscribe((response) => {
        this.allAdminUsers = response.data;
      }, (error) => {
        console.error('Erreur lors de la récupération des admins :', error);
      });

    // Configuration de la recherche avec debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        if (!searchTerm || searchTerm.length < 2) {
          this.showUserDropdown = false;
          return of([]);
        }
        
        this.isSearchingUsers = true;
        this.showUserDropdown = true;
        
        return of(this.searchUsersInCache(searchTerm));
      })
    ).subscribe(users => {
      this.filteredUsers = users;
      this.isSearchingUsers = false;
    });

  }

  

  private async loadAllUsers(): Promise<void> {
    if (this.usersLoaded || this.isLoadingAllUsers) {
      return;
    }
    
    this.isLoadingAllUsers = true;
    console.log('Chargement des utilisateurs...');
       
    try {
      console.log(`Appel API: ${environment.apiUrl}/users/`);
      const response = await this.http.get<ApiResponse>(`${environment.apiUrl}/users/`).toPromise();
      if (response && response.success && response.data) {
        // Filtrer les utilisateurs avec un email valide
        this.allUsers = response.data.filter(user => user.USR_MAIL && user.USR_MAIL.trim() !== '');
        this.usersLoaded = true;
        console.log(`${this.allUsers.length} utilisateurs chargés depuis l'API`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      this.allUsers = [];
    } finally {
      this.isLoadingAllUsers = false;
    }
  }

  private searchUsersInCache(searchTerm: string): ApiUser[] {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }
    
    console.log(`Recherche dans ${this.allUsers.length} utilisateurs pour: "${searchTerm}"`);
    const term = searchTerm.toLowerCase();
    const results = this.allUsers
      .filter(user => 
        user.USR_MAIL.toLowerCase().includes(term) ||
        user.USR_NOM.toLowerCase().includes(term)
      )
      .slice(0, 10); // Limiter à 10 résultats pour les performances
    
    console.log(`${results.length} résultats trouvés`);
    return results;
  }

  onEmailInputChange(value: string): void {
    this.impersonationEmailInput = value;
    console.log('Recherche pour:', value);
    
    // S'assurer que les utilisateurs sont chargés
    if (!this.usersLoaded && !this.isLoadingAllUsers) {
      this.loadAllUsers().then(() => {
        this.searchSubject.next(value);
      });
    } else {
      this.searchSubject.next(value);
    }
  }

  selectUser(user: ApiUser): void {
    this.impersonationEmailInput = user.USR_MAIL;
    this.showUserDropdown = false;
    this.filteredUsers = [];
  }

  hideUserDropdown(): void {
    // Délai pour permettre le clic sur un élément de la liste
    setTimeout(() => {
      this.showUserDropdown = false;
    }, 200);
  }

  private loadUserPhoto(): void {
    // Cette méthode sera appelée automatiquement par AuthService
    // lors du chargement du profil utilisateur
  }

  toggleGroup(group: TabGroup): void {
    group.collapsed = !group.collapsed;
  }

  onGroupHover(group: TabGroup, isHovered: boolean): void {
    (group as any).hovered = isHovered;
  }

  isGroupActive(group: TabGroup): boolean {
    return group.tabs.includes(this.activeTab);
  }

  onTabClick(tab: string): void {
    this.tabChange.emit(tab);
  }

  goToHome(): void {
    this.tabChange.emit('dashboard');
  }
  
  isAdmin(): boolean {
    if(this.allAdminUsers.length == 0) {
      return false;
    } else {
      return this.allAdminUsers.includes(this.currentUser?.mail.toLowerCase() ?? '');
    }
  }

  
  openImpersonationModal(): void {
    this.showImpersonationModal = true;
    this.impersonationEmailInput = '';
    this.filteredUsers = [];
    this.showUserDropdown = false;
    
    // Charger les utilisateurs quand on ouvre le modal
    if (!this.usersLoaded && !this.isLoadingAllUsers) {
      this.loadAllUsers();
    }
  }
  
  closeImpersonationModal(): void {
    this.showImpersonationModal = false;
    this.impersonationEmailInput = '';
    this.filteredUsers = [];
    this.showUserDropdown = false;
  }
  
  startImpersonation(): void {
    if (this.impersonationEmailInput.trim()) {
      this.authService.impersonateUser(this.impersonationEmailInput.trim());
      this.closeImpersonationModal();
    }
  }
  
  stopImpersonation(): void {
    this.authService.stopImpersonation();
  }
  
  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      this.authService.logout();
    }
  }
}