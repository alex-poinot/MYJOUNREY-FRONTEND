import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, BehaviorSubject, combineLatest } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../environments/environment';

interface Mission {
  MSN_ID: number;
  MSN_NOM: string;
  MSN_STATUT: string;
  MSN_DATE_DEBUT: string | null;
  MSN_DATE_FIN: string | null;
  MSN_DESCRIPTION: string | null;
  MSN_CLIENT_ID: number;
  MSN_GROUPE_ID: number;
  MSN_UPDATE_DATE: string | null;
  client?: Client;
  groupe?: Groupe;
  expanded?: boolean;
}

interface Client {
  CLT_ID: number;
  CLT_NOM: string;
  CLT_ADRESSE: string | null;
  CLT_TELEPHONE: string | null;
  CLT_EMAIL: string | null;
  CLT_UPDATE_DATE: string | null;
  expanded?: boolean;
}

interface Groupe {
  GRP_ID: number;
  GRP_NOM: string;
  GRP_DESCRIPTION: string | null;
  GRP_UPDATE_DATE: string | null;
  expanded?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  timestamp: string;
}

interface GroupedData {
  groupe: Groupe;
  clients: {
    client: Client;
    missions: Mission[];
  }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Header du dashboard -->
      <div class="dashboard-header">
        <div class="header-info">
          <h1>📊 Dashboard MyJourney</h1>
          <p>Gestion des missions d'audit - {{ totalMissions }} mission(s) au total</p>
        </div>
        <div class="header-controls">
          <button 
            class="btn-save" 
            (click)="toggleAllExpansion()"
            [title]="allExpanded ? 'Réduire tout' : 'Développer tout'">
            {{ allExpanded ? 'Réduire tout' : 'Développer tout' }}
          </button>
          <button class="btn-primary" (click)="refreshData()">
            <i class="fas fa-sync-alt" [class.fa-spin]="isLoading"></i>
            Actualiser
          </button>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-number">{{ totalMissions }}</div>
            <div class="stat-label">Missions totales</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏢</div>
          <div class="stat-content">
            <div class="stat-number">{{ totalClients }}</div>
            <div class="stat-label">Clients</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-number">{{ totalGroupes }}</div>
            <div class="stat-label">Groupes</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-number">{{ completedMissions }}</div>
            <div class="stat-label">Terminées</div>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="dashboard-content">
        <!-- État de chargement -->
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des données...</p>
        </div>

        <!-- État d'erreur -->
        <div *ngIf="error && !isLoading" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Erreur de chargement</h3>
          <p>{{ error }}</p>
          <button class="btn-primary" (click)="refreshData()">Réessayer</button>
        </div>

        <!-- Données groupées -->
        <div *ngIf="!isLoading && !error && groupedData.length > 0" class="grouped-data">
          <div *ngFor="let group of groupedData; trackBy: trackByGroupe" class="group-section">
            <!-- En-tête du groupe -->
            <div class="group-header" (click)="toggleGroupExpansion(group.groupe)">
              <div class="group-info">
                <span class="expand-icon">{{ group.groupe.expanded ? '▼' : '▶' }}</span>
                <div class="group-details">
                  <h3>{{ group.groupe.GRP_NOM }}</h3>
                  <span class="group-stats">{{ getGroupMissionCount(group) }} mission(s) - {{ group.clients.length }} client(s)</span>
                </div>
              </div>
              <div class="group-actions">
                <span class="badge badge-primary">{{ group.groupe.GRP_ID }}</span>
              </div>
            </div>

            <!-- Contenu du groupe -->
            <div *ngIf="group.groupe.expanded" class="group-content">
              <div *ngFor="let clientGroup of group.clients; trackBy: trackByClient" class="client-section">
                <!-- En-tête du client -->
                <div class="client-header" (click)="toggleClientExpansion(clientGroup.client)">
                  <div class="client-info">
                    <span class="expand-icon">{{ clientGroup.client.expanded ? '▼' : '▶' }}</span>
                    <div class="client-details">
                      <h4>{{ clientGroup.client.CLT_NOM }}</h4>
                      <span class="client-stats">{{ clientGroup.missions.length }} mission(s)</span>
                    </div>
                  </div>
                  <div class="client-actions">
                    <span class="badge badge-secondary">{{ clientGroup.client.CLT_ID }}</span>
                  </div>
                </div>

                <!-- Missions du client -->
                <div *ngIf="clientGroup.client.expanded" class="missions-list">
                  <div *ngFor="let mission of clientGroup.missions; trackBy: trackByMission" class="mission-card">
                    <div class="mission-header" (click)="toggleMissionExpansion(mission)">
                      <div class="mission-info">
                        <span class="expand-icon">{{ mission.expanded ? '▼' : '▶' }}</span>
                        <div class="mission-details">
                          <h5>{{ mission.MSN_NOM }}</h5>
                          <div class="mission-meta">
                            <span class="mission-id">ID: {{ mission.MSN_ID }}</span>
                            <span class="mission-dates" *ngIf="mission.MSN_DATE_DEBUT">
                              {{ formatDate(mission.MSN_DATE_DEBUT) }}
                              <span *ngIf="mission.MSN_DATE_FIN"> - {{ formatDate(mission.MSN_DATE_FIN) }}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="mission-status">
                        <span class="badge" [ngClass]="getStatusClass(mission.MSN_STATUT)">
                          {{ mission.MSN_STATUT }}
                        </span>
                      </div>
                    </div>

                    <!-- Détails de la mission -->
                    <div *ngIf="mission.expanded" class="mission-content">
                      <div class="mission-description" *ngIf="mission.MSN_DESCRIPTION">
                        <h6>Description :</h6>
                        <p>{{ mission.MSN_DESCRIPTION }}</p>
                      </div>
                      <div class="mission-actions">
                        <button class="btn-outline" (click)="editMission(mission)">
                          <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-outline" (click)="viewMissionDetails(mission)">
                          <i class="fas fa-eye"></i> Détails
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- État vide -->
        <div *ngIf="!isLoading && !error && groupedData.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>Aucune donnée disponible</h3>
          <p>Aucune mission n'a été trouvée pour le moment.</p>
          <button class="btn-primary" (click)="refreshData()">Actualiser</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      background: var(--gray-50);
      min-height: calc(100vh - 80px);
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
    }

    .header-info h1 {
      margin: 0 0 8px 0;
      color: var(--primary-color);
      font-size: var(--font-size-xl);
      font-weight: 700;
    }

    .header-info p {
      margin: 0;
      color: var(--gray-600);
      font-size: var(--font-size-md);
    }

    .header-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .btn-save {
      background: var(--secondary-color);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: var(--font-size-md);
    }

    .btn-save:hover {
      background: var(--primary-color);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-md);
    }

    .btn-primary:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .btn-outline {
      background: transparent;
      color: var(--primary-color);
      border: 2px solid var(--primary-color);
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-sm);
    }

    .btn-outline:hover {
      background: var(--primary-color);
      color: white;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .stat-icon {
      font-size: 2rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gray-100);
      border-radius: 12px;
    }

    .stat-number {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--primary-color);
      line-height: 1;
    }

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--gray-600);
      margin-top: 4px;
    }

    .dashboard-content {
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .loading-state, .error-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--gray-200);
      border-top: 4px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon, .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .group-section {
      border-bottom: 1px solid var(--gray-200);
    }

    .group-section:last-child {
      border-bottom: none;
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--gray-50);
    }

    .group-header:hover {
      background: var(--gray-100);
    }

    .group-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .expand-icon {
      color: var(--primary-color);
      font-weight: bold;
      font-size: var(--font-size-md);
      width: 20px;
      text-align: center;
    }

    .group-details h3 {
      margin: 0 0 4px 0;
      color: var(--gray-800);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    .group-stats, .client-stats {
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }

    .group-content {
      background: white;
    }

    .client-section {
      border-left: 3px solid var(--secondary-color);
      margin-left: 24px;
    }

    .client-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--gray-25);
    }

    .client-header:hover {
      background: var(--gray-50);
    }

    .client-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .client-details h4 {
      margin: 0 0 4px 0;
      color: var(--gray-700);
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    .missions-list {
      padding: 0 20px 16px 20px;
    }

    .mission-card {
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .mission-card:hover {
      box-shadow: var(--shadow-sm);
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mission-header:hover {
      background: var(--gray-50);
    }

    .mission-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .mission-details h5 {
      margin: 0 0 4px 0;
      color: var(--gray-800);
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    .mission-meta {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .mission-id {
      font-size: var(--font-size-sm);
      color: var(--gray-500);
      font-weight: 500;
    }

    .mission-dates {
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }

    .mission-content {
      padding: 16px;
      border-top: 1px solid var(--gray-200);
      background: var(--gray-25);
    }

    .mission-description {
      margin-bottom: 16px;
    }

    .mission-description h6 {
      margin: 0 0 8px 0;
      color: var(--gray-700);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .mission-description p {
      margin: 0;
      color: var(--gray-600);
      font-size: var(--font-size-sm);
      line-height: 1.5;
    }

    .mission-actions {
      display: flex;
      gap: 12px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-primary {
      background: rgba(102, 74, 133, 0.1);
      color: var(--primary-color);
    }

    .badge-secondary {
      background: rgba(149, 126, 170, 0.1);
      color: var(--secondary-color);
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
    }

    .badge-warning {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
    }

    .badge-error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 16px;
      }

      .dashboard-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .header-controls {
        justify-content: flex-end;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .group-header, .client-header, .mission-header {
        padding: 12px 16px;
      }

      .mission-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .mission-actions {
        flex-direction: column;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // États de l'interface
  isLoading = false;
  error: string | null = null;
  
  // Données
  missions: Mission[] = [];
  clients: Client[] = [];
  groupes: Groupe[] = [];
  groupedData: GroupedData[] = [];
  
  // État d'expansion global
  allExpanded = false;
  
  // Statistiques calculées
  get totalMissions(): number {
    return this.missions.length;
  }
  
  get totalClients(): number {
    return this.clients.length;
  }
  
  get totalGroupes(): number {
    return this.groupes.length;
  }
  
  get completedMissions(): number {
    return this.missions.filter(m => m.MSN_STATUT === 'Terminé' || m.MSN_STATUT === 'Completed').length;
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Charger toutes les données en parallèle
      const [missionsResponse, clientsResponse, groupesResponse] = await Promise.all([
        this.http.get<ApiResponse<Mission>>(`${environment.apiUrl}/missions/`).toPromise(),
        this.http.get<ApiResponse<Client>>(`${environment.apiUrl}/clients/`).toPromise(),
        this.http.get<ApiResponse<Groupe>>(`${environment.apiUrl}/groupes/`).toPromise()
      ]);

      if (missionsResponse?.success) {
        this.missions = missionsResponse.data || [];
      }
      
      if (clientsResponse?.success) {
        this.clients = clientsResponse.data || [];
      }
      
      if (groupesResponse?.success) {
        this.groupes = groupesResponse.data || [];
      }

      this.groupData();
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.error = 'Impossible de charger les données. Veuillez réessayer.';
    } finally {
      this.isLoading = false;
    }
  }

  private groupData(): void {
    const grouped: GroupedData[] = [];

    // Grouper par groupe
    this.groupes.forEach(groupe => {
      const groupClients: { client: Client; missions: Mission[] }[] = [];
      
      // Trouver tous les clients de ce groupe
      const clientsInGroup = this.clients.filter(client => 
        this.missions.some(mission => 
          mission.MSN_GROUPE_ID === groupe.GRP_ID && mission.MSN_CLIENT_ID === client.CLT_ID
        )
      );

      clientsInGroup.forEach(client => {
        const clientMissions = this.missions.filter(mission => 
          mission.MSN_GROUPE_ID === groupe.GRP_ID && mission.MSN_CLIENT_ID === client.CLT_ID
        );

        if (clientMissions.length > 0) {
          groupClients.push({
            client: { ...client, expanded: false },
            missions: clientMissions.map(mission => ({ ...mission, expanded: false }))
          });
        }
      });

      if (groupClients.length > 0) {
        grouped.push({
          groupe: { ...groupe, expanded: false },
          clients: groupClients
        });
      }
    });

    this.groupedData = grouped;
    this.updateAllExpandedState();
  }

  refreshData(): void {
    this.loadData();
  }

  // Gestion de l'expansion globale
  toggleAllExpansion(): void {
    this.allExpanded = !this.allExpanded;
    
    this.groupedData.forEach(group => {
      group.groupe.expanded = this.allExpanded;
      group.clients.forEach(clientGroup => {
        clientGroup.client.expanded = this.allExpanded;
        clientGroup.missions.forEach(mission => {
          mission.expanded = this.allExpanded;
        });
      });
    });
  }

  private updateAllExpandedState(): void {
    // Vérifier si tous les éléments sont développés
    let allGroupsExpanded = true;
    let allClientsExpanded = true;
    let allMissionsExpanded = true;

    for (const group of this.groupedData) {
      if (!group.groupe.expanded) {
        allGroupsExpanded = false;
      }
      
      for (const clientGroup of group.clients) {
        if (!clientGroup.client.expanded) {
          allClientsExpanded = false;
        }
        
        for (const mission of clientGroup.missions) {
          if (!mission.expanded) {
            allMissionsExpanded = false;
          }
        }
      }
    }

    this.allExpanded = allGroupsExpanded && allClientsExpanded && allMissionsExpanded;
  }

  // Gestion de l'expansion individuelle
  toggleGroupExpansion(groupe: Groupe): void {
    groupe.expanded = !groupe.expanded;
    this.updateAllExpandedState();
  }

  toggleClientExpansion(client: Client): void {
    client.expanded = !client.expanded;
    this.updateAllExpandedState();
  }

  toggleMissionExpansion(mission: Mission): void {
    mission.expanded = !mission.expanded;
    this.updateAllExpandedState();
  }

  // Utilitaires
  getGroupMissionCount(group: GroupedData): number {
    return group.clients.reduce((total, clientGroup) => total + clientGroup.missions.length, 0);
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'terminé':
      case 'completed':
        return 'badge-success';
      case 'en cours':
      case 'in progress':
        return 'badge-warning';
      case 'planifié':
      case 'planned':
        return 'badge-primary';
      default:
        return 'badge-secondary';
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  }

  // Actions sur les missions
  editMission(mission: Mission): void {
    console.log('Éditer la mission:', mission);
    // TODO: Implémenter l'édition
  }

  viewMissionDetails(mission: Mission): void {
    console.log('Voir les détails de la mission:', mission);
    // TODO: Implémenter la vue détaillée
  }

  // TrackBy functions pour les performances
  trackByGroupe(index: number, item: GroupedData): number {
    return item.groupe.GRP_ID;
  }

  trackByClient(index: number, item: { client: Client; missions: Mission[] }): number {
    return item.client.CLT_ID;
  }

  trackByMission(index: number, item: Mission): number {
    return item.MSN_ID;
  }
}