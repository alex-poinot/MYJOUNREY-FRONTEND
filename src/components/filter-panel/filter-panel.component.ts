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
              <div *ngFor="let option of group.options" class="filter-option">
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
      width: 400px;
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
      padding: 20px 24px;
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
      padding: 8px;
      border-radius: 4px;
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
      padding: 16px 24px;
      border-bottom: 1px solid var(--gray-200);
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
      padding: 6px 12px;
      border-radius: 4px;
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
      padding: 4px 8px;
      border-radius: 12px;
      font-size: var(--font-size-sm);
      gap: 6px;
    }
    
    .filter-tag button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 2px;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      transition: background-color 0.2s;
    }
    
    .filter-tag button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .filter-groups {
      padding: 16px 0;
    }
    
    .filter-group {
      border-bottom: 1px solid var(--gray-100);
    }
    
    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
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
      border: 1px solid var(--primary-color);
      color: var(--primary-color);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .select-all-btn:hover {
      background: var(--primary-color);
      color: white;
    }
    
    .group-options {
      padding: 8px 24px 16px 24px;
      background: var(--gray-25);
    }
    
    .filter-option {
      margin-bottom: 8px;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 0;
      transition: color 0.2s;
    }
    
    .checkbox-label:hover {
      color: var(--primary-color);
    }
    
    .checkbox-label input[type="checkbox"] {
      display: none;
    }
    
    .checkbox-custom {
      width: 16px;
      height: 16px;
      border: 2px solid var(--gray-300);
      border-radius: 3px;
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
    
    /* Responsive */
    @media (max-width: 768px) {
      .filter-panel {
        width: 100vw;
      }
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
      collapsed: false,
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
      options: [
        { value: 'ouvert', label: 'Ouvert', selected: false },
        { value: 'ferme', label: 'Fermé', selected: false }
      ]
    },
    {
      key: 'naf_section',
      label: 'NAF section',
      collapsed: true,
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
      options: [
        { value: 'sas', label: 'SAS', selected: false },
        { value: 'sarl', label: 'SARL', selected: false },
        { value: 'sci', label: 'SCI', selected: false }
      ]
    }
  ];

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
    group.options.forEach(option => option.selected = !allSelected);
    this.emitFiltersChanged();
  }

  areAllSelected(group: FilterGroup): boolean {
    return group.options.every(option => option.selected);
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