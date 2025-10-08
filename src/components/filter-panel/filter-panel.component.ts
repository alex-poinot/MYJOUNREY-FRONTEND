import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { HttpClientModule, HttpClient } from '@angular/common/http';

export interface FilterOption {
  key: string;
  value: string;
  label: string;
  selected: boolean;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  collapsed: boolean;
  searchTerm?: string;
  filteredOptions?: FilterOption[];
}

export interface ActiveFilters {
  [key: string]: string[];
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Overlay -->
    <div *ngIf="isOpen" class="filter-overlay" (click)="closePanelHandler()"></div>
    
    <!-- Panel de filtres -->
    <div class="filter-panel" [class.open]="isOpen">
      <div class="filter-header">
        <h3>Filtres</h3>
        <button class="close-btn" (click)="closePanelHandler()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="filter-content">
        <!-- Tags des filtres actifs -->
        <div *ngIf="getActiveFiltersCount() > 0" class="active-filters-section">
          <div class="active-filters-header">
            <span class="active-count">{{ getActiveFiltersCount() }} filtre(s) actif(s)</span>
            <button class="clear-all-btn" (click)="clearAllFilters()">
              <i class="fas fa-trash"></i> Tout effacer
            </button>
          </div>
          <div class="active-filters-tags">
            <div *ngFor="let tag of getActiveFilterTags()" class="filter-tag">
              <span>{{ tag.groupLabel }}: {{ tag.optionLabel }}</span>
              <button (click)="removeFilter(tag.groupKey, tag.optionValue)">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Groupes de filtres -->
        <div class="filter-groups">

          <div class="filter-group-categorie">
            <div class="libelle-filter-categorie">Filtres sur les dossiers</div>
            <div *ngFor="let group of filterGroupsDossier" class="filter-group">
              <div class="group-header" (click)="toggleGroup(group)">
                <div class="group-title">
                  <i class="fas" [class.fa-chevron-down]="!group.collapsed" [class.fa-chevron-right]="group.collapsed"></i>
                  <span>{{ group.label }}</span>
                  <span *ngIf="getSelectedCount(group) > 0" class="selected-count">({{ getSelectedCount(group) }})</span>
                </div>
                <div class="group-actions">
                  <button *ngIf="!group.collapsed" class="select-all-btn" (click)="selectAll(group, $event)">
                    {{ areAllSelected(group) ? 'Désélectionner tout' : 'Tout sélectionner' }}
                  </button>
                </div>
              </div>
              
              <div *ngIf="!group.collapsed" class="group-options">
                <!-- Input de recherche -->
                <div class="search-container">
                  <div class="search-input-wrapper">
                    <i class="fas fa-search search-icon"></i>
                    <input 
                      type="text" 
                      class="search-input"
                      [value]="group.searchTerm || ''"
                      (input)="onSearchChange(group, $event.target.value)"
                      placeholder="Rechercher..."
                      autocomplete="off">
                    <button 
                      *ngIf="group.searchTerm && group.searchTerm.length > 0"
                      class="clear-search-btn"
                      (click)="clearSearch(group)"
                      type="button">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
                
                <!-- Message si aucun résultat -->
                <div *ngIf="group.filteredOptions && group.filteredOptions.length === 0" class="no-results-message">
                  <i class="fas fa-search"></i>
                  <span>Aucun résultat trouvé</span>
                </div>
                
                <!-- Options filtrées -->
                <div class="container-list-option-filter">
                  <div *ngFor="let option of (group.filteredOptions || group.options | slice:0:50)" class="filter-option">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        [checked]="option.selected"
                        (change)="toggleOption(group, option)">
                      <span class="checkbox-custom"></span>
                      <span class="option-text">{{ option.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="filter-group-categorie">
            <div class="libelle-filter-categorie">Filtres sur les missions</div>
            <div *ngFor="let group of filterGroupsMission" class="filter-group">
              <div class="group-header" (click)="toggleGroup(group)">
                <div class="group-title">
                  <i class="fas" [class.fa-chevron-down]="!group.collapsed" [class.fa-chevron-right]="group.collapsed"></i>
                  <span>{{ group.label }}</span>
                  <span *ngIf="getSelectedCount(group) > 0" class="selected-count">({{ getSelectedCount(group) }})</span>
                </div>
                <div class="group-actions">
                  <button *ngIf="!group.collapsed" class="select-all-btn" (click)="selectAll(group, $event)">
                    {{ areAllSelected(group) ? 'Désélectionner tout' : 'Tout sélectionner' }}
                  </button>
                </div>
              </div>
              
              <div *ngIf="!group.collapsed" class="group-options">
                <!-- Input de recherche -->
                <div class="search-container">
                  <div class="search-input-wrapper">
                    <i class="fas fa-search search-icon"></i>
                    <input 
                      type="text" 
                      class="search-input"
                      [value]="group.searchTerm || ''"
                      (input)="onSearchChange(group, $event.target.value)"
                      placeholder="Rechercher..."
                      autocomplete="off">
                    <button 
                      *ngIf="group.searchTerm && group.searchTerm.length > 0"
                      class="clear-search-btn"
                      (click)="clearSearch(group)"
                      type="button">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
                
                <!-- Message si aucun résultat -->
                <div *ngIf="group.filteredOptions && group.filteredOptions.length === 0" class="no-results-message">
                  <i class="fas fa-search"></i>
                  <span>Aucun résultat trouvé</span>
                </div>
                
                <!-- Options filtrées -->
                <div class="container-list-option-filter">
                  <div *ngFor="let option of group.filteredOptions || group.options" class="filter-option">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        [checked]="option.selected"
                        (change)="toggleOption(group, option)">
                      <span class="checkbox-custom"></span>
                      <span class="option-text">{{ option.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
      opacity: 0;
      animation: fadeIn 0.3s ease forwards;
    }
    
    @keyframes fadeIn {
      to { opacity: 1; }
    }
    
    .filter-panel {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: 25vw;
      background: white;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    
    .filter-panel.open {
      transform: translateX(0);
    }
    
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5vh 1vw;
      border-bottom: 1px solid var(--gray-200);
      background: var(--primary-color);
      color: white;
    }
    
    .filter-header h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: var(--font-size-lg);
      cursor: pointer;
      padding: 0.5vw;
      border-radius: 0.5vw;
      transition: background-color 0.2s;
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .filter-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }
    
    .active-filters-section {
      padding: 1vh 1vw;
      border-bottom: 0.1vh solid var(--gray-200);
      background: var(--gray-50);
    }
    
    .active-filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .active-count {
      font-weight: 600;
      color: var(--primary-color);
      font-size: var(--font-size-md);
    }
    
    .clear-all-btn {
      background: var(--error-color);
      color: white;
      border: none;
      padding: 1vh 1vw;
      border-radius: 0.5vw;
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .clear-all-btn:hover {
      background: #dc2626;
    }
    
    .active-filters-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 20vh;
      overflow-y: auto;
    }
    
    .filter-tag {
      display: flex;
      align-items: center;
      background: var(--primary-color);
      color: white;
      padding: 0.5vh 0.5vw;
      border-radius: 0.8vw;
      font-size: var(--font-size-sm);
      gap: 0.3vw;
    }
    
    .filter-tag button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.2vh 0.1vw;
      border-radius: 50%;
      width: 1vw;
      height: 1vw;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-md);
      transition: background-color 0.2s;
    }

    .container-list-option-filter {
      max-height: 20vh;
      overflow-y: auto;
    }
    
    .filter-tag button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .filter-group {
      border-bottom: 1px solid var(--gray-100);
    }
    
    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1vh 1vw;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .group-header:hover {
      background: var(--gray-50);
    }

    .libelle-filter-categorie {
      background-color: var(--primary-light);
      color: white;
      padding: 0.4vh 0.4vw;
      font-size: var(--font-size-lg);
    }
    
    .group-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--gray-700);
      font-size: var(--font-size-lg);
    }
    
    .group-title i {
      font-size: var(--font-size-sm);
      color: var(--primary-color);
      transition: transform 0.2s;
    }

    .container-list-option-filter .option-text {
      max-width: 19vw;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .selected-count {
      background: var(--primary-color);
      color: white;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: var(--font-size-sm);
      font-weight: 500;
    }
    
    .group-actions {
      display: flex;
      align-items: center;
    }
    
    .select-all-btn {
      background: none;
      border: 0.1vh solid var(--primary-color);
      color: var(--primary-color);
      padding: 0.5vh 0.5vw;
      border-radius: 0.5vw;
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .select-all-btn:hover {
      background: var(--primary-color);
      color: white;
    }
    
    .group-options {
      padding: 1vh 1vw 1vh 2vw;
      background: var(--gray-25);
    }
    
    .search-container {
      margin-bottom: 12px;
    }
    
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .search-input {
      width: 100%;
      padding: 1vh 1vw 1vh 2vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.5vw;
      font-size: var(--font-size-sm);
      background: white;
      transition: all 0.2s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(34, 109, 104, 0.1);
    }
    
    .search-icon {
      position: absolute;
      left: 10px;
      color: var(--gray-400);
      font-size: var(--font-size-sm);
      pointer-events: none;
    }
    
    .clear-search-btn {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: var(--gray-400);
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      transition: all 0.2s;
    }
    
    .clear-search-btn:hover {
      background: var(--gray-100);
      color: var(--gray-600);
    }
    
    .no-results-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      color: var(--gray-500);
      font-size: var(--font-size-sm);
      font-style: italic;
      text-align: center;
      justify-content: center;
      background: var(--gray-50);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .filter-option {
      margin-bottom: 8px;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5vw;
      cursor: pointer;
      padding: 0.2vh 0;
      transition: color 0.2s;
    }
    
    .checkbox-label:hover {
      color: var(--primary-color);
    }
    
    .checkbox-label input[type="checkbox"] {
      display: none;
    }
    
    .checkbox-custom {
      width: 1vw;
      height: 2vh;
      border: 0.2vh solid var(--gray-300);
      border-radius: 0.2vw;
      position: relative;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    
    .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }
    
    .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 10px;
      font-weight: bold;
    }
    
    .option-text {
      font-size: var(--font-size-md);
      line-height: 1.4;
    }
  `]
})
export class FilterPanelComponent {
  @Input() isOpen = false;
  @Output() closePanel = new EventEmitter<void>();
  @Output() filtersChanged = new EventEmitter<ActiveFilters>();

  filterGroupsDossier: FilterGroup[] = [
    {
      key: 'groupe',
      label: 'Groupe',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'dossier',
      label: 'Dossier',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'bureau_dossier',
      label: 'Bureau (A venir)',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'associe_dossier',
      label: 'Associé',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'etat_dossier',
      label: 'État dossier',
      collapsed: true,
      searchTerm: '',
      options: [
        { key: 'etat_dossier', value: 'ouvert', label: 'Ouvert', selected: true },
        { key: 'etat_dossier', value: 'ferme', label: 'Fermé', selected: false }
      ]
    },
    {
      key: 'naf_section',
      label: 'NAF section',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'mois_cloture',
      label: 'Mois clôture',
      collapsed: true,
      searchTerm: '',
      options: [
        { key: 'mois_cloture', value: '1', label: 'Janvier', selected: false },
        { key: 'mois_cloture', value: '2', label: 'Février', selected: false },
        { key: 'mois_cloture', value: '3', label: 'Mars', selected: false },
        { key: 'mois_cloture', value: '4', label: 'Avril', selected: false },
        { key: 'mois_cloture', value: '5', label: 'Mai', selected: false },
        { key: 'mois_cloture', value: '6', label: 'Juin', selected: false },
        { key: 'mois_cloture', value: '7', label: 'Juillet', selected: false },
        { key: 'mois_cloture', value: '8', label: 'Août', selected: false },
        { key: 'mois_cloture', value: '9', label: 'Septembre', selected: false },
        { key: 'mois_cloture', value: '10', label: 'Octobre', selected: false },
        { key: 'mois_cloture', value: '11', label: 'Novembre', selected: false },
        { key: 'mois_cloture', value: '12', label: 'Décembre', selected: false }
      ]
    },
    {
      key: 'forme_juridique',
      label: 'Forme juridique',
      collapsed: true,
      searchTerm: '',
      options: []
    }
  ];

  filterGroupsMission: FilterGroup[] = [
    {
      key: 'bureau_mission',
      label: 'Bureau',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'associe_mission',
      label: 'Associé',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'dmcm_factureur',
      label: 'DMCM/Factureur',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'mission',
      label: 'Mission',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'millesime',
      label: 'Millésime',
      collapsed: true,
      searchTerm: '',
      options: []
    },
    {
      key: 'etat_mission',
      label: 'État mission',
      collapsed: true,
      searchTerm: '',
      options: [
        { key: 'etat_mission', value: 'ouvert', label: 'Ouverte', selected: true },
        { key: 'etat_mission', value: 'ferme', label: 'Fermée', selected: false }
      ]
    }
  ];

  constructor(private http: HttpClient) {
    // Initialiser les options filtrées
    this.filterGroupsDossier.forEach(group => {
      group.filteredOptions = [...group.options];
    });
    this.filterGroupsMission.forEach(group => {
      group.filteredOptions = [...group.options];
    });
  }

  ngOnInit(): void {
    this.loadListeGroupeFilter();
    this.loadListeDossierFilter();
    this.loadListeBureauxFilter();
    this.loadListeMissionsFilter();
    this.loadListeMillesimesFilter();
    this.loadListeFormesJuridiqueFilter();
    this.loadListeNafsFilter();
    this.loadListeDmcmFactFilter();
    this.loadListeAssociesFilter();
  }

  onSearchChange(group: FilterGroup, searchTerm: string): void {
    group.searchTerm = searchTerm;
    if (!searchTerm.trim()) {
      group.filteredOptions = [...group.options];
    } else {
      const term = searchTerm.toLowerCase();
      group.filteredOptions = group.options.filter(option =>
        option.label.toLowerCase().includes(term)
      );
    }
  }

  clearSearch(group: FilterGroup): void {
    group.searchTerm = '';
    group.filteredOptions = [...group.options];
  }
  toggleGroup(group: FilterGroup): void {
    group.collapsed = !group.collapsed;
  }

  toggleOption(group: FilterGroup, option: FilterOption): void {
    option.selected = !option.selected;
    this.emitFiltersChanged();
  }

  selectAll(group: FilterGroup, event: Event): void {
    event.stopPropagation();
    const allSelected = this.areAllSelected(group);
    // Appliquer seulement aux options filtrées visibles
    const optionsToToggle = group.filteredOptions || group.options;
    optionsToToggle.forEach(option => option.selected = !allSelected);
    this.emitFiltersChanged();
  }

  areAllSelected(group: FilterGroup): boolean {
    const optionsToCheck = group.filteredOptions || group.options;
    return optionsToCheck.length > 0 && optionsToCheck.every(option => option.selected);
  }

  getSelectedCount(group: FilterGroup): number {
    return group.options.filter(option => option.selected).length;
  }

  getActiveFiltersCount(): number {
    let countTot = this.filterGroupsDossier.reduce((count, group) => 
      count + group.options.filter(option => option.selected).length, 0
    );
    countTot += this.filterGroupsMission.reduce((count, group) => 
      count + group.options.filter(option => option.selected).length, 0
    );

    return countTot;
  }

  getActiveFilterTags(): Array<{groupKey: string, groupLabel: string, optionValue: string, optionLabel: string}> {
    const tags: Array<{groupKey: string, groupLabel: string, optionValue: string, optionLabel: string}> = [];
    
    this.filterGroupsDossier.forEach(group => {
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

    this.filterGroupsMission.forEach(group => {
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
    const group = this.filterGroupsDossier.find(g => g.key === groupKey);
    if (group) {
      const option = group.options.find(o => o.value === optionValue);
      if (option) {
        option.selected = false;
        this.emitFiltersChanged();
      }
    }

    const groupM = this.filterGroupsMission.find(g => g.key === groupKey);
    if (groupM) {
      const option = groupM.options.find(o => o.value === optionValue);
      if (option) {
        option.selected = false;
        this.emitFiltersChanged();
      }
    }
  }

  clearAllFilters(): void {
    this.filterGroupsDossier.forEach(group => {
      group.options.forEach(option => option.selected = false);
    });
    this.filterGroupsMission.forEach(group => {
      group.options.forEach(option => option.selected = false);
    });
    this.emitFiltersChanged();
  }

  private emitFiltersChanged(): void {
    const activeFilters: ActiveFilters = {};
    
    this.filterGroupsDossier.forEach(group => {
      const selectedValues = group.options
        .filter(option => option.selected)
        .map(option => option.value);
      if (selectedValues.length > 0) {
        activeFilters[group.key] = selectedValues;
      }
    });

    this.filterGroupsMission.forEach(group => {
      const selectedValues = group.options
        .filter(option => option.selected)
        .map(option => option.value);
      if (selectedValues.length > 0) {
        activeFilters[group.key] = selectedValues;
      }
    });
    
    this.filtersChanged.emit(activeFilters);
  }

  closePanelHandler(): void {
    this.closePanel.emit();
  }

  loadListeGroupeFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllGroupesFilter`)
      .subscribe((response) => {
        this.filterGroupsDossier[0].options = response.data.map(item => ({
          ...item,
          key: 'groupe'
        }));
        this.filterGroupsDossier[0].filteredOptions = [...this.filterGroupsDossier[0].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des groupes :', error);
      });
  }

  loadListeDossierFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllDossiersFilter`)
      .subscribe((response) => {
        this.filterGroupsDossier[1].options = response.data.map(item => ({
          ...item,
          key: 'dossier'
        }));
        this.filterGroupsDossier[1].filteredOptions = [...this.filterGroupsDossier[1].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des dossiers :', error);
      });
  }

  loadListeBureauxFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllBureauxFilter`)
      .subscribe((response) => {
        this.filterGroupsDossier[2].options = response.data.map(item => ({
          ...item,
          key: 'bureau_dossier'
        }));
        this.filterGroupsDossier[2].filteredOptions = [...this.filterGroupsDossier[2].options];
        this.filterGroupsMission[0].options = response.data.map(item => ({
          ...item,
          key: 'bureau_mission'
        }));
        this.filterGroupsMission[0].filteredOptions = [...this.filterGroupsMission[0].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des bureaux :', error);
      });
  }

  loadListeMissionsFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllMissionsFilter`)
      .subscribe((response) => {
        this.filterGroupsMission[3].options = response.data.map(item => ({
          ...item,
          key: 'mission'
        }));
        this.filterGroupsMission[3].filteredOptions = [...this.filterGroupsMission[3].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des missions :', error);
      });
  }

  loadListeMillesimesFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllMillesimesFilter`)
      .subscribe((response) => {
        this.filterGroupsMission[4].options = response.data.map(item => ({
          ...item,
          key: 'millesime'
        }));
        this.filterGroupsMission[4].filteredOptions = [...this.filterGroupsMission[4].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des missions :', error);
      });
  }

  loadListeFormesJuridiqueFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllFormesJuridiqueFilter`)
      .subscribe((response) => {
        this.filterGroupsDossier[7].options = response.data.map(item => ({
          ...item,
          key: 'forme_juridique'
        }));
        this.filterGroupsDossier[7].filteredOptions = [...this.filterGroupsDossier[7].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des formes juridique :', error);
      });
  }

  loadListeNafsFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllNafsFilter`)
      .subscribe((response) => {
        this.filterGroupsDossier[5].options = response.data.map(item => ({
          ...item,
          key: 'naf_section'
        }));
        this.filterGroupsDossier[5].filteredOptions = [...this.filterGroupsDossier[5].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des nafs :', error);
      });
  }

  loadListeDmcmFactFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllDmcmFactFilter`)
      .subscribe((response) => {
        this.filterGroupsMission[2].options = response.data.map(item => ({
          ...item,
          key: 'dmcm_factureur'
        }));
        this.filterGroupsMission[2].filteredOptions = [...this.filterGroupsMission[2].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des nafs :', error);
      });
  }

  loadListeAssociesFilter(): void {
    this.http.get<{ success: boolean; data: FilterOption[]; count: number; timestamp: string }>(`${environment.apiUrl}/filters/getAllAssociesFilter`)
      .subscribe((response) => {
         this.filterGroupsDossier[3].options = response.data.map(item => ({
          ...item,
          key: 'associe_dossier'
        }));
        this.filterGroupsDossier[3].filteredOptions = [...this.filterGroupsDossier[3].options];

        this.filterGroupsMission[1].options = response.data.map(item => ({
          ...item,
          key: 'associe_mission'
        }));
        this.filterGroupsMission[1].filteredOptions = [...this.filterGroupsMission[1].options];
      }, (error) => {
        console.error('Erreur lors de la récupération des nafs :', error);
      });
  }
}