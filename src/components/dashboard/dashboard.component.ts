import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FilterOption {
  value: string;
  label: string;
  selected: boolean;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  isOpen: boolean;
}

interface Mission {
  id: string;
  groupe: string;
  dossier: string;
  bureau: string;
  departement: string;
  associe: string;
  dmcmFactureur: string;
  mission: string;
  millesime: string;
  etatDossier: string;
  nafSection: string;
  moisCloture: string;
  formeJuridique: string;
  nom: string;
  statut: string;
  dateCreation: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>📊 Dashboard MyJourney</h1>
        <p>Gestion des missions d'audit</p>
      </div>

      <!-- Bouton Filtre -->
      <div class="filter-section">
        <button class="filter-btn" (click)="toggleFilterPanel()" [class.active]="showFilterPanel">
          <i class="fas fa-filter"></i>
          Filtres
          <span class="filter-count" *ngIf="getActiveFiltersCount() > 0">{{ getActiveFiltersCount() }}</span>
        </button>
        
        <!-- Tags des filtres actifs -->
        <div class="active-filters" *ngIf="getActiveFiltersCount() > 0">
          <div *ngFor="let filter of getActiveFilterTags()" class="filter-tag">
            {{ filter.groupLabel }}: {{ filter.optionLabel }}
            <button class="remove-filter" (click)="removeFilter(filter.groupKey, filter.optionValue)">×</button>
          </div>
          <button class="clear-all-filters" (click)="clearAllFilters()">Effacer tout</button>
        </div>
      </div>

      <!-- Panel de filtres -->
      <div class="filter-panel" [class.open]="showFilterPanel">
        <div class="filter-panel-header">
          <h3>Filtres</h3>
          <button class="close-panel" (click)="toggleFilterPanel()">×</button>
        </div>
        
        <div class="filter-panel-content">
          <div *ngFor="let filterGroup of filterGroups" class="filter-group">
            <div class="filter-group-header" (click)="toggleFilterGroup(filterGroup)">
              <span class="filter-group-title">{{ filterGroup.label }}</span>
              <span class="selected-count" *ngIf="getSelectedCount(filterGroup) > 0">
                ({{ getSelectedCount(filterGroup) }})
              </span>
              <i class="fas" [class.fa-chevron-down]="filterGroup.isOpen" [class.fa-chevron-right]="!filterGroup.isOpen"></i>
            </div>
            
            <div class="filter-options" [class.open]="filterGroup.isOpen">
              <div class="filter-actions">
                <button class="select-all" (click)="selectAll(filterGroup)">Tout sélectionner</button>
                <button class="deselect-all" (click)="deselectAll(filterGroup)">Tout désélectionner</button>
              </div>
              
              <div *ngFor="let option of filterGroup.options" class="filter-option">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="option.selected"
                    (change)="onFilterChange()">
                  <span class="checkmark"></span>
                  {{ option.label }}
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="filter-panel-footer">
          <button class="apply-filters" (click)="applyFilters()">
            Appliquer les filtres ({{ getActiveFiltersCount() }})
          </button>
        </div>
      </div>

      <!-- Overlay -->
      <div class="filter-overlay" [class.visible]="showFilterPanel" (click)="toggleFilterPanel()"></div>

      <!-- Tableau des missions -->
      <div class="missions-table-container">
        <div class="table-header">
          <h2>Missions ({{ filteredMissions.length }})</h2>
        </div>
        
        <div class="table-wrapper">
          <table class="missions-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Groupe</th>
                <th>Dossier</th>
                <th>Bureau</th>
                <th>Département</th>
                <th>Associé</th>
                <th>Mission</th>
                <th>Millésime</th>
                <th>État</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let mission of filteredMissions" class="mission-row">
                <td class="mission-name">{{ mission.nom }}</td>
                <td>{{ mission.groupe }}</td>
                <td>{{ mission.dossier }}</td>
                <td>{{ mission.bureau }}</td>
                <td>{{ mission.departement }}</td>
                <td>{{ mission.associe }}</td>
                <td>{{ mission.mission }}</td>
                <td>{{ mission.millesime }}</td>
                <td>
                  <span class="status-badge" [class]="'status-' + mission.etatDossier.toLowerCase()">
                    {{ mission.etatDossier }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [class]="'status-' + mission.statut.toLowerCase().replace(' ', '-')">
                    {{ mission.statut }}
                  </span>
                </td>
                <td>
                  <button class="action-btn">Ouvrir</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      background: var(--gray-50);
      min-height: calc(100vh - 8vh);
      position: relative;
    }

    .dashboard-header {
      margin-bottom: 32px;
    }

    .dashboard-header h1 {
      margin: 0 0 8px 0;
      color: var(--primary-color);
      font-size: var(--font-size-xl);
      font-weight: 700;
    }

    .dashboard-header p {
      margin: 0;
      color: var(--gray-600);
      font-size: var(--font-size-md);
    }

    /* Section des filtres */
    .filter-section {
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filter-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: white;
      border: 2px solid var(--gray-300);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
      position: relative;
    }

    .filter-btn:hover {
      border-color: var(--primary-color);
      background: var(--gray-50);
    }

    .filter-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .filter-count {
      background: var(--secondary-color);
      color: white;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }

    .filter-btn.active .filter-count {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Tags des filtres actifs */
    .active-filters {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(34, 109, 104, 0.1);
      color: var(--primary-color);
      padding: 4px 8px;
      border-radius: 16px;
      font-size: var(--font-size-sm);
      font-weight: 500;
    }

    .remove-filter {
      background: none;
      border: none;
      color: var(--primary-color);
      cursor: pointer;
      font-weight: bold;
      padding: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .remove-filter:hover {
      background: var(--primary-color);
      color: white;
    }

    .clear-all-filters {
      background: var(--error-color);
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: var(--font-size-sm);
      cursor: pointer;
      font-weight: 500;
    }

    .clear-all-filters:hover {
      background: #dc2626;
    }

    /* Panel de filtres */
    .filter-panel {
      position: fixed;
      top: 8vh;
      left: -400px;
      width: 380px;
      height: calc(100vh - 8vh);
      background: white;
      box-shadow: var(--shadow-xl);
      z-index: 1000;
      transition: left 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .filter-panel.open {
      left: 0;
    }

    .filter-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--gray-200);
      background: var(--primary-color);
      color: white;
    }

    .filter-panel-header h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    .close-panel {
      background: none;
      border: none;
      color: white;
      font-size: var(--font-size-xl);
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-panel:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
    }

    .filter-group {
      border-bottom: 1px solid var(--gray-200);
    }

    .filter-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .filter-group-header:hover {
      background: var(--gray-50);
    }

    .filter-group-title {
      font-weight: 600;
      color: var(--gray-800);
    }

    .selected-count {
      color: var(--primary-color);
      font-weight: 600;
      font-size: var(--font-size-sm);
    }

    .filter-options {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .filter-options.open {
      max-height: 400px;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
      padding: 12px 24px;
      border-bottom: 1px solid var(--gray-100);
    }

    .select-all, .deselect-all {
      background: none;
      border: 1px solid var(--gray-300);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: var(--font-size-sm);
      cursor: pointer;
      color: var(--gray-600);
    }

    .select-all:hover, .deselect-all:hover {
      background: var(--gray-50);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .filter-option {
      padding: 8px 24px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: var(--font-size-md);
      color: var(--gray-700);
    }

    .checkbox-label input[type="checkbox"] {
      display: none;
    }

    .checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid var(--gray-300);
      border-radius: 4px;
      position: relative;
      transition: all 0.2s ease;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkmark {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: bold;
      font-size: 12px;
    }

    .filter-panel-footer {
      padding: 20px 24px;
      border-top: 1px solid var(--gray-200);
      background: var(--gray-50);
    }

    .apply-filters {
      width: 100%;
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .apply-filters:hover {
      background: var(--primary-dark);
    }

    /* Overlay */
    .filter-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .filter-overlay.visible {
      opacity: 1;
      visibility: visible;
    }

    /* Tableau des missions */
    .missions-table-container {
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .table-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--gray-200);
      background: var(--gray-50);
    }

    .table-header h2 {
      margin: 0;
      color: var(--gray-800);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .missions-table {
      width: 100%;
      border-collapse: collapse;
    }

    .missions-table th,
    .missions-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--gray-200);
    }

    .missions-table th {
      background: var(--gray-50);
      font-weight: 600;
      color: var(--gray-700);
      font-size: var(--font-size-md);
    }

    .missions-table td {
      color: var(--gray-800);
      font-size: var(--font-size-md);
    }

    .mission-row:hover {
      background: var(--gray-50);
    }

    .mission-name {
      font-weight: 600;
      color: var(--primary-color);
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-ouvert {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
    }

    .status-fermé {
      background: rgba(107, 114, 128, 0.1);
      color: var(--gray-600);
    }

    .status-en-cours {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
    }

    .status-terminé {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
    }

    .action-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 500;
    }

    .action-btn:hover {
      background: var(--primary-dark);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .filter-panel {
        width: 100%;
        left: -100%;
      }
      
      .dashboard-container {
        padding: 16px;
      }
      
      .missions-table {
        font-size: var(--font-size-sm);
      }
      
      .missions-table th,
      .missions-table td {
        padding: 8px 12px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  showFilterPanel = false;
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];

  filterGroups: FilterGroup[] = [
    {
      key: 'groupe',
      label: 'Groupe',
      isOpen: false,
      options: [
        { value: '123456', label: '123456 - TEST', selected: false },
        { value: '456123', label: '456123 - MAJORELLE', selected: false },
        { value: '114629', label: '114629 - BPI', selected: false }
      ]
    },
    {
      key: 'dossier',
      label: 'Dossier',
      isOpen: false,
      options: [
        { value: '123456', label: '123456 - TEST', selected: false },
        { value: '456123', label: '456123 - MAJORELLE', selected: false },
        { value: '114629', label: '114629 - BPI', selected: false }
      ]
    },
    {
      key: 'bureau',
      label: 'Bureau',
      isOpen: false,
      options: [
        { value: 'neuilly', label: 'Neuilly', selected: false },
        { value: 'rennes', label: 'Rennes', selected: false },
        { value: 'lyon', label: 'Lyon', selected: false }
      ]
    },
    {
      key: 'departement',
      label: 'Département',
      isOpen: false,
      options: [
        { value: 'ec', label: 'EC', selected: false },
        { value: 'bpo', label: 'BPO', selected: false },
        { value: 'ibas', label: 'IBAS', selected: false }
      ]
    },
    {
      key: 'associe',
      label: 'Associé',
      isOpen: false,
      options: [
        { value: 'michel-joly', label: 'Michel JOLY', selected: false },
        { value: 'yvan-malnuit', label: 'Yvan MALNUIT', selected: false },
        { value: 'herve-sauce', label: 'Hervé SAUCE', selected: false }
      ]
    },
    {
      key: 'dmcmFactureur',
      label: 'DMCM/Factureur',
      isOpen: false,
      options: [
        { value: 'alexis-brunet', label: 'Alexis BRUNET', selected: false },
        { value: 'gautier-tirel', label: 'Gautier TIREL', selected: false },
        { value: 'jonathan-sarail', label: 'Jonathan SARAIL', selected: false }
      ]
    },
    {
      key: 'mission',
      label: 'Mission',
      isOpen: false,
      options: [
        { value: '210', label: '210', selected: false },
        { value: '220', label: '220', selected: false },
        { value: '370', label: '370', selected: false }
      ]
    },
    {
      key: 'millesime',
      label: 'Millésime',
      isOpen: false,
      options: [
        { value: '2025', label: '2025', selected: false },
        { value: '2024', label: '2024', selected: false },
        { value: '2023', label: '2023', selected: false }
      ]
    },
    {
      key: 'etatDossier',
      label: 'État dossier',
      isOpen: false,
      options: [
        { value: 'ouvert', label: 'Ouvert', selected: false },
        { value: 'ferme', label: 'Fermé', selected: false }
      ]
    },
    {
      key: 'nafSection',
      label: 'NAF section',
      isOpen: false,
      options: [
        { value: 'industrie', label: 'Industrie', selected: false },
        { value: 'enseignement', label: 'Enseignement', selected: false },
        { value: 'commerce', label: 'Commerce', selected: false }
      ]
    },
    {
      key: 'moisCloture',
      label: 'Mois clôture',
      isOpen: false,
      options: [
        { value: 'janvier', label: 'Janvier', selected: false },
        { value: 'fevrier', label: 'Février', selected: false },
        { value: 'mars', label: 'Mars', selected: false }
      ]
    },
    {
      key: 'formeJuridique',
      label: 'Forme juridique',
      isOpen: false,
      options: [
        { value: 'sas', label: 'SAS', selected: false },
        { value: 'sarl', label: 'SARL', selected: false },
        { value: 'sci', label: 'SCI', selected: false }
      ]
    }
  ];

  ngOnInit(): void {
    this.generateMockData();
    this.applyFilters();
  }

  private generateMockData(): void {
    const groupes = ['123456 - TEST', '456123 - MAJORELLE', '114629 - BPI'];
    const dossiers = ['123456 - TEST', '456123 - MAJORELLE', '114629 - BPI'];
    const bureaux = ['Neuilly', 'Rennes', 'Lyon'];
    const departements = ['EC', 'BPO', 'IBAS'];
    const associes = ['Michel JOLY', 'Yvan MALNUIT', 'Hervé SAUCE'];
    const dmcmFactureurs = ['Alexis BRUNET', 'Gautier TIREL', 'Jonathan SARAIL'];
    const missions = ['210', '220', '370'];
    const millesimes = ['2025', '2024', '2023'];
    const etats = ['Ouvert', 'Fermé'];
    const nafSections = ['Industrie', 'Enseignement', 'Commerce'];
    const moisClotures = ['Janvier', 'Février', 'Mars'];
    const formesJuridiques = ['SAS', 'SARL', 'SCI'];
    const statuts = ['En cours', 'Terminé', 'En attente'];

    for (let i = 1; i <= 50; i++) {
      this.missions.push({
        id: `mission-${i}`,
        nom: `Mission ${i}`,
        groupe: groupes[Math.floor(Math.random() * groupes.length)],
        dossier: dossiers[Math.floor(Math.random() * dossiers.length)],
        bureau: bureaux[Math.floor(Math.random() * bureaux.length)],
        departement: departements[Math.floor(Math.random() * departements.length)],
        associe: associes[Math.floor(Math.random() * associes.length)],
        dmcmFactureur: dmcmFactureurs[Math.floor(Math.random() * dmcmFactureurs.length)],
        mission: missions[Math.floor(Math.random() * missions.length)],
        millesime: millesimes[Math.floor(Math.random() * millesimes.length)],
        etatDossier: etats[Math.floor(Math.random() * etats.length)],
        nafSection: nafSections[Math.floor(Math.random() * nafSections.length)],
        moisCloture: moisClotures[Math.floor(Math.random() * moisClotures.length)],
        formeJuridique: formesJuridiques[Math.floor(Math.random() * formesJuridiques.length)],
        statut: statuts[Math.floor(Math.random() * statuts.length)],
        dateCreation: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      });
    }
  }

  toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
  }

  toggleFilterGroup(filterGroup: FilterGroup): void {
    filterGroup.isOpen = !filterGroup.isOpen;
  }

  selectAll(filterGroup: FilterGroup): void {
    filterGroup.options.forEach(option => option.selected = true);
    this.onFilterChange();
  }

  deselectAll(filterGroup: FilterGroup): void {
    filterGroup.options.forEach(option => option.selected = false);
    this.onFilterChange();
  }

  onFilterChange(): void {
    // Appliquer les filtres en temps réel
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredMissions = this.missions.filter(mission => {
      return this.filterGroups.every(filterGroup => {
        const selectedOptions = filterGroup.options.filter(option => option.selected);
        
        // Si aucune option n'est sélectionnée dans ce groupe, on inclut tout
        if (selectedOptions.length === 0) {
          return true;
        }

        // Vérifier si la mission correspond à au moins une des options sélectionnées
        return selectedOptions.some(option => {
          switch (filterGroup.key) {
            case 'groupe':
              return mission.groupe.includes(option.value);
            case 'dossier':
              return mission.dossier.includes(option.value);
            case 'bureau':
              return mission.bureau.toLowerCase() === option.value.toLowerCase();
            case 'departement':
              return mission.departement.toLowerCase() === option.value.toLowerCase();
            case 'associe':
              return mission.associe.toLowerCase().includes(option.value.toLowerCase().replace('-', ' '));
            case 'dmcmFactureur':
              return mission.dmcmFactureur.toLowerCase().includes(option.value.toLowerCase().replace('-', ' '));
            case 'mission':
              return mission.mission === option.value;
            case 'millesime':
              return mission.millesime === option.value;
            case 'etatDossier':
              return mission.etatDossier.toLowerCase() === option.label.toLowerCase();
            case 'nafSection':
              return mission.nafSection.toLowerCase() === option.value.toLowerCase();
            case 'moisCloture':
              return mission.moisCloture.toLowerCase() === option.value.toLowerCase();
            case 'formeJuridique':
              return mission.formeJuridique.toLowerCase() === option.value.toLowerCase();
            default:
              return true;
          }
        });
      });
    });
  }

  getActiveFiltersCount(): number {
    return this.filterGroups.reduce((count, group) => {
      return count + group.options.filter(option => option.selected).length;
    }, 0);
  }

  getSelectedCount(filterGroup: FilterGroup): number {
    return filterGroup.options.filter(option => option.selected).length;
  }

  getActiveFilterTags(): Array<{groupKey: string, groupLabel: string, optionValue: string, optionLabel: string}> {
    const tags: Array<{groupKey: string, groupLabel: string, optionValue: string, optionLabel: string}> = [];
    
    this.filterGroups.forEach(group => {
      group.options.forEach(option => {
        if (option.selected) {
          tags.push({
            groupKey: group.key,
            groupLabel: group.label,
            optionValue: option.value,
            optionLabel: option.label
          });
        }
      });
    });
    
    return tags;
  }

  removeFilter(groupKey: string, optionValue: string): void {
    const group = this.filterGroups.find(g => g.key === groupKey);
    if (group) {
      const option = group.options.find(o => o.value === optionValue);
      if (option) {
        option.selected = false;
        this.applyFilters();
      }
    }
  }

  clearAllFilters(): void {
    this.filterGroups.forEach(group => {
      group.options.forEach(option => option.selected = false);
    });
    this.applyFilters();
  }
}