import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService, UserProfile } from '../../services/auth.service';
import { environment } from '../../environments/environment';
import { debounceTime, distinctUntilChanged, switchMap, of, Subject } from 'rxjs';

interface Dossier {
  DOS_PGI: string;
  DOS_NOM: string;
  MD_MISSION: string;
  MD_MILLESIME: string;
  LIBELLE_MISSIONS: string;
}

interface NogPartie1 {
  coordonnees: Coordonnees;
  contacts: Contacts[];
  associes: Associes[];
  chiffresSignificatifs: ChiffresSignificatifs[];
  activiteExHisto: string;
}

interface Coordonnees {
  nomSociete: string;
  adresseNumero: string;
  adresseRue: string;
  adresseVille: string;
  adresseCP: string;
  siret: string;
  apeCode: string;
  apeLibelle: string;
}

interface Contacts {
  nom: string;
  fonction: string;
  telephone: string;
  mail: string;
}

interface Associes {
  nom: string;
  nbTitres: number;
  montantCapital: number;
  pourcentageDetention: number;
}

interface ChiffresSignificatifs {
  libelle: string;
  montantN1: number;
  montantN2: number;
  variation: number;
}

interface ApiResponse {
  success: boolean;
  data: Dossier[];
  count: number;
  timestamp: string;
}

@Component({
  selector: 'app-nog-editor',
  standalone: true,
  imports: [
    CommonModule
  ],
  template: `
    <div id="container-select-dossier">
      <div class="form-group">
        <label for="email-input">Choisissez votre dossier :</label>
        <div class="autocomplete-container">
          <input 
            type="text" 
            id="dossier-input"
            (input)="onDossierInputChange($event.target.value)"
            (blur)="hideDossierDropdown()"
            placeholder="Tapez pour rechercher un dossier..."
            class="dossier-input"
            autocomplete="off">
          
          <!-- Dropdown des suggestions -->
          <div class="dossier-dropdown">
            <div *ngIf="isSearchingDossiers" class="loading-item">
              <i class="fas fa-spinner fa-spin"></i>
              Recherche en cours...
            </div>

            <div *ngFor="let dossier of filteredDossiers" 
                  class="dossier-item"
                  (mousedown)="selectDossier(dossier)">
              <div class="dossier-info">
                <div class="dossier-name">{{ dossier.DOS_PGI.trim() + ' - ' + dossier.DOS_NOM.trim() }}</div>
              </div>
            </div>
            <div *ngIf="!isSearchingDossiers && filteredDossiers.length === 0" 
                  class="no-results">
              Aucun dossier trouvé
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dossier-input {
      width: 100%;
      padding: 1vh 1vw;
      border: 0.2vh solid var(--gray-300);
      border-radius: 0.5vw;
      font-size: var(--font-size-md);
      transition: all 0.2s;
    }

    .dossier-input:focus {
      outline: none;
      border-color: var(--secondary-color);
      box-shadow: 0 0 0 3px rgba(100, 206, 199, 0.1);
    }

    .autocomplete-container {
      position: relative;
    }

    .dossier-dropdown {
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

    .dossier-item {
      padding: 1vh 1vw;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 0.1vh solid var(--gray-100);
    }

    .dossier-item:hover {
      background: var(--gray-50);
    }

    .dossier-item:last-child {
      border-bottom: none;
    }

    .dossier-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dossier-name {
      font-weight: 500;
      color: var(--gray-800);
      font-size: var(--font-size-md);
    }

    .dossier-email {
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

    .autocomplete-container {
      position: relative;
    }
  `]
})
export class NogEditorComponent implements OnInit, OnDestroy {

  filteredDossiers: Dossier[] = [];
  allDossiers: Dossier[] = [];
  dossiersLoaded = false;
  showDossierDropdown = false;
  isLoadingAllDossiers = false;
  isSearchingDossiers = false;
  allAdminUsers: string[] = [];
  currentUser: UserProfile | null = null;
  userEmail: string = '';
  usrMailCollab: string = '';
  dossierSelected: string = '';

  private searchSubject = new Subject<string>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Configuration de la recherche avec debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        if (!searchTerm || searchTerm.length < 2) {
          this.showDossierDropdown = false;
          return of([]);
        }
        
        this.isSearchingDossiers = true;
        this.showDossierDropdown = true;
        
        return of(this.searchDossiersInCache(searchTerm));
      })
    ).subscribe(dossiers => {
      this.filteredDossiers = dossiers;
      console.log('filteredDossiers', this.filteredDossiers);
      this.isSearchingDossiers = false;
    });
  }

  ngOnInit(): void {
    // Récupérer les informations utilisateur
    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
      this.userEmail = user?.mail || '';
      this.usrMailCollab = user?.mail || '';
      // console.log('Email :', this.userEmail);
      if(this.userEmail) {
        this.setLogConnexion();
      }
    });
    
    // Écouter les changements d'impersonation
    this.authService.impersonatedEmail$.subscribe(() => {
      this.userEmail = this.authService.getEffectiveUserEmail();
      if(this.userEmail) {
        // this.loadData();
      }
    });
  }

  ngOnDestroy(): void {

  }

  selectDossier(dossier: Dossier): void {
    this.showDossierDropdown = false;
    this.filteredDossiers = [];
  }

  private searchDossiersInCache(searchTerm: string): Dossier[] {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }
    
    console.log(`Recherche dans ${this.allDossiers.length} dossier pour: "${searchTerm}"`);
    const term = searchTerm.toLowerCase();
    const results = this.allDossiers
      .filter(dossie => 
        dossie.DOS_PGI.toLowerCase().includes(term) ||
        dossie.DOS_NOM.toLowerCase().includes(term)
      )
      .slice(0, 10); // Limiter à 10 résultats pour les performances
    
    console.log(`${results.length} résultats trouvés`);
    return results;
  }

  setLogConnexion() {
    console.log('Envoi du log de connexion:', this.usrMailCollab);

    this.http.post(`${environment.apiUrl}/logs/setLogConnexion`, {
        email: this.usrMailCollab,
        page: 'NOG'
    })
    .subscribe(response => {
      console.log('Réponse du serveur:', response);
    });
  }

  hideUserDropdown(): void {
    // Délai pour permettre le clic sur un élément de la liste
    setTimeout(() => {
      this.showDossierDropdown = false;
    }, 200);
  }

  onDossierInputChange(value: string): void {
    this.dossierSelected = value;
    
    // S'assurer que les utilisateurs sont chargés
    if (!this.dossiersLoaded && !this.isLoadingAllDossiers) {
      this.loadAllDossiers().then(() => {
        this.searchSubject.next(value);
      });
    } else {
      this.searchSubject.next(value);
    }
  }

  private async loadAllDossiers(): Promise<void> {
    if (this.dossiersLoaded || this.isLoadingAllDossiers) {
      return;
    }
    
    this.isLoadingAllDossiers = true;
    console.log('Chargement des dossier...');
        
    try {
      const response = await this.http.get<ApiResponse>(`${environment.apiUrl}/missions/getAllMissionAccessModuleEditor/${this.userEmail}&NOG`).toPromise();
      if (response && response.success && response.data) {
        // Filtrer les dossiers avec DOS_PGI et DOS_NOM non vide, puis rendre DOS_PGI unique
        const filtered = response.data.filter(dossier => dossier.DOS_PGI && dossier.DOS_NOM.trim() !== '');
        const uniqueDossiersMap = new Map<string, Dossier>();
        filtered.forEach(dossier => {
          if (!uniqueDossiersMap.has(dossier.DOS_PGI)) {
            uniqueDossiersMap.set(dossier.DOS_PGI, dossier);
          }
        });
        this.allDossiers = Array.from(uniqueDossiersMap.values());
        this.dossiersLoaded = true;
        console.log(`${this.allDossiers.length} dossiers chargés depuis l'API`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      this.allDossiers = [];
    } finally {
      this.isLoadingAllDossiers = false;
    }
  }

  hideDossierDropdown(): void {
    // Délai pour permettre le clic sur un élément de la liste
    setTimeout(() => {
      this.showDossierDropdown = false;
    }, 200);
  }
}