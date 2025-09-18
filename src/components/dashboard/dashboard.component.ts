import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService, UserProfile } from '../../services/auth.service';
import { environment } from '../../environments/environment';
import { FilterPanelComponent, ActiveFilters } from '../filter-panel/filter-panel.component';

interface MissionData {
  numeroGroupe: string;
  nomGroupe: string;
  numeroClient: string;
  nomClient: string;
  mission: string;
  avantMission: {
    percentage: number;
    conflitCheck: boolean;
    labGroupe: boolean;
    labDossier: boolean;
    cartoLabGroupe: boolean;
    cartoLabDossier: boolean;
    qac: boolean;
    qam: boolean;
    ldm: boolean;
  };
  pendantMission: {
    percentage: number;
    nog: boolean;
    checklist: boolean;
    revision: boolean;
    supervision: boolean;
  };
  finMission: {
    percentage: number;
    nds: boolean;
    cr: boolean;
    qmm: boolean;
    plaquette: boolean;
    restitution: boolean;
    finRelationClient: boolean;
  };
}

interface ClientGroup {
  numeroClient: string;
  nomClient: string;
  missions: MissionData[];
  expanded: boolean;
}

interface GroupData {
  numeroGroupe: string;
  nomGroupe: string;
  clients: ClientGroup[];
  expanded: boolean;
}

interface ModalData {
  isOpen: boolean;
  selectedFile2?: File | null;
  selectedFile3?: File | null;
  selectedFile4?: File | null;
  selectedFile5?: File | null;
  selectedFile6?: File | null;
  selectedFile7?: File | null;
  type?: string;
  title?: string;
  description?: string;
  acceptedTypes?: string;
  questionnaire?: {
    questions: Array<{
      id: number;
      text: string;
      answer: string;
    }>;
    isCompleted: boolean;
  };
  columnName: string;
  missionId: string;
  currentStatus: boolean;
  selectedFile: File | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, FilterPanelComponent],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <!-- Bouton Filtre -->
        <div class="filters-section">
          <button class="filter-btn" 
                  [class.active]="getActiveFiltersCount() > 0"
                  (click)="openFilterPanel()">
            <i class="fas fa-filter"></i>
            <span>Filtres</span>
            <span *ngIf="getActiveFiltersCount() > 0" class="filter-count">{{ getActiveFiltersCount() }}</span>
          </button>
        </div>
        <h1>Vue listing</h1>
        <div class="header-controls">
          <button class="expand-all-btn" (click)="toggleAllGroups()">
            <i class="fas" [ngClass]="allGroupsExpanded ? 'fa-folder-minus' : 'fa-folder-plus'"></i>
            {{ allGroupsExpanded ? 'Réduire tout' : 'Développer tout' }}
          </button>
        </div>
      </div>
    
      <!-- Panel de filtres -->
      <app-filter-panel 
        [isOpen]="isFilterPanelOpen"
        (closePanel)="closeFilterPanel()"
        (filtersChanged)="onFiltersChanged($event)">
      </app-filter-panel>

      <div class="table-wrapper">
        <table class="mission-table">
          <thead>
            <tr>
              <!--<th rowspan="2" class="group-header">
                <button class="collapse-btn" (click)="toggleAllGroups()">
                  {{ allGroupsExpanded ? '▼' : '▶' }}
                </button>
              </th>-->
              <!-- Groupe Information -->
              <th colspan="5" class="column-group-header information">
                Information groupe / client / mission
              </th>
              <!-- Groupe Avant la mission -->
              <th [attr.colspan]="avantMissionCollapsed ? 1 : 7" class="column-group-header avant-mission">
                <button class="collapse-btn" (click)="toggleColumnGroup('avantMission')">
                  <i class="fas" [ngClass]="avantMissionCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                </button>
                Avant la mission
              </th>
              <!-- Groupe Pendant la mission -->
              <th [attr.colspan]="pendantMissionCollapsed ? 1 : 5" class="column-group-header pendant-mission">
                <button class="collapse-btn" (click)="toggleColumnGroup('pendantMission')">
                  <i class="fas" [ngClass]="pendantMissionCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                </button>
                Pendant la mission
              </th>
              <!-- Groupe Fin de mission -->
              <th [attr.colspan]="finMissionCollapsed ? 1 : 7" class="column-group-header fin-mission">
                <button class="collapse-btn" (click)="toggleColumnGroup('finMission')">
                  <i class="fas" [ngClass]="finMissionCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                </button>
                Fin de mission
              </th>
            </tr>
            <tr>
              <!-- Information columns -->
              <th class="column-header"></th>
              <th class="column-header"></th>
              <th class="column-header"></th>
              <th class="column-header"></th>
              <th class="column-header"></th>
              
              <!-- Avant la mission columns -->
              <th class="column-header percentage">%</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">Conflit<br>Check</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">LAB</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">Carto<br>LAB</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">QAC</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">QAM</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">LDM</th>
              
              <!-- Pendant la mission columns -->
              <th class="column-header percentage">%</th>
              <th *ngIf="!pendantMissionCollapsed" class="column-header">NOG</th>
              <th *ngIf="!pendantMissionCollapsed" class="column-header">Checklist</th>
              <th *ngIf="!pendantMissionCollapsed" class="column-header">Révision</th>
              <th *ngIf="!pendantMissionCollapsed" class="column-header">Supervision</th>
              
              <!-- Fin de mission columns -->
              <th class="column-header percentage">%</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">NDS</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">CR</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">QMM</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">Plaquette</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">Restitution</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">Fin Relation<br>Client</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let group of paginatedData; let groupIndex = index">
              <!-- Ligne de groupe -->
              <tr class="group-row main-group" (click)="toggleMainGroup($event, groupIndex)">
                <!--<td class="group-cell">
                  <button class="collapse-btn">
                    {{ group.expanded ? '▼' : '▶' }}
                  </button>
                  <strong>{{ group.numeroGroupe }} - {{ group.nomGroupe }}</strong>
                </td>-->
                <td colspan="5" class="group-summary">
                  <div class="group-cell">
                    <div class="collapse-btn-container">
                      <button class="collapse-btn">
                        <i class="fas" [ngClass]="group.expanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                      </button>
                    </div>
                    <div class="group-info">
                      <strong class="groupe-libelle">{{ group.numeroGroupe }} - {{ group.nomGroupe }}</strong>
                      <div class="container-info-groupe">
                        <div class="element-info-groupe"><i class="fas fa-users"></i> {{ getTotalClientsInGroup(group) }} client(s)</div>
                        <div class="element-info-groupe"><i class="fas fa-briefcase"></i> {{ getTotalMissionsInGroup(group) }} mission(s)</div>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="percentage-cell">
                  <div class="progress-circle" [attr.data-percentage]="getGroupeAverage(group, 'avantMission')">
                    {{ getGroupeAverage(group, 'avantMission') }}%
                  </div>
                </td>
                <td *ngIf="!avantMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'avantMission', 'checklist')"></div>
                </td>
                <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LAB', group.clients[0].missions[0].numeroGroupe + '-' + group.clients[0].missions[0].numeroClient + '-' + group.clients[0].missions[0].mission, group.clients[0].missions[0].avantMission.labGroupe)">
                  <i class="fas status-icon" 
                      [ngClass]="group.clients[0].missions[0].avantMission.labGroupe ? 'fa-check-circle' : 'fa-pen'"
                      [class.completed]="group.clients[0].missions[0].avantMission.labGroupe"></i>
                </td>
                <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Carto LAB', group.clients[0].missions[0].numeroGroupe + '-' + group.clients[0].missions[0].numeroClient + '-' + group.clients[0].missions[0].mission, group.clients[0].missions[0].avantMission.cartoLabGroupe)">
                  <i class="fas status-icon" 
                      [ngClass]="group.clients[0].missions[0].avantMission.cartoLabGroupe ? 'fa-check-circle' : 'fa-pen'"
                      [class.completed]="group.clients[0].missions[0].avantMission.cartoLabGroupe"></i>
                </td>
                <td *ngIf="!avantMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'avantMission', 'qac')"></div>
                </td>
                <td *ngIf="!avantMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'avantMission', 'qam')">
                    {{ getGroupeRecap(group, 'avantMission', 'qam') }}
                  </div>
                </td>
                <td *ngIf="!avantMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'avantMission', 'ldm')">
                    {{ getGroupeRecap(group, 'avantMission', 'ldm') }}
                  </div>
                </td>

                <td class="percentage-cell">
                  <div class="progress-circle" [attr.data-percentage]="getGroupeAverage(group, 'pendantMission')">
                    {{ getGroupeAverage(group, 'pendantMission') }}%
                  </div>
                </td>
                <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'pendantMission', 'nog')">
                      {{ getGroupeRecap(group, 'pendantMission', 'nog') }}
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'pendantMission', 'checklist')">
                      {{ getGroupeRecap(group, 'pendantMission', 'checklist') }}
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'pendantMission', 'revision')">
                      {{ getGroupeRecap(group, 'pendantMission', 'revision') }}
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'pendantMission', 'supervision')">
                      {{ getGroupeRecap(group, 'pendantMission', 'supervision') }}
                    </div>
                  </td>

                <td class="percentage-cell">
                  <div class="progress-circle" [attr.data-percentage]="getGroupeAverage(group, 'finMission')">
                    {{ getGroupeAverage(group, 'finMission') }}%
                  </div>
                </td>
                <td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'nds')">
                    {{ getGroupeRecap(group, 'finMission', 'nds') }}
                  </div>
                </td>
                <td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'cr')">
                    {{ getGroupeRecap(group, 'finMission', 'cr') }}
                  </div>
                </td>
                <td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'qmm')">
                    {{ getGroupeRecap(group, 'finMission', 'qmm') }}
                  </div>
                </td>
                <td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'plaquette')">
                    {{ getGroupeRecap(group, 'finMission', 'plaquette') }}
                  </div>
                </td>
                <td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'restitution')">
                    {{ getGroupeRecap(group, 'finMission', 'restitution') }}
                  </div>
                </td>
                <td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'finRelationClient')">
                    {{ getGroupeRecap(group, 'finMission', 'finRelationClient') }}
                  </div>
                </td>
              </tr>
              
              <!-- Groupes de clients -->
              <ng-container *ngFor="let client of group.clients; let clientIndex = index">
                <!-- Ligne de sous-groupe (client) -->
                <tr class="group-row client-group" 
                    [class.hidden]="!group.expanded"
                    (click)="toggleClientGroup($event, groupIndex, clientIndex)">
                  <!--<td class="client-indent"></td>-->
                  <td class="client-cell" colspan="5">
                    <div class="client-row">
                      <button class="collapse-btn">
                        <i class="fas" [ngClass]="client.expanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                      </button>
                      <strong>{{ client.numeroClient }} - {{ client.nomClient }}</strong>
                      <span class="client-summary">
                        <i class="fas fa-briefcase"></i> {{ getTotalMissionsInClient(group, client) }} mission(s)
                      </span>
                    </div>
                  </td>
                  
                  <!-- Colonnes vides pour l'alignement -->
                  <td class="percentage-cell">
                    <div class="progress-circle" [attr.data-percentage]="getClientAverage(client, 'avantMission')">
                      {{ getClientAverage(client, 'avantMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Conflit Check', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].mission, client.missions[0].avantMission.conflitCheck)">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.conflitCheck ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.conflitCheck"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LAB', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].mission, client.missions[0].avantMission.labDossier)">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.labDossier ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.labDossier"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Carto LAB', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].mission, client.missions[0].avantMission.cartoLabDossier)">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.cartoLabDossier ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.cartoLabDossier"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('QAC', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].mission, client.missions[0].avantMission.qac)">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.qac ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.qac"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'avantMission', 'qam')">
                      {{ getClientRecap(client, 'avantMission', 'qam') }}
                    </div>
                  </td>
                  <td *ngIf="!avantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'avantMission', 'ldm')">
                      {{ getClientRecap(client, 'avantMission', 'ldm') }}
                    </div>
                  </td>

                  <td class="percentage-cell">
                    <div class="progress-circle" [attr.data-percentage]="getClientAverage(client, 'pendantMission')">
                      {{ getClientAverage(client, 'pendantMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'pendantMission', 'nog')">
                      {{ getClientRecap(client, 'pendantMission', 'nog') }}
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'pendantMission', 'checklist')">
                      {{ getClientRecap(client, 'pendantMission', 'checklist') }}
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'pendantMission', 'revision')">
                      {{ getClientRecap(client, 'pendantMission', 'revision') }}
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'pendantMission', 'supervision')">
                      {{ getClientRecap(client, 'pendantMission', 'supervision') }}
                    </div>
                  </td>
                  
                  <td class="percentage-cell">
                    <div class="progress-circle" [attr.data-percentage]="getClientAverage(client, 'finMission')">
                      {{ getClientAverage(client, 'finMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'nds')">
                      {{ getClientRecap(client, 'finMission', 'nds') }}
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'cr')">
                      {{ getClientRecap(client, 'finMission', 'cr') }}
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'qmm')">
                      {{ getClientRecap(client, 'finMission', 'qmm') }}
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'plaquette')">
                      {{ getClientRecap(client, 'finMission', 'plaquette') }}
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'restitution')">
                      {{ getClientRecap(client, 'finMission', 'restitution') }}
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'finRelationClient')">
                      {{ getClientRecap(client, 'finMission', 'finRelationClient') }}
                    </div>
                  </td>
                </tr>
                
                <!-- Missions du client -->
                <tr *ngFor="let mission of client.missions" 
                    class="mission-row" 
                    [class.hidden]="!group.expanded || !client.expanded">
                  <!--<td class="mission-indent"></td>-->
                  
                  <!-- Information -->
                  <!--<td>{{ mission.numeroGroupe }}</td>-->
                  <!--<td>{{ mission.nomGroupe }}</td>-->
                  <!--<td>{{ mission.numeroClient }}</td>-->
                  <!--<td>{{ mission.nomClient }}</td>-->
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{{ mission.mission }}</td>
                  
                  <!-- Avant la mission -->
                  <td class="percentage-cell">
                    <div class="progress-circle" [attr.data-percentage]="mission.avantMission.percentage">
                      {{ mission.avantMission.percentage }}%
                    </div>
                  </td>
                  <td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>
                  <td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>
                  <td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>
                  <td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('QAM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.avantMission.qam)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.avantMission.qam ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.avantMission.qam"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LDM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.avantMission.ldm)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.avantMission.ldm ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.avantMission.ldm"></i>
                  </td>
                  
                  <!-- Pendant la mission -->
                  <td class="percentage-cell">
                    <div class="progress-circle" [attr.data-percentage]="mission.pendantMission.percentage">
                      {{ mission.pendantMission.percentage }}%
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('NOG', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.pendantMission.nog)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.nog ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.pendantMission.nog"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Checklist', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.pendantMission.checklist)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.checklist ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.pendantMission.checklist"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Révision', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.pendantMission.revision)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.revision ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.pendantMission.revision"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Supervision', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.pendantMission.supervision)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.supervision ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.pendantMission.supervision"></i>
                  </td>
                  
                  <!-- Fin de mission -->
                  <td class="percentage-cell">
                    <div class="progress-circle" [attr.data-percentage]="mission.finMission.percentage">
                      {{ mission.finMission.percentage }}%
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('NDS', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.nds)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.nds ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.finMission.nds"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('CR Mission', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.cr)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.cr ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.finMission.cr"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('QMM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.qmm)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.qmm ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.finMission.qmm"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Plaquette', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.plaquette)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.plaquette ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.finMission.plaquette"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Restitution communication client', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.restitution)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.restitution ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.finMission.restitution"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Fin relation client', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.finRelationClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.finRelationClient ? 'fa-check-circle' : 'fa-pen'"
                       [class.completed]="mission.finMission.finRelationClient"></i>
                  </td>
                </tr>
              </ng-container>
            </ng-container>
          </tbody>
        </table>
      </div>

      <div class="pagination-footer">
        <div class="pagination-container">
          <div class="mission-count-display">
            {{ startIndex + 1 }}-{{ endIndex }} sur {{ totalMissions }} missions
          </div