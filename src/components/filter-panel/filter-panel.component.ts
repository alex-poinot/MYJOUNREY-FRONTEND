import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
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
          <div *ngFor="let group of filterGroups" class="filter-group">
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
    
    .filter-tag button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .filter-groups {
      padding: 1vh 0;
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

  filterGroups: FilterGroup[] = [
    {
      key: 'groupe',
      label: 'Groupe',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: '123456', label: '123456 - TEST', selected: false },
        { value: '456123', label: '456123 - MAJORELLE', selected: false },
        { value: '114629', label: '114629 - BPI', selected: false }
      ]
    },
    {
      key: 'dossier',
      label: 'Dossier',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: '123456', label: '123456 - TEST', selected: false },
        { value: '456123', label: '456123 - MAJORELLE', selected: false },
        { value: '114629', label: '114629 - BPI', selected: false }
      ]
    },
    {
      key: 'bureau',
      label: 'Bureau',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'neuilly', label: 'Neuilly', selected: false },
        { value: 'rennes', label: 'Rennes', selected: false },
        { value: 'lyon', label: 'Lyon', selected: false }
      ]
    },
    {
      key: 'departement',
      label: 'Département',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'ec', label: 'EC', selected: false },
        { value: 'bpo', label: 'BPO', selected: false },
        { value: 'ibas', label: 'IBAS', selected: false }
      ]
    },
    {
      key: 'associe',
      label: 'Associé',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'michel_joly', label: 'Michel JOLY', selected: false },
        { value: 'yvan_malnuit', label: 'Yvan MALNUIT', selected: false },
        { value: 'herve_sauce', label: 'Hervé SAUCE', selected: false }
      ]
    },
    {
      key: 'dmcm_factureur',
      label: 'DMCM/Factureur',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'alexis_brunet', label: 'Alexis BRUNET', selected: false },
        { value: 'gautier_tirel', label: 'Gautier TIREL', selected: false },
        { value: 'jonathan_sarail', label: 'Jonathan SARAIL', selected: false }
      ]
    },
    {
      key: 'mission',
      label: 'Mission',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: '210', label: '210', selected: false },
        { value: '220', label: '220', selected: false },
        { value: '370', label: '370', selected: false }
      ]
    },
    {
      key: 'millesime',
      label: 'Millésime',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: '2025', label: '2025', selected: false },
        { value: '2024', label: '2024', selected: false },
        { value: '2023', label: '2023', selected: false }
      ]
    },
    {
      key: 'etat_dossier',
      label: 'État dossier',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'ouvert', label: 'Ouvert', selected: false },
        { value: 'ferme', label: 'Fermé', selected: false }
      ]
    },
    {
      key: 'naf_section',
      label: 'NAF section',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'industrie', label: 'Industrie', selected: false },
        { value: 'enseignement', label: 'Enseignement', selected: false },
        { value: 'commerce', label: 'Commerce', selected: false }
      ]
    },
    {
      key: 'mois_cloture',
      label: 'Mois clôture',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'janvier', label: 'Janvier', selected: false },
        { value: 'fevrier', label: 'Février', selected: false },
        { value: 'mars', label: 'Mars', selected: false }
      ]
    },
    {
      key: 'forme_juridique',
      label: 'Forme juridique',
      collapsed: true,
      searchTerm: '',
      options: [
        { value: 'sas', label: 'SAS', selected: false },
        { value: 'sarl', label: 'SARL', selected: false },
        { value: 'sci', label: 'SCI', selected: false }
      ]
    }
  ];

  constructor() {
    // Initialiser les options filtrées
    this.filterGroups.forEach(group => {
      group.filteredOptions = [...group.options];
    });
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
    return this.filterGroups.reduce((count, group) => 
      count + group.options.filter(option => option.selected).length, 0
    );
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
        this.emitFiltersChanged();
      }
    }
  }

  clearAllFilters(): void {
    this.filterGroups.forEach(group => {
      group.options.forEach(option => option.selected = false);
    });
    this.emitFiltersChanged();
  }

  private emitFiltersChanged(): void {
    const activeFilters: ActiveFilters = {};
    
    this.filterGroups.forEach(group => {
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
}