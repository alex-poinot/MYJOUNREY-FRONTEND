import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService, UserProfile } from '../../services/auth.service';
import { environment } from '../../environments/environment';
import { FilterPanelComponent, ActiveFilters } from '../filter-panel/filter-panel.component';
import { tap } from 'rxjs/internal/operators/tap';
import { catchError } from 'rxjs/internal/operators/catchError';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { ClearCacheRequest } from '@azure/msal-browser';
import { ChangeDetectorRef } from '@angular/core';
import iziToast from 'izitoast';

interface MissionData {
  numeroGroupe: string;
  nomGroupe: string;
  numeroClient: string;
  nomClient: string;
  LIBELLE_MISSIONS: string;
  missionId: string;
  profilId: string;
  source: string;
  BUREAU_ID: string;
  MD_RESP_PRINCIPAL_MISS_SIRH: string;
  MD_MISSION: string;
  MD_MILLESIME: string;
  MD_ETAT: string;
  MD_DMCM_SIRH: string;
  MD_FACTUREUR_SIRH: string;
  DOS_BUREAU: string;
  DOS_ASSOCIE_SIRH: string;
  DOS_ETAT: string;
  NAF_ID: string;
  DOS_MOIS_CLOTURE: string;
  DOS_FORME_JURIDIQUE: string;
  avantMission: {
    percentage: number;
    conflitCheck: string;
    labGroupe: string;
    labDossier: string;
    cartoLabGroupe: string;
    cartoLabDossier: string;
    qac: string;
    qam: string;
    ldm: string;
    percentageAccess: number;
    conflitCheckAccess: string;
    labGroupeAccess: string;
    labDossierAccess: string;
    cartoLabGroupeAccess: string;
    cartoLabDossierAccess: string;
    qacAccess: string;
    qamAccess: string;
    ldmAccess: string;
  };
  pendantMission: {
    percentage: number;
    nog: string;
    checklist: string;
    revision: string;
    supervision: string;
    percentageAccess: number;
    nogAccess: string;
    checklistAccess: string;
    revisionAccess: string;
    supervisionAccess: string;
  };
  finMission: {
    percentage: number;
    nds: string;
    cr: string;
    qmm: string;
    plaquette: string;
    restitution: string;
    finRelationClient: string;
    percentageAccess: number;
    ndsAccess: string;
    crAccess: string;
    qmmAccess: string;
    plaquetteAccess: string;
    restitutionAccess: string;
    finRelationClientAccess: string;
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
  [key: string]: any;
  isOpen: boolean;
  selectedFile: File | null;
  selectedFileId: string;
  selectedFileDate: string;
  selectedFile2?: File | null;
  selectedFileId2?: string | '';
  selectedFileDate2?: string;
  selectedFileLab1?: Array<File>;
  selectedFileLab2?: Array<File>;
  selectedFileLab3?: Array<File>;
  selectedFileLab4?: Array<File>;
  selectedFileLab5?: Array<File>;
  selectedFileLab6?: Array<File>;
  selectedFileLab7?: Array<File>;
  selectedFileLabId1?: string[];
  selectedFileLabId2?: string[];
  selectedFileLabId3?: string[];
  selectedFileLabId4?: string[];
  selectedFileLabId5?: string[];
  selectedFileLabId6?: string[];
  selectedFileLabId7?: string[];
  selectedFileLabDate1?: string[];
  selectedFileLabDate2?: string[];
  selectedFileLabDate3?: string[];
  selectedFileLabDate4?: string[];
  selectedFileLabDate5?: string[];
  selectedFileLabDate6?: string[];
  selectedFileLabDate7?: string[];
  selectedFile3?: File | null;
  selectedFile4?: File | null;
  selectedFile5?: File | null;
  selectedFile6?: File | null;
  selectedFile7?: File | null;
  selectedFile8?: File | null;
  selectedFile9?: File | null;
  selectedFile10?: File | null;
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
  currentStatus: string;
  modifyMode: boolean;
  urlRedirection?: boolean;
  mission?: string;
  millesime?: string;
  dosPgi?: string;
  hasAccess: boolean;
}

interface InsertFile {
  MODFILE_Id: string;
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
        <div *ngIf="!tableDisplay" class="background-table-load"><i class="fa-solid fa-spinner-scale fa-spin-pulse" aria-hidden="true"></i></div>
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
              <th [attr.colspan]="avantMissionCollapsed ? 1 : 6" class="column-group-header avant-mission">
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
              <th [attr.colspan]="finMissionCollapsed ? 1 : 5" class="column-group-header fin-mission">
                <button class="collapse-btn" (click)="toggleColumnGroup('finMission')">
                  <i class="fas" [ngClass]="finMissionCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                </button>
                Synthèse mission
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
              <th *ngIf="!avantMissionCollapsed" class="column-header">Conflict<br>Check</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">LAB<br>doc</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">Carto<br>LAB</th>
              <!--<th *ngIf="!avantMissionCollapsed" class="column-header">QAC</th>-->
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
              <!--<th *ngIf="!finMissionCollapsed" class="column-header">CR</th>-->
              <th *ngIf="!finMissionCollapsed" class="column-header">QMM</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">Plaquette /<br>Att. / CR</th>
              <th *ngIf="!finMissionCollapsed" class="column-header">Restitution</th>
              <!--<th *ngIf="!finMissionCollapsed" class="column-header">Fin Relation<br>Client</th>-->
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="paginatedData.length == 0" class="row-no-data"><td colspan="100%">Pas de donnée</td></tr>
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
                  <div class="progress-circle" title="{{ getGroupeAverageCalcul(group, 'avantMission') }}" [attr.data-percentage]="getGroupeAverage(group, 'avantMission')">
                    {{ getGroupeAverage(group, 'avantMission') }}%
                  </div>
                </td>
                <td *ngIf="!avantMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'avantMission', 'conflitCheck')"></div>
                </td>
                <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LAB documentaire', group.clients[0].missions[0].numeroGroupe + '-' + group.clients[0].missions[0].numeroClient + '-' + group.clients[0].missions[0].MD_MISSION, group.clients[0].missions[0].avantMission.labGroupe, group.clients[0].missions[0].numeroGroupe, group.clients[0].missions[0].profilId, 'Groupe', '', '', '')">
                  <i class="fas status-icon" 
                      [ngClass]="group.clients[0].missions[0].avantMission.labGroupe == 'oui' ? 'fa-check-circle' : group.clients[0].missions[0].avantMission.labGroupe == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                      [class.completed]="group.clients[0].missions[0].avantMission.labGroupe == 'oui'"></i>
                  <i *ngIf="group.clients[0].missions[0].avantMission.labGroupeAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="group.clients[0].missions[0].avantMission.labGroupeAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                </td>
                <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Cartographie LAB', group.clients[0].missions[0].numeroGroupe + '-' + group.clients[0].missions[0].numeroClient + '-' + group.clients[0].missions[0].MD_MISSION, group.clients[0].missions[0].avantMission.cartoLabGroupe, group.clients[0].missions[0].numeroGroupe, group.clients[0].missions[0].profilId, 'Groupe', '', '', '')">
                  <i class="fas status-icon fa-person-digging"></i>
                      <!--[ngClass]="group.clients[0].missions[0].avantMission.cartoLabGroupe == 'oui' ? 'fa-check-circle' : group.clients[0].missions[0].avantMission.cartoLabGroupe == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                      [class.completed]="group.clients[0].missions[0].avantMission.cartoLabGroupe == 'oui'"></i>-->
                  <i *ngIf="group.clients[0].missions[0].avantMission.cartoLabGroupeAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="group.clients[0].missions[0].avantMission.cartoLabGroupeAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                </td>
                <!--<td *ngIf="!avantMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'avantMission', 'qac')"></div>
                </td>-->
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
                  <div class="progress-circle" title="{{ getGroupeAverageCalcul(group, 'pendantMission') }}" [attr.data-percentage]="getGroupeAverage(group, 'pendantMission')">
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
                  <div class="progress-circle" title="{{ getGroupeAverageCalcul(group, 'finMission') }}" [attr.data-percentage]="getGroupeAverage(group, 'finMission')">
                    {{ getGroupeAverage(group, 'finMission') }}%
                  </div>
                </td>
                <td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'nds')">
                    {{ getGroupeRecap(group, 'finMission', 'nds') }}
                  </div>
                </td>
                <!--<td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'cr')">
                    {{ getGroupeRecap(group, 'finMission', 'cr') }}
                  </div>
                </td>-->
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
                <!--<td *ngIf="!finMissionCollapsed">
                  <div class="recap-dossier" [innerHTML]="getGroupeRecap(group, 'finMission', 'finRelationClient')">
                    {{ getGroupeRecap(group, 'finMission', 'finRelationClient') }}
                  </div>
                </td>-->
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
                    <div class="progress-circle" title="{{ getClientAverageCalcul(client, 'avantMission') }}" [attr.data-percentage]="getClientAverage(client, 'avantMission')">
                      {{ getClientAverage(client, 'avantMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Conflict check', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].MD_MISSION, client.missions[0].avantMission.conflitCheck, client.missions[0].numeroClient, client.missions[0].profilId, 'Dossier', '', '', '')">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.conflitCheck == 'oui' ? 'fa-check-circle' : client.missions[0].avantMission.conflitCheck == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.conflitCheck == 'oui'"></i>
                    <i *ngIf="client.missions[0].avantMission.conflitCheckAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="client.missions[0].avantMission.conflitCheckAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LAB documentaire', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].MD_MISSION, client.missions[0].avantMission.labDossier, client.missions[0].numeroClient, client.missions[0].profilId, 'Dossier', '', '', '')">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.labDossier == 'oui' ? 'fa-check-circle' : client.missions[0].avantMission.labDossier == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.labDossier == 'oui'"></i>
                    <i *ngIf="client.missions[0].avantMission.labDossierAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="client.missions[0].avantMission.labDossierAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Cartographie LAB', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].MD_MISSION, client.missions[0].avantMission.cartoLabDossier, client.missions[0].numeroClient, client.missions[0].profilId, 'Dossier', '', '', '')">
                    <i class="fas status-icon fa-person-digging"></i>
                       <!--[ngClass]="client.missions[0].avantMission.cartoLabDossier == 'oui' ? 'fa-check-circle' : client.missions[0].avantMission.cartoLabDossier == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.cartoLabDossier == 'oui'"></i>-->
                    <i *ngIf="client.missions[0].avantMission.cartoLabDossierAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="client.missions[0].avantMission.cartoLabDossierAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <!--<td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('QAC', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].MD_MISSION, client.missions[0].avantMission.qac, client.missions[0].numeroClient, client.missions[0].profilId, 'Dossier', '', '', '')">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.qac == 'oui' ? 'fa-check-circle' : client.missions[0].avantMission.qac == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="client.missions[0].avantMission.qac == 'oui'"></i>
                    <i *ngIf="client.missions[0].avantMission.qacAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="client.missions[0].avantMission.qacAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>-->
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
                    <div class="progress-circle" title="{{ getClientAverageCalcul(client, 'pendantMission') }}" [attr.data-percentage]="getClientAverage(client, 'pendantMission')">
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
                    <div class="progress-circle" title="{{ getClientAverageCalcul(client, 'finMission') }}" [attr.data-percentage]="getClientAverage(client, 'finMission')">
                      {{ getClientAverage(client, 'finMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'nds')">
                      {{ getClientRecap(client, 'finMission', 'nds') }}
                    </div>
                  </td>
                  <!--<td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'cr')">
                      {{ getClientRecap(client, 'finMission', 'cr') }}
                    </div>
                  </td>-->
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
                  <!--<td *ngIf="!finMissionCollapsed">
                    <div class="recap-dossier" [innerHTML]="getClientRecap(client, 'finMission', 'finRelationClient')">
                      {{ getClientRecap(client, 'finMission', 'finRelationClient') }}
                    </div>
                  </td>-->
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
                  <td>
                    <div class="container-mission">
                      <div>{{ mission.MD_MISSION }}</div><div>&nbsp;-&nbsp;</div><div class="libelle-mission" title="{{ mission.LIBELLE_MISSIONS.trim() }}">{{ mission.LIBELLE_MISSIONS.trim() }}</div><div>&nbsp;-&nbsp;</div><div>{{ mission.MD_MILLESIME }}</div>
                      <!--<i class="info-mission-source fa-regular fa-info-circle" title="{{ mission.source }}" aria-hidden="true"></i>-->
                    </div>
                  </td>

                  <!-- Avant la mission -->
                  <td class="percentage-cell">
                    <div class="progress-circle" title="{{ getMissionAverageCalcul(mission, 'avantMission') }}" [attr.data-percentage]="getMissionAverage(mission, 'avantMission')">
                      {{ getMissionAverage(mission, 'avantMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>
                  <td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>
                  <td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>
                  <!--<td *ngIf="!avantMissionCollapsed"><span class="tiret-no-data">-</span></td>-->
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('QAM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.avantMission.qam, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.avantMission.qam == 'oui' ? 'fa-check-circle' : mission.avantMission.qam == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.avantMission.qam == 'oui'"></i>
                    <i *ngIf="mission.avantMission.qamAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.avantMission.qamAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LDM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.avantMission.ldm, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.avantMission.ldm == 'oui' ? 'fa-check-circle' : mission.avantMission.ldm == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.avantMission.ldm == 'oui'"></i>
                    <i *ngIf="mission.avantMission.ldmAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.avantMission.ldmAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  
                  <!-- Pendant la mission -->
                  <td class="percentage-cell">
                    <div class="progress-circle" title="{{ getMissionAverageCalcul(mission, 'pendantMission') }}" [attr.data-percentage]="getMissionAverage(mission, 'pendantMission')">
                      {{ getMissionAverage(mission, 'pendantMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('NOG', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.pendantMission.nog, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.nog == 'oui' ? 'fa-check-circle' : mission.pendantMission.nog == 'encours' ? 'fa-hourglass' : mission.pendantMission.nog == 'collab' ? 'fa-users' : mission.pendantMission.nog == 'associe' ? 'fa-user-check' : mission.pendantMission.nog == 'editing' ? 'fa-list-check' :'fa-pen'"
                       [class.completed]="mission.pendantMission.nog == 'oui' || mission.pendantMission.nog == 'associe'"></i>
                    <i *ngIf="mission.pendantMission.nogAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.pendantMission.nogAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Checklist', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.pendantMission.checklist, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon fa-person-digging"></i>
                       <!--[ngClass]="mission.pendantMission.checklist == 'oui' ? 'fa-check-circle' : mission.pendantMission.checklist == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.pendantMission.checklist == 'oui'"></i>-->
                    <i *ngIf="mission.pendantMission.checklistAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.pendantMission.checklistAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Revision', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.pendantMission.revision, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.revision == 'oui' ? 'fa-check-circle' : mission.pendantMission.revision == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.pendantMission.revision == 'oui'"></i>
                    <i *ngIf="mission.pendantMission.revisionAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.pendantMission.revisionAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Supervision', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.pendantMission.supervision, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.supervision == 'oui' ? 'fa-check-circle' : mission.pendantMission.supervision == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.pendantMission.supervision == 'oui'"></i>
                    <i *ngIf="mission.pendantMission.supervisionAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.pendantMission.supervisionAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  
                  <!-- Fin de mission -->
                  <td class="percentage-cell">
                    <div class="progress-circle" title="{{ getMissionAverageCalcul(mission, 'finMission') }}" [attr.data-percentage]="getMissionAverage(mission, 'finMission')">
                      {{ getMissionAverage(mission, 'finMission') }}%
                    </div>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('NDS', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.finMission.nds, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.nds == 'oui' ? 'fa-check-circle' : mission.finMission.nds == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.finMission.nds == 'oui'"></i>
                    <i *ngIf="mission.finMission.ndsAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.finMission.ndsAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <!--<td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('CR mission ou Attestation', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.finMission.cr, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.cr == 'oui' ? 'fa-check-circle' : mission.finMission.cr == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.finMission.cr == 'oui'"></i>
                    <i *ngIf="mission.finMission.crAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.finMission.crAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>-->
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('QMM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.finMission.qmm, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.qmm == 'oui' ? 'fa-check-circle' : mission.finMission.qmm == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.finMission.qmm == 'oui'"></i>
                    <i *ngIf="mission.finMission.qmmAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.finMission.qmmAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Plaquette', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.finMission.plaquette, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.plaquette == 'oui' ? 'fa-check-circle' : mission.finMission.plaquette == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.finMission.plaquette == 'oui'"></i>
                    <i *ngIf="mission.finMission.plaquetteAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.finMission.plaquetteAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Restitution', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.finMission.restitution, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.restitution == 'oui' ? 'fa-check-circle' : mission.finMission.restitution == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.finMission.restitution == 'oui'"></i>
                    <i *ngIf="mission.finMission.restitutionAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.finMission.restitutionAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>
                  <!--<td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Fin relation client', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.MD_MISSION, mission.finMission.finRelationClient, mission.missionId, mission.profilId, 'Mission', mission.MD_MILLESIME, mission.MD_MISSION, mission.numeroClient)">
                    <i class="fas status-icon fa-person-digging"></i>
                       [ngClass]="mission.finMission.finRelationClient == 'oui' ? 'fa-check-circle' : mission.finMission.finRelationClient == 'encours' ? 'fa-hourglass' : 'fa-pen'"
                       [class.completed]="mission.finMission.finRelationClient == 'oui'"></i>
                    <i *ngIf="mission.finMission.finRelationClientAccess != 'modif'" class="icon-access-module fa-regular"
                      [ngClass]="mission.finMission.finRelationClientAccess == 'noaccess' ? 'fa-lock' : 'fa-eye'"></i>
                  </td>-->
                </tr>
              </ng-container>
            </ng-container>
          </tbody>
        </table>
      </div>

      <div class="pagination-footer">
        <div class="pagination-container">
          <div class="mission-count-display">
            {{ endIndex == 0 ? 0 : startIndex + 1 }}-{{ endIndex }} sur {{ totalMissions }} missions
          </div>
          
          <div class="pagination-controls">
            <button 
              class="pagination-btn" 
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)">
              <i class="fas fa-chevron-left"></i> Précédent
            </button>
            
            <div class="page-numbers">
              <ng-container *ngFor="let page of getVisiblePages()">
                <button 
                  *ngIf="page !== '...' && page !== ''"
                  class="page-btn"
                  [class.active]="page === currentPage"
                  (click)="goToPage(+page)">
                  {{ page }}
                </button>
                <span *ngIf="page === '...'" class="page-btn ellipsis">...</span>
                <span *ngIf="page === ''" class="page-btn empty"></span>
              </ng-container>
            </div>
            
            <button 
              class="pagination-btn" 
              [disabled]="currentPage === totalPages"
              (click)="goToPage(currentPage + 1)">
              Suivant <i class="fas fa-chevron-right"></i>
            </button>
          </div>         
        </div>
      </div>

      <!-- Modal pour les statuts -->
    <div *ngIf="modalData.isOpen" class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ modalData.columnName }}</h3>
          <button class="modal-close" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">

          <!-- Modal "À venir" -->
          <div *ngIf="modalData.type === 'coming-soon'" class="coming-soon-content">
            <h4>🚧 Fonctionnalité à venir</h4>
            <p>Cette fonctionnalité sera bientôt disponible.</p>
          </div>

          <!-- Modal Questionnaire -->
          <div *ngIf="modalData.type === 'questionnaire' && modalData.modifyMode === true" class="questionnaire-content">
            <p>{{ modalData.description }}</p>
            <div class="questionnaire-form">
              <div *ngFor="let question of modalData.questionnaire?.questions; let i = index" class="question-item">
                <label>{{ i + 1 }}. {{ question.text }}</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input type="radio"
                          [name]="'question_' + i"
                          value="oui"
                          [(ngModel)]="question.answer"
                          (change)="updateQuestionnaireStatus()">
                    Oui
                  </label>
                  <label class="radio-label">
                    <input type="radio"
                          [name]="'question_' + i"
                          value="non"
                          [(ngModel)]="question.answer"
                          (change)="updateQuestionnaireStatus()">
                    Non
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Upload (PDF/Document simple) -->
          <div *ngIf="modalData.type === 'document'" class="upload-section">
            <p>{{ modalData.description }}</p>
            <div class="text-redirection" *ngIf="modalData.modifyMode === true && modalData.urlRedirection != undefined && modalData.mission != undefined && modalData.millesime != undefined && modalData.urlRedirection === true && (modalData.mission.startsWith('21') || modalData.mission.startsWith('22')) && convertToNumber(modalData.millesime) >= getActualYear()">
              Vous pouvez accéder au formulaire en cliquant sur le lien suivant : 
              <button class="btn-redirection" (click)="redirectNog(modalData.dosPgi || '', modalData.mission || '', modalData.millesime || '')">Accéder au formulaire</button>
            </div>
            <div *ngIf="modalData.modifyMode === true"
              class="file-input-group">
              <input type="file"
                    id="file-input"
                    (change)="onFileSelected($event)"
                    [accept]="modalData.acceptedTypes"
                    class="file-input">
            </div>
            <div *ngIf="modalData.selectedFile" class="file-info">
              <div class="row-info-file">
                <span class="file-name">{{ modalData.selectedFile.name }}</span>
                <div class="file-actions">
                  <button *ngIf="modalData.selectedFile.type === 'application/pdf'"
                          class="preview-file"
                          (click)="previewFile(modalData.selectedFile)">
                    <i class="fas fa-eye"></i>
                  </button>

                  <button class="download-file"
                          (click)="downloadFile(modalData.selectedFile)">
                    <i class="fas fa-download"></i>
                  </button>

                  <button *ngIf="modalData.modifyMode === true"
                          class="remove-file"
                          (click)="removeFile(modalData.selectedFileId)">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <div *ngIf="modalData.columnName == 'NDS' || modalData.columnName == 'NOG' || modalData.columnName == 'LDM' || modalData.columnName == 'QAM'" class="container-date-modal">
                <div *ngIf="modalData.columnName == 'NDS' || modalData.columnName == 'NOG' || modalData.columnName == 'LDM'" class="libelle-date-modal">Date de signature : </div>
                <div *ngIf="modalData.columnName == 'QAM'" class="libelle-date-modal">Date de génération : </div>
                <input *ngIf="modalData.modifyMode === true" type="date" class="input-date-modal" 
                  [(ngModel)]="modalData.selectedFileDate"
                  (change)="changeDateFichier($event, modalData.selectedFileId)"/>
                <div *ngIf="modalData.modifyMode === false" class="date-modal-nomodify">{{ formatDate(modalData.selectedFileDate) }}</div>
              </div>
            </div>
            <div *ngIf="modalData.selectedFile == null"
              class="no-file-modal">
                Aucun fichier
            </div>
            <div *ngIf="modalData.modifyMode === true">
              <small>Formats acceptés : {{ modalData.acceptedTypes }}</small>
            </div>
          </div>

          <!-- Modal Upload (possibilité d’ajouter plusieurs documents) -->
          <div *ngIf="modalData.type === 'document-add'" class="upload-section">
            <p>{{ modalData.description }}</p>
            <div *ngIf="modalData.modifyMode === true"
              class="file-inputs-container">
              <div *ngFor="let input of fileInputs; let i = index">
                <div *ngIf="fileInputs.length == i+1" class="file-input-group">
                  <input type="file"
                        [id]="'file-input-' + i"
                        class="file-input"
                        (change)="onFileSelected($event, i)"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">
                </div>
              </div>
            </div>
            <div *ngIf="getAllFilesStatus()">
              <div *ngFor="let input of fileInputs; let i = index">
                <div *ngIf="getFile(i)" class="file-info">
                  <span class="file-name">{{ getFileName(i) }}</span>
                  <div class="file-actions">
                    <button *ngIf="getFileType(i) === 'application/pdf'"
                            class="preview-file"
                            (click)="previewFile(getFile(i))">
                      <i class="fas fa-eye"></i>
                    </button>

                    <button class="download-file"
                            (click)="downloadFile(getFile(i))">
                      <i class="fas fa-download"></i>
                    </button>

                    <button *ngIf="modalData.modifyMode === true"
                            class="remove-file"
                            (click)="removeFileInput(i)">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="getAllFilesStatus() == false"
              class="no-file-modal">
                Aucun fichier
            </div>
          </div>

          <!-- Modal Upload Double (Plaquette) -->
          <div *ngIf="modalData.type === 'double-document'" class="double-upload-section">
            <p>{{ modalData.description }}</p>

            <h4>1. Plaquette ou Attestation de l’EC ou CR de mission</h4>
            <div *ngIf="modalData.modifyMode === true"
              class="file-input-group">
              <input type="file"
                    id="file-input"
                    (change)="onFileSelectedDouble($event, 'plaquette')"
                    [accept]="modalData.acceptedTypes"
                    class="file-input">
            </div>
            <div *ngIf="modalData.selectedFile" class="file-info">
              <div class="row-info-file">
                <span class="file-name">{{ modalData.selectedFile.name }}</span>
                <div class="file-actions">
                  <button *ngIf="modalData.selectedFile.type === 'application/pdf'"
                          class="preview-file"
                          (click)="previewFile(modalData.selectedFile)">
                    <i class="fas fa-eye"></i>
                  </button>

                  <button class="download-file"
                          (click)="downloadFile(modalData.selectedFile)">
                    <i class="fas fa-download"></i>
                  </button>

                  <button *ngIf="modalData.modifyMode === true"
                          class="remove-file"
                          (click)="removeFileDouble(modalData.selectedFileId, 'plaquette')">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <div class="container-date-modal">
                <div class="libelle-date-modal">Date de signature : </div>
                <input *ngIf="modalData.modifyMode === true" type="date" class="input-date-modal"
                  [(ngModel)]="modalData.selectedFileDate"
                  (change)="changeDateFichier($event, modalData.selectedFileId)"/>
                <div *ngIf="modalData.modifyMode === false" class="date-modal-nomodify">{{ formatDate(modalData.selectedFileDate) }}</div>
              </div>
            </div>
            <div *ngIf="modalData.selectedFile == null"
              class="no-file-modal">
                Aucun fichier
            </div>
            <div *ngIf="modalData.modifyMode === true">
              <small>Formats acceptés : {{ modalData.acceptedTypes }}</small>
            </div>

            <h4>2. Mail accompagnement de la remise des comptes annuels</h4>
            <div *ngIf="modalData.modifyMode === true"
              class="file-input-group">
              <input type="file"
                    id="file-input"
                    (change)="onFileSelectedDouble($event, 'mail')"
                    [accept]="modalData.acceptedTypes"
                    class="file-input">
            </div>
            <div *ngIf="modalData.selectedFile2" class="file-info">
              <div class="row-info-file">
                <span class="file-name">{{ modalData.selectedFile2.name }}</span>
                <div class="file-actions">
                  <button *ngIf="modalData.selectedFile2.type === 'application/pdf'"
                          class="preview-file"
                          (click)="previewFile(modalData.selectedFile2)">
                    <i class="fas fa-eye"></i>
                  </button>

                  <button class="download-file"
                          (click)="downloadFile(modalData.selectedFile2)">
                    <i class="fas fa-download"></i>
                  </button>

                  <button *ngIf="modalData.modifyMode === true"
                          class="remove-file"
                          (click)="removeFileDouble(modalData.selectedFileId2 || '', 'mail')">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
            <div *ngIf="modalData.selectedFile2 == null"
              class="no-file-modal">
                Aucun fichier
            </div>
            <div *ngIf="modalData.modifyMode === true">
              <small>Formats acceptés : {{ modalData.acceptedTypes }}</small>
            </div>
          </div>

          <!-- Modal Upload LAB -->
          <div *ngIf="modalData.type === 'LAB'" class="double-upload-section">
            <p>{{ modalData.description }}</p>

            <!-- Reprise du même pattern pour chaque document LAB -->
            <ng-container *ngFor="let n of [1,2,3,4,5]">
              <div class="upload-group">
                <h4>{{ n }}. {{ labTitles[n] }}</h4>

                <div *ngIf="modalData.modifyMode === true"
                  class="file-inputs-container">
                  <div *ngFor="let input of fileInputsLab[n-1]; let i = index">
                    <div *ngIf="fileInputs.length == i+1" class="file-input-group">
                      <input type="file"
                            [id]="'file-input-' + i"
                            class="file-input"
                            (change)="onFileSelectedLab($event, n, i)"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">
                    </div>
                  </div>
                </div>

                <div *ngIf="getAllFilesLabStatus(n)">
                  <div *ngFor="let input of fileInputsLab[n-1]; let i = index">
                    <div *ngIf="getFileLab(n, i)" class="file-info">
                      <div class="row-info-file">
                        <span class="file-name">{{ getFileLabName(n, i) }}</span>
                        <div class="file-actions">
                          <button *ngIf="getFileLabType(n, i) === 'application/pdf'"
                                  class="preview-file"
                                  (click)="previewFile(getFileLab(n, i))">
                            <i class="fas fa-eye"></i>
                          </button>

                          <button class="download-file"
                                  (click)="downloadFile(getFileLab(n, i))">
                            <i class="fas fa-download"></i>
                          </button>

                          <button *ngIf="modalData.modifyMode === true"
                                  class="remove-file"
                                  (click)="removeFileLab(n, i)">
                            <i class="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                      <div *ngIf="n != 5" class="container-date-modal">
                        <div class="libelle-date-modal">{{ labDateTitles[n] }} : </div>
                        <input *ngIf="modalData.modifyMode === true" type="date" class="input-date-modal"
                          [ngModel]="getFileLabDate(n, i)"
                          (change)="changeDateFichier($event, getFileLabId(n, i))"/>
                        <div *ngIf="modalData.modifyMode === false" class="date-modal-nomodify">{{ formatDate(getFileLabDate(n , i)) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div *ngIf="getAllFilesLabStatus(n) == false"
                  class="no-file-modal">
                    Aucun fichier
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <div class="modal-footer">
          <!--<button class="btn-cancel" (click)="closeModal()">Annuler</button>
          <button class="btn-save" (click)="saveStatus()">Enregistrer</button>-->
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hidden {
      display: none;
    }
    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 8vh);
      background: var(--gray-50);
      overflow: hidden;
    }

    .dashboard-header {
      flex-shrink: 0;
      padding: 1vh 1vw;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dashboard-header h1 {
      margin: 0 0 1vh 0;
      color: var(--primary-color);
      font-size: 1.4vw;
      font-weight: 700;
    }

    .dashboard-header p {
      margin: 0;
      color: var(--gray-600);
      font-size: var(--font-size-md);
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.5vw;
      width: 10vw;
      justify-content: flex-end;
    }

    .expand-all-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 1vh 1vw;
      border-radius: 0.5vw;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: var(--font-size-md);
      display: flex;
      align-items: center;
      gap: 0.3vw;
    }

    .expand-all-btn:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .filters-section {
      display: flex;
      justify-content: flex-start;
      width: 10vw;
    }
    
    .filter-btn {
      display: flex;
      align-items: center;
      gap: 0.3vw;
      padding: 1vh 1vw;
      background: white;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.5vw;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      position: relative;
      font-size: var(--font-size-md);
    }
    
    .filter-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
    
    .filter-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }
    
    .filter-count {
      background: var(--secondary-color);
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      min-width: 18px;
      text-align: center;
    }
    
    .filter-btn.active .filter-count {
      background: white;
      color: var(--primary-color);
    }

    .table-controls {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: white;
      border-bottom: 1px solid var(--gray-200);
    }

    .pagination-info {
      font-size: var(--font-size-md);
      color: var(--gray-600);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
    }

    .pagination-btn {
      padding: 1vh 1vw;
      border: 0.1vh solid var(--gray-300);
      background: white;
      border-radius: 0.5vw;
      cursor: pointer;
      font-size: var(--font-size-md);
      transition: all 0.2s;
    }

    .pagination-btn:hover:not(:disabled) {
      background: var(--gray-50);
      border-color: var(--primary-color);
    }

    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-info {
      font-size: var(--font-size-sm);
      color: var(--gray-700);
      font-weight: 500;
    }

    .table-wrapper {
      flex: 1;
      overflow: auto;
      margin: 0 1vw;
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--gray-200);
      position: relative;
    }

    .mission-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-md);
      min-width: 100%;
    }

    .background-table-load {
      position: absolute;
      background-color: #d7d7d7;
      width: 98vw;
      height: 67vh;
      z-index: 100;
      display: flex;
      justify-content: center;
      align-items: center;
      top: 11vh;
    }

    .background-table-load i {
      font-size: 3vw;
      color: var(--primary-light);
    }

    .mission-table thead tr:nth-child(1) th:nth-child(n+2) {
      min-width: 8vw;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(1),
    .mission-table tbody .mission-row td:nth-child(1) {
      width: 0.8vw;
      min-width: 0.8vw;
      max-width: 0.8vw;
      text-align: left;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(2),
    .mission-table tbody .mission-row td:nth-child(2) {
      width: 0.8vw;
      min-width: 0.8vw;
      max-width: 0.8vw;
      text-align: left;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(3),
    .mission-table tbody .mission-row td:nth-child(3) {
      width: 0.8vw;
      min-width: 0.8vw;
      max-width: 0.8vw;
      text-align: left;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(4),
    .mission-table tbody .mission-row td:nth-child(4) {
      width: 0.8vw;
      min-width: 0.8vw;
      max-width: 0.8vw;
      text-align: left;
    }

    tr.row-no-data td {
      height: 5vh;
      font-size: 0.8vw;
      text-align: center;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(5),
    .mission-table tbody .mission-row td:nth-child(5) {
      width: 22vw;
      min-width: 22vw;
      max-width: 22vw;
      text-align: left;
    }
    
    .mission-table thead tr:nth-child(2) th:nth-child(n+6),
    .mission-table tbody .mission-row td:nth-child(n+6) {
      width: 4.3vw;
      min-width: 4.3vw;
      max-width: 4.3vw;
    }

    .mission-table tbody .mission-row td {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .mission-table thead tr:nth-child(2) th {
      vertical-align: top;
    }


    .group-row {
      text-align: center;
    }

    span.tiret-no-data {
      color: #bbbbbb;
    }

    .recap-dossier {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .column-group-header {
      background: var(--primary-color);
      color: white;
      padding: 1vh 0.3vw;
      font-weight: 600;
      text-align: center;
      position: relative;
      position: sticky;
      top: 0;
      z-index: 10;
      height: 4.6vh;
    }

    .group-cell {
      display: flex;
      align-items: center;
      gap: 0.5vw;
    }

    .client-row {
      padding-left: 16px;
      display: flex;
      align-items: center;
      gap: 0.5vw;
    }

    .mission-table tr.group-row.main-group {
      position: sticky;
      top: 10.9vh;
      z-index: 10;
    }
    
    .column-group-header.information {
      background: var(--primary-dark);
    }

    .column-group-header.avant-mission {
      background: var(--primary-color);
    }

    .column-group-header.pendant-mission {
      background: var(--secondary-color);
      color: var(--primary-color);
    }

    .column-group-header.fin-mission {
      background: var(--primary-color);
    }

    .column-header {
      background: var(--gray-100);
      color: var(--gray-700);
      padding: 1vh 0.3vw;
      font-weight: 600;
      text-align: center;
      border-bottom: 1px solid var(--gray-200);
      white-space: nowrap;
      position: sticky;
      top: 4.6vh;
      height: 6.4vh;
      z-index: 10;
    }

    .column-header.percentage {
      background: rgb(232 240 240);
      color: var(--primary-color);
      min-width: 60px;
    }

    .libelle-mission {
      max-width: 18vw;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .group-row.main-group {
      background: var(--gray-50);
      cursor: pointer;
      transition: background-color 0.2s;
      font-weight: 600;
    }

    .group-row.main-group:hover {
      background: var(--gray-100);
    }

    .mission-count-display {
      font-size: var(--font-size-md);
    }

    .group-row.client-group {
      background: rgba(60, 151, 255, 0.1);
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .group-row.client-group:hover {
      background: rgba(60, 151, 255, 0.2);
    }

    .client-indent {
      width: 40px;
      background: rgba(60, 151, 255, 0.1);
    }

    .client-cell {
      padding: 10px 16px;
      font-weight: 500;
      color: var(--secondary-color);
    }

    .client-summary {
      font-size: var(--font-size-sm);
      color: var(--gray-600);
      font-weight: normal;
      margin-left: 8px;
    }
    .group-summary {
      padding: 1vh 0.3vw;
      color: var(--gray-600);
      font-style: italic;
    }

    .groupe-libelle {
      min-width: 17vw;
      max-width: 17vw;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      text-align: left;
    }

    .mission-row {
      border-bottom: 1px solid var(--gray-100);
      transition: all 0.2s;
    }

    .mission-row:hover {
      background: var(--gray-50);
    }

    .mission-row.hidden {
      display: none;
    }

    .mission-indent {
      width: 60px;
      background: var(--gray-50);
    }

    .mission-row td {
      padding: 1vh 0.3vw;
      text-align: center;
      vertical-align: middle;
    }

    .percentage-cell {
      padding: 8px !important;
    }

    .progress-circle {
      width: 2.5vw;
      height: 5vh;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: var(--font-size-sm);
      margin: 0 auto;
      position: relative;
    }

    .progress-circle[data-percentage="0"] {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
    }

    .progress-circle[data-percentage]:not([data-percentage="0"]):not([data-percentage="100"]) {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
    }

    .progress-circle[data-percentage="100"] {
      background: rgba(100, 206, 199, 0.1);
      color: var(--success-color);
    }

    .progress-circle[data-percentage="100"] {
      background: rgba(100, 206, 199, 0.1);
      color: var(--success-color);
    }

    .status-cell {
      padding: 8px !important;
      cursor: pointer;
      transition: background-color 0.2s;
      text-align: center;
    }

    .status-cell:hover {
      background: rgba(34, 109, 104, 0.1);
    }

    .status-icon {
      font-size: var(--font-size-md);
      display: inline-block;
      transition: all 0.2s ease;
    }

    .status-icon.completed {
      color: var(--success-color);
    }

    .status-icon:not(.completed) {
      color: var(--gray-300);
    }

    .status-icon:not(.completed).fa-hourglass {
      color: var(--warning-color);
    }

    .collapse-btn {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: var(--font-size-sm);
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .group-info {
      display: flex;
      gap: 0.5vw;
      align-items: center;
    }

    .collapse-btn:hover {
      background: rgba(255,255,255,0.1);
    }

    .column-group-header .collapse-btn {
      margin-right: 8px;
    }

    .pagination-footer {
      flex-shrink: 0;
      padding: 1vh 1vw;
    }

    .page-numbers {
      display: flex;
      gap: 4px;
    }

    .page-btn {
      padding: 1vh 1vw;
      border: 0.1vh solid var(--gray-300);
      background: white;
      border-radius: 0.5vw;
      cursor: pointer;
      font-size: var(--font-size-md);
      min-width: 2vw;
      transition: all 0.2s;
    }

    .container-info-groupe {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .page-btn:hover {
      background: var(--gray-50);
      border-color: var(--primary-color);
    }

    .page-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .page-btn.ellipsis {
      background: var(--gray-100);
      color: var(--gray-500);
      border-color: var(--gray-200);
      cursor: default;
      pointer-events: none;
    }

    .no-file-modal {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--gray-300);
      color: var(--gray-300);
      padding: 1vh 1vw;
      margin-top: 1vh;
      border-radius: 8px;
    }

    .page-btn.empty {
      background: transparent;
      border-color: transparent;
      cursor: default;
      pointer-events: none;
      visibility: hidden;
    }

    .page-numbers {
      display: flex;
      gap: 4px;
      justify-content: center;
    }

    .pagination-container {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.5vw;
    }

    tr.group-row.client-group .progress-circle {
      height: 3vh;
      border-radius: 1vw;
    }

    tr.group-row.client-group td {
        padding: 6px 8px !important;
        font-style: italic;
    }

    tr.mission-row .progress-circle {
        height: 27px;
        border-radius: 1vw;
    }

    .container-mission {
      display: flex;
      align-items: center;
    }

    .info-mission-source {
      color: var(--primary-light);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 7vh;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 0.5vw;
      box-shadow: var(--shadow-xl);
      width: 90%;
      max-width: 35vw;
    }

    /* Styles pour les modales spécialisées */
    .questionnaire {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .question-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .question-group label {
      font-weight: 600;
      color: var(--gray-700);
    }

    .question-group textarea {
      padding: 12px;
      border: 1px solid var(--gray-300);
      border-radius: 6px;
      min-height: 80px;
      resize: vertical;
      font-family: inherit;
    }

    .question-group textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(34, 109, 104, 0.1);
    }

    .document-section {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      background: var(--gray-50);
    }

    .document-section h5 {
      margin: 0 0 12px 0;
      color: var(--gray-700);
      font-weight: 600;
    }

    .file-input {
      width: 100%;
      padding: 12px;
      border: 2px dashed var(--gray-300);
      border-radius: 6px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .icon-access-module {
      font-size: 0.55vw;
      position: absolute;
      bottom: 0.7vh;
      right: 0.8vw;
      color: #0000c0;
      opacity: 0.5;
    }

    .file-input:hover {
      border-color: var(--primary-color);
      background: rgba(34, 109, 104, 0.05);
    }

    .uploaded-file {
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid var(--success-color);
      border-radius: 6px;
      color: var(--success-color);
      font-weight: 500;
    }

    .file-info {
      display: flex;
      gap: 0.5vh;
      margin-top: 0.5vh;
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }

    table.mission-table td {
      position: relative;
    }

    .upload-placeholder {
      text-align: center;
      padding: 40px 20px;
      color: var(--gray-500);
      font-style: italic;
    }

    .status-indicator {
      margin-top: 20px;
      text-align: center;
    }

    .status-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: var(--font-size-sm);
    }

    .status-badge.validated {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid var(--success-color);
    }

    .status-badge.pending {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
      border: 1px solid var(--warning-color);
    }

    .coming-soon-modal {
      text-align: center;
      padding: 40px 20px;
    }

    .coming-soon-content h4 {
      color: var(--gray-600);
      margin-bottom: 16px;
    }

    .coming-soon-content p {
      color: var(--gray-500);
      font-style: italic;
    }

    .modal-body {
      padding: 1vh 1vw;
      max-height: 79vh;
      overflow-y: auto;
      font-size: var(--font-size-md);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: var(--font-size-md);
      font-weight: 500;
    }

    .status-checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .checkbox-text {
      color: var(--gray-700);
    }

    .file-input {
      width: 100%;
      padding: 1vh 0.3vw;
      border: 2px dashed var(--gray-300);
      border-radius: 8px;
      background: var(--gray-50);
      cursor: pointer;
      transition: all 0.2s;
    }

    .file-input:hover {
      border-color: var(--primary-color);
      background: rgba(34, 109, 104, 0.05);
    }

    .file-info {
      display: flex;
      padding: 0.5vh 0.5vw;
      background: var(--gray-100);
      border-radius: 0.5vw;
      flex-direction: column;
      width: 100%;
    }

    .file-name {
      font-size: var(--font-size-md);
      color: var(--gray-700);
      max-width: 16vw;
    }

    .file-actions {
      display: flex;
      gap: 0.5vw;
      align-items: center;
    }

    .remove-file {
      background: var(--error-color);
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .remove-file:hover {
      background: #dc2626;
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

    .btn-save {
      padding: 1vh 1vw;
      border: none;
      background: var(--primary-color);
      color: white;
      border-radius: 0.5vw;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      font-size: var(--font-size-md);
    }

    .btn-save:hover {
      background: var(--primary-dark);
    }

    .upload-controls {
      margin-bottom: 16px;
    }
    
    .btn-add-input {
      background: var(--secondary-color);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: var(--font-size-md);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    
    .btn-add-input:hover {
      background: var(--primary-color);
      transform: translateY(-1px);
    }
    
    .file-inputs-container {
      display: flex;
      flex-direction: column;
    }
    
    .file-input-group {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 2px dashed var(--gray-300);
      border-radius: 8px;
      transition: all 0.2s;
    }
    
    .file-input-group:hover {
      border-color: var(--secondary-color);
      background: var(--gray-50);
    }
    
    .file-input {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: var(--font-size-md);
    }
    
    .btn-remove-input {
      background: var(--error-color);
      color: white;
      border: none;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      transition: all 0.2s;
      flex-shrink: 0;
    }
    
    .btn-remove-input:hover {
      background: #dc2626;
      transform: scale(1.05);
    }

    .text-redirection {
      font-size: var(--font-size-md);
      display: flex;
      align-items: center;
      gap: 0.5vw;
      margin-bottom: 1vh;
    }

    button.btn-redirection {
        background: var(--primary-color);
        color: #fff;
        border: none;
        padding: 0.5vh 0.5vw;
        border-radius: .5vw;
        cursor: pointer;
        transition: all .2s ease;
        font-size: var(--font-size-md);
        display: flex;
        align-items: center;
        gap: .3vw;
    }

    .container-date-modal {
      display: flex;
      align-items: center;
      font-size: var(--font-size-md);
      gap: 0.5vw;
      padding: 0.5vh 0vw;
    }

    input.input-date-modal {
        padding: 0.3vh 0.3vw;
        border: 0.1vh solid var(--gray-300);
        border-radius: 0.3vw;
        font-size: var(--font-size-md);
    }

    i.fas.status-icon.fa-list-check {
      color: var(--warning-color);
    }

    i.fas.status-icon.fa-users {
      color: #1074b9;
    }    
      
    .row-info-file {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  `]
})
export class DashboardComponent implements OnInit {
  avantMissionCollapsed = false;
  pendantMissionCollapsed = false;
  finMissionCollapsed = false;
  allGroupsExpanded = true;

  groupedData: GroupData[] = [];
  paginatedData: GroupData[] = [];
  allMissions: MissionData[] = [];
  initialData: MissionData[] = [];
  allMissionsFiltred: MissionData[] = [];
  completeGroupedData: GroupData[] = [];
  currentPage = 1;
  itemsPerPage = 150;
  totalMissions = 0;
  totalPages = 0;
  startIndex = 0;
  endIndex = 0;

  currentUser: UserProfile | null = null;
  userEmail: string = '';
  usrMailCollab: string = '';

  isFilterPanelOpen = false;
  activeFilters: ActiveFilters = {'etat_mission': ['ouvert'], 'etat_dossier': ['ouvert']};

  public modalData: ModalData = {
    isOpen: false,
    columnName: '',
    missionId: '',
    currentStatus: '',
    selectedFile: null,
    selectedFileId: '',
    selectedFileDate: '',
    modifyMode: false,
    hasAccess: false
  };
  uploadedDocuments: { [key: string]: File | null } = {};
  cartoLabAnswers: { [key: string]: string } = {
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    question5: ''
  };
  fileInputs: any[] = [{}]; // Tableau pour gérer les inputs de fichiers

  fileInputsLab: any[][] = Array.from({ length: 7 }, () => [{}]);

  // Propriétés pour les inputs de fichiers multiples
  selectedFiles: { [key: number]: File | null } = {};
  
  // Propriétés pour les inputs LAB multiples
  labInputs1: number[] = [1];
  labInputs2: number[] = [1];
  labInputs3: number[] = [1];
  labInputs4: number[] = [1];
  labInputs5: number[] = [1];
  labInputs6: number[] = [1];
  labInputs7: number[] = [1]
  selectedLabFiles1: { [key: number]: File | null } = {};
  selectedLabFiles2: { [key: number]: File | null } = {};
  selectedLabFiles3: { [key: number]: File | null } = {};
  selectedLabFiles4: { [key: number]: File | null } = {};
  selectedLabFiles5: { [key: number]: File | null } = {};
  selectedLabFiles6: { [key: number]: File | null } = {};
  selectedLabFiles7: { [key: number]: File | null } = {};

  moduleGlobal = '';
  missionIdDosPgiDosGroupeGlobal = '';
  sourceGlobal = '';

  tableDisplay = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Récupérer les informations utilisateur
    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
      this.userEmail = user?.mail || '';
      this.usrMailCollab = user?.mail || '';
      // console.log('Email :', this.userEmail);
      if(this.userEmail) {
        this.setLogConnexion();
        this.loadData();
      }
    });
    
    // Écouter les changements d'impersonation
    this.authService.impersonatedEmail$.subscribe(() => {
      this.userEmail = this.authService.getEffectiveUserEmail();
      if(this.userEmail) {
        this.loadData();
      }
    });
  }

  private loadData(): void {
    this.tableDisplay = false;
    // Récupérer les données des missions depuis l'API
    console.log('Email api:', this.userEmail);
    this.http.get<{ success: boolean; data: MissionData[]; count: number; timestamp: string }>(`${environment.apiUrl}/missions/getAllMissionsDashboard/${this.userEmail}`)
      .subscribe((response) => {
        this.initialData = response.data;
        this.loadDataFiltred();
        // this.processData(response.data);
      }, (error) => {
        console.error('Erreur lors de la récupération des missions :', error);
      });
  }

  private processData(data: MissionData[]): void {
    // Grouper d'abord par numeroGroupe, puis par numeroClient
    const groupedByGroupe = data.reduce((acc, mission) => {
      const groupKey = mission.numeroGroupe;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          numeroGroupe: mission.numeroGroupe,
          nomGroupe: mission.nomGroupe,
          missions: []
        };
      }
      acc[groupKey].missions.push(mission);
      return acc;
    }, {} as { [key: string]: { numeroGroupe: string; nomGroupe: string; missions: MissionData[] } });

    // Créer la structure finale avec double groupement
    this.groupedData = Object.values(groupedByGroupe).map(group => {
      // Grouper les missions par numeroClient
      const clientGroups = group.missions.reduce((acc, mission) => {
        const clientKey = mission.numeroClient;
        if (!acc[clientKey]) {
          acc[clientKey] = {
            numeroClient: mission.numeroClient,
            nomClient: mission.nomClient,
            missions: [],
            expanded: false
          };
        }
        acc[clientKey].missions.push(mission);
        return acc;
      }, {} as { [key: string]: ClientGroup });

      return {
        numeroGroupe: group.numeroGroupe,
        nomGroupe: group.nomGroupe,
        clients: Object.values(clientGroups),
        expanded: false
      };
    });

    this.totalMissions = this.groupedData.reduce((total, group) => 
      total + group.clients.reduce((clientTotal, client) => 
        clientTotal + client.missions.length, 0), 0);
    
    // Sauvegarder les données complètes pour les compteurs
    this.completeGroupedData = JSON.parse(JSON.stringify(this.groupedData));
    
    // Créer une liste plate de toutes les missions pour la pagination
    this.allMissions = this.groupedData.flatMap(group => 
      group.clients.flatMap(client => client.missions)
    );
    
    this.updatePagination();
  }


  private updatePagination(): void {
    this.totalPages = Math.ceil(this.totalMissions / this.itemsPerPage);
    this.startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.endIndex = Math.min(this.startIndex + this.itemsPerPage, this.totalMissions);
    
    // Obtenir les missions paginées
    let paginatedMissions = null;
    if(Object.keys(this.activeFilters).length > 0) {
      paginatedMissions = this.allMissionsFiltred.slice(this.startIndex, this.endIndex);
    } else {
      paginatedMissions = this.allMissions.slice(this.startIndex, this.endIndex);
    }
    
    // Reconstruire la structure groupée avec seulement les missions paginées
    const groupedPaginated = new Map<string, GroupData>();
    
    paginatedMissions.forEach(mission => {
      const groupKey = mission.numeroGroupe;
      const clientKey = mission.numeroClient;
      
      if (!groupedPaginated.has(groupKey)) {
        groupedPaginated.set(groupKey, {
          numeroGroupe: mission.numeroGroupe,
          nomGroupe: mission.nomGroupe,
          clients: new Map<string, ClientGroup>(),
          expanded: true
        } as any);
      }
      
      const group = groupedPaginated.get(groupKey)!;
      const clientsMap = group.clients as any;
      
      if (!clientsMap.has(clientKey)) {
        clientsMap.set(clientKey, {
          numeroClient: mission.numeroClient,
          nomClient: mission.nomClient,
          missions: [],
          expanded: true
        });
      }
      
      clientsMap.get(clientKey).missions.push(mission);
    });
    
    // Convertir les Maps en arrays
    this.paginatedData = Array.from(groupedPaginated.values()).map(group => ({
      ...group,
      clients: Array.from((group.clients as any).values())
    }));
    
    // Synchroniser l'état d'expansion avec les données complètes
    this.syncExpansionState();
    
    // Mettre à jour l'état du bouton
    this.updateAllGroupsExpandedState();

    this.tableDisplay = true;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    
    if (this.totalPages <= 7) {
      // Si 7 pages ou moins, afficher seulement les pages existantes
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Plus de 7 pages : logique avec ellipses
    // Toujours inclure la page 1
    pages.push(1);
    
    if (this.currentPage <= 3) {
      // Début : 1, 2, 3, 4, 5, ..., dernière
      pages.push(2, 3, 4, 5, '...', this.totalPages);
    } else if (this.currentPage >= this.totalPages - 2) {
      // Fin : 1, ..., avant-4, avant-3, avant-2, avant-1, dernière
      pages.push('...', this.totalPages - 4, this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages);
    } else {
      // Milieu : toujours afficher page-1, page, page+1
      // Format : 1, ..., courante-1, courante, courante+1, ..., dernière
      pages.push('...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages);
    }
    
    return pages;
  }

  toggleColumnGroup(group: 'avantMission' | 'pendantMission' | 'finMission'): void {
    switch (group) {
      case 'avantMission':
        this.avantMissionCollapsed = !this.avantMissionCollapsed;
        break;
      case 'pendantMission':
        this.pendantMissionCollapsed = !this.pendantMissionCollapsed;
        break;
      case 'finMission':
        this.finMissionCollapsed = !this.finMissionCollapsed;
        break;
    }
  }

  toggleMainGroup(event: MouseEvent, index: number): void {
    const target = event.target as HTMLElement;
    
    if (target.closest('.status-cell')) {
      return; // On sort sans exécuter le toggle
    }
    
    this.paginatedData[index].expanded = !this.paginatedData[index].expanded;
    
    // Synchroniser avec les données complètes
    const completeGroup = this.completeGroupedData.find(g => g.numeroGroupe === this.paginatedData[index].numeroGroupe);
    if (completeGroup) {
      completeGroup.expanded = this.paginatedData[index].expanded;
    }
       
    // Mettre à jour l'état du bouton
    this.updateAllGroupsExpandedState();
  }

  toggleClientGroup(event: MouseEvent, groupIndex: number, clientIndex: number): void {
    const target = event.target as HTMLElement;

    if (target.closest('.status-cell')) {
      return; // On sort sans exécuter le toggle
    }

    this.paginatedData[groupIndex].clients[clientIndex].expanded = 
      !this.paginatedData[groupIndex].clients[clientIndex].expanded;
    
    // Synchroniser avec les données complètes
    const completeGroup = this.completeGroupedData.find(g => g.numeroGroupe === this.paginatedData[groupIndex].numeroGroupe);
    if (completeGroup) {
      const completeClient = completeGroup.clients.find(c => c.numeroClient === this.paginatedData[groupIndex].clients[clientIndex].numeroClient);
      if (completeClient) {
        completeClient.expanded = this.paginatedData[groupIndex].clients[clientIndex].expanded;
      }
    }
    
    // Mettre à jour l'état du bouton
    this.updateAllGroupsExpandedState();
  }

  toggleAllGroups(): void {
    this.allGroupsExpanded = !this.allGroupsExpanded;
    
    // Mettre à jour les données complètes
    this.completeGroupedData.forEach(group => {
      group.expanded = this.allGroupsExpanded;
      group.clients.forEach(client => {
        client.expanded = this.allGroupsExpanded;
      });
    });
    
    // Mettre à jour les données paginées
    this.paginatedData.forEach(group => {
      group.expanded = this.allGroupsExpanded;
      group.clients.forEach(client => {
        client.expanded = this.allGroupsExpanded;
      });
    });
  }

  private syncExpansionState(): void {
    // Synchroniser l'état d'expansion des données paginées avec les données complètes
    this.paginatedData.forEach(paginatedGroup => {
      const completeGroup = this.completeGroupedData.find(g => g.numeroGroupe === paginatedGroup.numeroGroupe);
      if (completeGroup) {
        paginatedGroup.expanded = completeGroup.expanded;
        
        paginatedGroup.clients.forEach(paginatedClient => {
          const completeClient = completeGroup.clients.find(c => c.numeroClient === paginatedClient.numeroClient);
          if (completeClient) {
            paginatedClient.expanded = completeClient.expanded;
          }
        });
      }
    });
  }

  private updateAllGroupsExpandedState(): void {
    // Vérifier si tous les groupes et clients sont développés
    const allExpanded = this.completeGroupedData.every(group => 
      group.expanded && group.clients.every(client => client.expanded)
    );
    
    this.allGroupsExpanded = allExpanded;
  }

  getTotalMissionsInGroup(group: GroupData): number {
    // Trouver le groupe complet correspondant
    const completeGroup = this.completeGroupedData.find(g => g.numeroGroupe === group.numeroGroupe);
    if (!completeGroup) return 0;
    
    return completeGroup.clients.reduce((total, client) => total + client.missions.length, 0);
  }

  getTotalClientsInGroup(group: GroupData): number {
    // Trouver le groupe complet correspondant
    const completeGroup = this.completeGroupedData.find(g => g.numeroGroupe === group.numeroGroupe);
    if (!completeGroup) return 0;
    
    return completeGroup.clients.length;
  }

  getTotalMissionsInClient(group: GroupData, client: ClientGroup): number {
    // Trouver le groupe complet correspondant
    const completeGroup = this.completeGroupedData.find(g => g.numeroGroupe === group.numeroGroupe);
    if (!completeGroup) return 0;
    
    // Trouver le client complet correspondant
    const completeClient = completeGroup.clients.find(c => c.numeroClient === client.numeroClient);
    if (!completeClient) return 0;
    
    return completeClient.missions.length;
  }

  getMainGroupAverage(group: GroupData): number {
    const allMissions = group.clients.flatMap(client => client.missions);
    if (allMissions.length === 0) return 0;
    
    const total = allMissions.reduce((sum, mission) => {
      const avg = (mission.avantMission.percentage + mission.pendantMission.percentage + mission.finMission.percentage) / 3;
      return sum + avg;
    }, 0);
    
    return Math.round(total / allMissions.length);
  }

  getClientAverage(client: ClientGroup, phase: 'avantMission' | 'pendantMission' | 'finMission'): number {
    let countV = 0;
    let total = 0;

    if(phase == 'avantMission') {
      const allMissions = client.missions;

      if (allMissions.length === 0) return 0;

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
        nbValide += mission[phase].qam == 'oui' ? 1 : 0;
        nbValide += mission[phase].ldm == 'oui' ? 1 : 0;
        total += 2;
        return nbValide;
      }, 0);

      const clientCount = (client.missions[0][phase].conflitCheck == 'oui' ? 1 : 0) +
        (client.missions[0][phase].labDossier == 'oui' ? 1 : 0)
        // (client.missions[0][phase].qac == 'oui' ? 1 : 0) + 
        // (client.missions[0][phase].cartoLabDossier == 'oui' ? 1 : 0)

      total += 2;

      countV = missionCount + clientCount;
    } else if(phase == 'pendantMission') {
      const allMissions = client.missions;

      if (allMissions.length === 0) return 0;

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nog == 'oui' || mission[phase].nog == 'associe' ? 1 : 0;
          // nbValide += mission[phase].checklist == 'oui' ? 1 : 0;
          nbValide += mission[phase].revision == 'oui' ? 1 : 0;
          nbValide += mission[phase].supervision == 'oui' ? 1 : 0;
          total += 3;
          return nbValide;
        }, 0);

        countV = missionCount;
    } else if(phase == 'finMission') {
      const allMissions = client.missions;

      if (allMissions.length === 0) return 0;

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nds == 'oui' ? 1 : 0;
          // nbValide += mission[phase].cr == 'oui' ? 1 : 0;
          nbValide += mission[phase].qmm == 'oui' ? 1 : 0;
          nbValide += mission[phase].plaquette == 'oui' ? 1 : 0;
          nbValide += mission[phase].restitution == 'oui' ? 1 : 0;
          // nbValide += mission[phase].finRelationClient == 'oui' ? 1 : 0;
          total += 4;
          return nbValide;
        }, 0);

        countV = missionCount;
    }

    return Math.ceil(countV / total * 100);
  }

  getClientAverageCalcul(client: ClientGroup, phase: 'avantMission' | 'pendantMission' | 'finMission'): string {
    let countV = 0;
    let total = 0;

    if(phase == 'avantMission') {
      const allMissions = client.missions;

      if (allMissions.length === 0) return '';

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
        nbValide += mission[phase].qam == 'oui' ? 1 : 0;
        nbValide += mission[phase].ldm == 'oui' ? 1 : 0;
        total += 2;
        return nbValide;
      }, 0);

      const clientCount = (client.missions[0][phase].conflitCheck == 'oui' ? 1 : 0) +
        (client.missions[0][phase].labDossier == 'oui' ? 1 : 0)
        // (client.missions[0][phase].qac == 'oui' ? 1 : 0) + 
        // (client.missions[0][phase].cartoLabDossier == 'oui' ? 1 : 0)

      total += 2;

      countV = missionCount + clientCount;
    } else if(phase == 'pendantMission') {
      const allMissions = client.missions;

      if (allMissions.length === 0) return '';

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nog == 'oui' || mission[phase].nog == 'associe' ? 1 : 0;
          // nbValide += mission[phase].checklist == 'oui' ? 1 : 0;
          nbValide += mission[phase].revision == 'oui' ? 1 : 0;
          nbValide += mission[phase].supervision == 'oui' ? 1 : 0;
          total += 3;
          return nbValide;
        }, 0);

        countV = missionCount;
    } else if(phase == 'finMission') {
      const allMissions = client.missions;

      if (allMissions.length === 0) return '';

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nds == 'oui' ? 1 : 0;
          // nbValide += mission[phase].cr == 'oui' ? 1 : 0;
          nbValide += mission[phase].qmm == 'oui' ? 1 : 0;
          nbValide += mission[phase].plaquette == 'oui' ? 1 : 0;
          nbValide += mission[phase].restitution == 'oui' ? 1 : 0;
          // nbValide += mission[phase].finRelationClient == 'oui' ? 1 : 0;
          total += 4;
          return nbValide;
        }, 0);

        countV = missionCount;
    }

    return countV + ' / ' + total;
  }

  getMissionAverage(mission: MissionData, phase: 'avantMission' | 'pendantMission' | 'finMission'): number {
    let countV = 0;
    let total = 0;

    if(phase == 'avantMission') {
      const missionCount = (mission[phase].qam == 'oui' ? 1 : 0) +
        (mission[phase].ldm == 'oui' ? 1 : 0);

      total = 2;
      countV = missionCount;
    } else if(phase == 'pendantMission') {
      const missionCount = (mission[phase].nog == 'oui' || mission[phase].nog == 'associe' ? 1 : 0) +
        // (mission[phase].checklist == 'oui' ? 1 : 0) + 
        (mission[phase].revision == 'oui' ? 1 : 0) +
        (mission[phase].supervision == 'oui' ? 1 : 0);

      total = 3;
      countV = missionCount;
    } else if(phase == 'finMission') {
      const missionCount = (mission[phase].nds == 'oui' ? 1 : 0) +
        // (mission[phase].cr == 'oui' ? 1 : 0) + 
        (mission[phase].qmm == 'oui' ? 1 : 0) +
        (mission[phase].plaquette == 'oui' ? 1 : 0) +
        (mission[phase].restitution == 'oui' ? 1 : 0);
        // (mission[phase].finRelationClient == 'oui' ? 1 : 0);

      total = 4;
      countV = missionCount;
    }

    return Math.ceil(countV / total * 100);
  }

  getMissionAverageCalcul(mission: MissionData, phase: 'avantMission' | 'pendantMission' | 'finMission'): string {
    let countV = 0;
    let total = 0;

    if(phase == 'avantMission') {
      const missionCount = (mission[phase].qam == 'oui' ? 1 : 0) +
        (mission[phase].ldm == 'oui' ? 1 : 0);

      total = 2;
      countV = missionCount;
    } else if(phase == 'pendantMission') {
      const missionCount = (mission[phase].nog == 'oui' || mission[phase].nog == 'associe' ? 1 : 0) +
        // (mission[phase].checklist == 'oui' ? 1 : 0) + 
        (mission[phase].revision == 'oui' ? 1 : 0) +
        (mission[phase].supervision == 'oui' ? 1 : 0);

      total = 3;
      countV = missionCount;
    } else if(phase == 'finMission') {
      const missionCount = (mission[phase].nds == 'oui' ? 1 : 0) +
        // (mission[phase].cr == 'oui' ? 1 : 0) + 
        (mission[phase].qmm == 'oui' ? 1 : 0) +
        (mission[phase].plaquette == 'oui' ? 1 : 0) +
        (mission[phase].restitution == 'oui' ? 1 : 0);
        // (mission[phase].finRelationClient == 'oui' ? 1 : 0);

      total = 4;
      countV = missionCount;
    }

    return countV + ' / ' + total;
  }

  getClientRecap(client: ClientGroup, phase: 'avantMission' | 'pendantMission' | 'finMission', colonne: String): String {
    if (client.missions.length === 0) return '<div class="recap-dossier-groupe recap-empty">0/0</div>';
    
    let totalMissions = 0;
    let nbMissionsValide = 0;

    client.missions.forEach(mission => {
      totalMissions++;
      // @ts-ignore
      if (mission[phase][colonne] == 'oui') {
        nbMissionsValide++;
      }
    });
  
    let className = '';
    if (totalMissions === nbMissionsValide) {
      className += ' recap-complete';
    } else {
      className += ' recap-incomplete';
    }

    return `<div class="recap-dossier-groupe ${className}">${nbMissionsValide}/${totalMissions}</div>`;
  }

  getGroupeRecap(group: GroupData, phase: 'avantMission' | 'pendantMission' | 'finMission', colonne: String): String {
    if (group.clients.length === 0) return '<div class="recap-dossier-groupe recap-empty">0/0</div>';

    let totalMissions = 0;
    let nbMissionsValide = 0;


    if(phase == 'avantMission' && (colonne == 'conflitCheck' || colonne == 'qac')) {
      group.clients.forEach(client => {
        // client.missions.forEach(mission => {
          totalMissions++;
          // @ts-ignore
          if (client.missions[0][phase][colonne] == 'oui') {
            nbMissionsValide++;
          }
        // });
      });
    } else {
      group.clients.forEach(client => {
        client.missions.forEach(mission => {
          totalMissions++;
          // @ts-ignore
          if (mission[phase][colonne] == 'oui') {
            nbMissionsValide++;
          }
        });
      });
    }
  
    let className = '';
    if (totalMissions === nbMissionsValide) {
      className += ' recap-complete';
    } else {
      className += ' recap-incomplete';
    }

    return `<div class="recap-dossier-groupe ${className}">${nbMissionsValide}/${totalMissions}</div>`;
  }

  getGroupeAverage(group: GroupData, phase: 'avantMission' | 'pendantMission' | 'finMission'): number {
    let countV = 0;
    let total = 0;

    if(phase == 'avantMission') {
      const allMissions = group.clients.flatMap(client => client.missions);

      if (allMissions.length === 0) return 0;

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
        nbValide += mission[phase].qam == 'oui' ? 1 : 0;
        nbValide += mission[phase].ldm == 'oui' ? 1 : 0;
        total += 2;
        return nbValide;
      }, 0);

      const allClients = group.clients;
      if (allClients.length === 0) return 0;

      const clientCount = allClients.reduce((sum, client) => {
        let nbValide = sum;
        nbValide += client.missions[0][phase].conflitCheck == 'oui' ? 1 : 0;
        nbValide += client.missions[0][phase].labDossier == 'oui' ? 1 : 0;
        // nbValide += client.missions[0][phase].qac == 'oui' ? 1 : 0;
        // nbValide += client.missions[0][phase].cartoLabDossier == 'oui' ? 1 : 0;
        total += 2;
        return nbValide;
      }, 0);

      const groupeCount = (group.clients[0].missions[0][phase].labGroupe == 'oui' ? 1 : 0);
        // (group.clients[0].missions[0][phase].cartoLabGroupe == 'oui' ? 1 : 0);

      total += 1;

      countV = missionCount + clientCount + groupeCount;
    } else if(phase == 'pendantMission') {
      const allMissions = group.clients.flatMap(client => client.missions);

      if (allMissions.length === 0) return 0;

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nog == 'oui' || mission[phase].nog == 'associe' ? 1 : 0;
          // nbValide += mission[phase].checklist == 'oui' ? 1 : 0;
          nbValide += mission[phase].revision == 'oui' ? 1 : 0;
          nbValide += mission[phase].supervision == 'oui' ? 1 : 0;
          total += 3;
          return nbValide;
        }, 0);

        countV = missionCount;
    } else if(phase == 'finMission') {
      const allMissions = group.clients.flatMap(client => client.missions);

      if (allMissions.length === 0) return 0;

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nds == 'oui' ? 1 : 0;
          // nbValide += mission[phase].cr == 'oui' ? 1 : 0;
          nbValide += mission[phase].qmm == 'oui' ? 1 : 0;
          nbValide += mission[phase].plaquette == 'oui' ? 1 : 0;
          nbValide += mission[phase].restitution == 'oui' ? 1 : 0;
          // nbValide += mission[phase].finRelationClient == 'oui' ? 1 : 0;
          total += 4;
          return nbValide;
        }, 0);

        countV = missionCount;
    }

    return Math.ceil(countV / total * 100);
  }

    getGroupeAverageCalcul(group: GroupData, phase: 'avantMission' | 'pendantMission' | 'finMission'): string {
    let countV = 0;
    let total = 0;

    if(phase == 'avantMission') {
      const allMissions = group.clients.flatMap(client => client.missions);

      if (allMissions.length === 0) return '';

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
        nbValide += mission[phase].qam == 'oui' ? 1 : 0;
        nbValide += mission[phase].ldm == 'oui' ? 1 : 0;
        total += 2;
        return nbValide;
      }, 0);

      const allClients = group.clients;
      if (allClients.length === 0) return '';

      const clientCount = allClients.reduce((sum, client) => {
        let nbValide = sum;
        nbValide += client.missions[0][phase].conflitCheck == 'oui' ? 1 : 0;
        nbValide += client.missions[0][phase].labDossier == 'oui' ? 1 : 0;
        // nbValide += client.missions[0][phase].qac == 'oui' ? 1 : 0;
        // nbValide += client.missions[0][phase].cartoLabDossier == 'oui' ? 1 : 0;
        total += 2;
        return nbValide;
      }, 0);

      const groupeCount = (group.clients[0].missions[0][phase].labGroupe == 'oui' ? 1 : 0);
        // (group.clients[0].missions[0][phase].cartoLabGroupe == 'oui' ? 1 : 0);

      total += 1;

      countV = missionCount + clientCount + groupeCount;
    } else if(phase == 'pendantMission') {
      const allMissions = group.clients.flatMap(client => client.missions);

      if (allMissions.length === 0) return '';

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nog == 'oui' || mission[phase].nog == 'associe' ? 1 : 0;
          // nbValide += mission[phase].checklist == 'oui' ? 1 : 0;
          nbValide += mission[phase].revision == 'oui' ? 1 : 0;
          nbValide += mission[phase].supervision == 'oui' ? 1 : 0;
          total += 3;
          return nbValide;
        }, 0);

        countV = missionCount;
    } else if(phase == 'finMission') {
      const allMissions = group.clients.flatMap(client => client.missions);

      if (allMissions.length === 0) return '';

      const missionCount = allMissions.reduce((sum, mission) => {
        let nbValide = sum;
          nbValide += mission[phase].nds == 'oui' ? 1 : 0;
          // nbValide += mission[phase].cr == 'oui' ? 1 : 0;
          nbValide += mission[phase].qmm == 'oui' ? 1 : 0;
          nbValide += mission[phase].plaquette == 'oui' ? 1 : 0;
          nbValide += mission[phase].restitution == 'oui' ? 1 : 0;
          // nbValide += mission[phase].finRelationClient == 'oui' ? 1 : 0;
          total += 4;
          return nbValide;
        }, 0);

        countV = missionCount;
    }

    return countV + ' / '  + total;
  }

  openFilterPanel(): void {
    this.isFilterPanelOpen = true;
  }

  closeFilterPanel(): void {
    this.isFilterPanelOpen = false;
  }

  getActiveFiltersCount(): number {
    return Object.values(this.activeFilters).reduce((count, filters) => count + filters.length, 0);
  }

  public openStatusModal(columnName: string, mission: string, currentStatus: string, missionIdDosPgiDosGroupe: string, profilId: string, source: string, millesime: string, miss: string, dosPgi: string): void {
    this.missionIdDosPgiDosGroupeGlobal = missionIdDosPgiDosGroupe;
    this.moduleGlobal = columnName;
    this.sourceGlobal = source;

    console.log('paginatedData', this.paginatedData);

    this.getModuleFiles(missionIdDosPgiDosGroupe, columnName, profilId, source).then(moduleData => {
      let module = moduleData.data[0];
      let hasAccess = module.DTMOD_ModuleLecture == 'oui';
      if(!hasAccess) {
        iziToast.error({
          timeout: 3000,
          icon: 'fa-regular fa-triangle-exclamation', 
          title: 'Vous n\'avez pas accès à ce module.', 
          close: false, 
          position: 'bottomCenter', 
          transitionIn: 'flipInX',
          transitionOut: 'flipOutX'
        });
        return;
      }
      let modifyMode = module.DTMOD_ModuleModification == 'oui';

      let file = null;
      let file2 = null;

      if(columnName == 'Plaquette') {
        console.log(moduleData.data);
        let modFileId = '';
        let modFileId2 = '';
        let modFileDate = '';
        let modFileDate2 = '';
        //ecris moi une boucle for qui parcours moduleData.data
        let modData = moduleData.data;
        modData.forEach((element: any) => {
          if(element.MODFILE_FileCategorie == 'plaquette') {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFileId = element.MODFILE_Id;
              modFileDate = this.formatDateInput(module.MODFILE_DateFichier);
            }
          } else if(element.MODFILE_FileCategorie == 'mail') {
            if(module.Base64_File) {
              file2 = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFileId2 = element.MODFILE_Id;
              modFileDate2 = this.formatDateInput(module.MODFILE_DateFichier);
            }
          }
        });

        this.modalData = {
          isOpen: true,
          columnName: columnName,
          missionId: missionIdDosPgiDosGroupe,
          currentStatus: currentStatus,
          selectedFile: file,
          selectedFileId: modFileId,
          selectedFileDate: modFileDate,
          selectedFile2: file2,
          selectedFileId2: modFileId2,
          selectedFileDate2: modFileDate2,
          modifyMode: modifyMode,
          hasAccess: hasAccess
        };
      } else if(columnName == 'LAB documentaire') {
        this.fileInputsLab = Array.from({ length: 7 }, () => [{}]);
        console.log(moduleData.data);
        let modFile: File[] = [];
        let modFile2: File[] = [];
        let modFile3: File[] = [];
        let modFile4: File[] = [];
        let modFile5: File[] = [];
        let modFile6: File[] = [];
        let modFile7: File[] = [];
        let modFileId: string[] = [];
        let modFileId2: string[] = [];
        let modFileId3: string[] = [];
        let modFileId4: string[] = [];
        let modFileId5: string[] = [];
        let modFileId6: string[] = [];
        let modFileId7: string[] = [];
        let modFileDate: string[] = [];
        let modFileDate2: string[] = [];
        let modFileDate3: string[] = [];
        let modFileDate4: string[] = [];
        let modFileDate5: string[] = [];
        let modFileDate6: string[] = [];
        let modFileDate7: string[] = [];
        //ecris moi une boucle for qui parcours moduleData.data
        let modData = moduleData.data;
        modData.forEach((element: any) => {
          if(element.MODFILE_FileCategorie == this.getCategorieLab(1)) {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFile.push(file);
              modFileId.push(element.MODFILE_Id);
              modFileDate.push(this.formatDateInput(element.MODFILE_DateFichier));
              this.fileInputsLab[0].push({});
            }
          } else if(element.MODFILE_FileCategorie == this.getCategorieLab(2)) {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFile2.push(file);
              modFileId2.push(element.MODFILE_Id);
              modFileDate2.push(this.formatDateInput(element.MODFILE_DateFichier));
              this.fileInputsLab[1].push({});
            }
          } else if(element.MODFILE_FileCategorie == this.getCategorieLab(3)) {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFile3.push(file);
              modFileId3.push(element.MODFILE_Id);
              modFileDate3.push(this.formatDateInput(element.MODFILE_DateFichier));
              this.fileInputsLab[2].push({});
            }
          } else if(element.MODFILE_FileCategorie == this.getCategorieLab(4)) {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFile4.push(file);
              modFileId4.push(element.MODFILE_Id);
              modFileDate4.push(this.formatDateInput(element.MODFILE_DateFichier));
              this.fileInputsLab[3].push({});
            }
          } else if(element.MODFILE_FileCategorie == this.getCategorieLab(5)) {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFile5.push(file);
              modFileId5.push(element.MODFILE_Id);
              modFileDate5.push(this.formatDateInput(element.MODFILE_DateFichier));
              this.fileInputsLab[4].push({});
            }
          } else if(element.MODFILE_FileCategorie == this.getCategorieLab(6)) {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFile6.push(file);
              modFileId6.push(element.MODFILE_Id);
              modFileDate6.push(this.formatDateInput(element.MODFILE_DateFichier));
              this.fileInputsLab[5].push({});
            }
          } else if(element.MODFILE_FileCategorie == this.getCategorieLab(7)) {
            if(module.Base64_File) {
              file = this.base64ToFile(element.Base64_File, element.MODFILE_TITLE);
              modFile7.push(file);
              modFileId7.push(element.MODFILE_Id);
              modFileDate7.push(this.formatDateInput(element.MODFILE_DateFichier));
              this.fileInputsLab[6].push({});
            }
          }
        });

        this.modalData = {
          isOpen: true,
          columnName: columnName,
          missionId: missionIdDosPgiDosGroupe,
          currentStatus: currentStatus,
          selectedFile: null,
          selectedFileId: '',
          selectedFileDate: '',
          selectedFileLab1: modFile,
          selectedFileLab2: modFile2,
          selectedFileLab3: modFile3,
          selectedFileLab4: modFile4,
          selectedFileLab5: modFile5,
          selectedFileLab6: modFile6,
          selectedFileLab7: modFile7,
          selectedFileLabId1: modFileId,
          selectedFileLabId2: modFileId2,
          selectedFileLabId3: modFileId3,
          selectedFileLabId4: modFileId4,
          selectedFileLabId5: modFileId5,
          selectedFileLabId6: modFileId6,
          selectedFileLabId7: modFileId7,
          selectedFileLabDate1: modFileDate,
          selectedFileLabDate2: modFileDate2,
          selectedFileLabDate3: modFileDate3,
          selectedFileLabDate4: modFileDate4,
          selectedFileLabDate5: modFileDate5,
          selectedFileLabDate6: modFileDate6,
          selectedFileLabDate7: modFileDate7,
          modifyMode: modifyMode,
          hasAccess: hasAccess
        };
      } else {
        if(module.Base64_File) {
          file = this.base64ToFile(module.Base64_File, module.MODFILE_TITLE);
        }
        // Initialiser les données de base
        this.modalData = {
          isOpen: true,
          columnName: columnName,
          missionId: missionIdDosPgiDosGroupe,
          currentStatus: currentStatus,
          selectedFile: file,
          selectedFileId: module.MODFILE_Id,
          selectedFileDate:  this.formatDateInput(module.MODFILE_DateFichier),
          selectedFile2: null,
          selectedFileId2: '',
          selectedFileDate2: '',
          modifyMode: modifyMode,
          hasAccess: hasAccess
        };
      }

      // Réinitialiser les inputs de fichiers pour le type document-add
      if (columnName === 'Checklist' || columnName === 'Révision') {
        this.fileInputs = [{}];
      }

      // Configuration spécifique par module
      switch (columnName) {
        case 'Conflict check':
          this.modalData.type = 'document';
          this.modalData.title = 'Conflit Check - Dépôt PDF';
          this.modalData.description = 'Fichier du Conflict Check';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'LAB documentaire':
          // this.modalData.type = 'document';
          this.modalData.type = 'LAB';
          this.modalData.title = 'LAB - Dépôt Document';
          this.modalData.description = 'Fichiers du LAB documentaire';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx, .jpeg, .jpg, .png';
          break;

        case 'Cartographie LAB':
          this.modalData.type = 'coming-soon';
          this.modalData.title = 'Carto LAB - Questionnaire';
          this.modalData.description = 'Cette fonctionnalité sera bientôt disponible';
          break;

        case 'QAC':
          this.modalData.type = 'document';
          this.modalData.title = 'QAC - Dépôt Document';
          this.modalData.description = 'Fichier du QAC';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'QAM':
          this.modalData.type = 'document';
          this.modalData.title = 'QAM - Dépôt Document';
          this.modalData.description = 'Fichier du QAM';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'LDM':
          this.modalData.type = 'document';
          this.modalData.title = 'LDM - Dépôt Document';
          this.modalData.description = 'Fichier de la LDM';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'NOG':
          this.modalData.type = 'document';
          this.modalData.title = 'NOG - Dépôt Document';
          this.modalData.description = 'Fichier de la NOG';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          this.modalData.urlRedirection = true;
          this.modalData.mission = miss;
          this.modalData.millesime = millesime;
          this.modalData.dosPgi = dosPgi;
          break;

        case 'Checklist':
          // this.modalData.type = 'document-add';
          this.modalData.type = 'coming-soon';
          this.modalData.title = 'Checklist - Dépôt Document';
          this.modalData.description = 'Fichier de la Checklist';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'Revision':
          // this.modalData.type = 'document-add';
          this.modalData.type = 'document';
          this.modalData.title = 'Révision - Dépôt Document';
          this.modalData.description = 'Fichier de révision';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'Supervision':
          this.modalData.type = 'document';
          this.modalData.title = 'Supervision - Dépôt Document';
          this.modalData.description = 'Fichier de supervision';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'NDS':
          this.modalData.type = 'document';
          this.modalData.title = 'NDS';
          this.modalData.description = 'Fichier de la NDS';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;
        
        case 'CR mission ou Attestation':
          this.modalData.type = 'document';
          this.modalData.title = 'CR Mission - Dépôt Document';
          this.modalData.description = 'Déposez le document CR Mission';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'QMM':
          this.modalData.type = 'document';
          this.modalData.title = 'QMM - Dépôt Document';
          this.modalData.description = 'Fichier du QMM';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'Plaquette':
          this.modalData.type = 'double-document';
          this.modalData.title = 'Plaquette - Dépôt Documents';
          this.modalData.description = 'Fichiers de la plaquette ou de l\'attestation ou du CR et du mail d\'accompagnement';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx,.eml,.msg,.txt,.oft';

          break;

        case 'Restitution':
          this.modalData.type = 'document';
          this.modalData.title = 'Restitution - Dépôt Document';
          this.modalData.description = 'Fichier de restitution';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;

        case 'Fin relation client':
          this.modalData.type = 'coming-soon';
          this.modalData.title = 'Fin relation client';
          this.modalData.description = 'Cette fonctionnalité sera bientôt disponible';
          break;

        default:
          this.modalData.type = 'document';
          this.modalData.title = columnName + ' - Dépôt Document';
          this.modalData.description = 'Déposez le document requis';
          this.modalData.acceptedTypes = '.pdf,.doc,.docx';
          break;
      }
    }).catch(error => {
      console.error('Erreur lors de la récupération des fichiers du module:', error);
    });
  }

  public closeModal(): void {
    this.modalData.isOpen = false;
    this.modalData.selectedFile = null;
    this.fileInputs = [{}];
  }

  addFileInput(): void {
    if (this.fileInputs.length < 10) {
      this.fileInputs.push({});
    }
  }
  
  removeFileInput(index: number): void {
    if (this.fileInputs.length > 1) {
      this.fileInputs.splice(index, 1);
    }
    console.log('File inputs after removal:', this.fileInputs);
  }

  addLabInput(docNumber: number): void {
    if (docNumber === 1 && this.labInputs1.length < 10) {
      this.labInputs1.push(this.labInputs1.length + 1);
    } else if (docNumber === 2 && this.labInputs2.length < 10) {
      this.labInputs2.push(this.labInputs2.length + 1);
    } else if (docNumber === 3 && this.labInputs3.length < 10) {
      this.labInputs3.push(this.labInputs3.length + 1);
    }
  }
  
  removeLabInput(docNumber: number, inputIndex: number): void {
    if (docNumber === 1 && this.labInputs1.length > 1) {
      this.labInputs1.splice(inputIndex, 1);
      delete this.selectedLabFiles1[inputIndex + 1];
    } else if (docNumber === 2 && this.labInputs2.length > 1) {
      this.labInputs2.splice(inputIndex, 1);
      delete this.selectedLabFiles2[inputIndex + 1];
    } else if (docNumber === 3 && this.labInputs3.length > 1) {
      this.labInputs3.splice(inputIndex, 1);
      delete this.selectedLabFiles3[inputIndex + 1];
    }
  }
  
  onLabFileSelected(event: Event, docNumber: number, inputIndex: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    
    if (docNumber === 1) {
      this.selectedLabFiles1[inputIndex] = file;
    } else if (docNumber === 2) {
      this.selectedLabFiles2[inputIndex] = file;
    } else if (docNumber === 3) {
      this.selectedLabFiles3[inputIndex] = file;
    }
  }

  onFileSelected(event: Event, fileNumber?: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      
      this.modalData.selectedFile = input.files[0];
      console.log('Fichier sélectionné:', this.modalData.selectedFile);
      this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal);
      this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');

      this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);

    }
  }

  getCategorieLab(n: number): string {
    switch(n) {
      case 1: return 'registre beneficiaires';
      case 2: return 'piece identite';
      case 3: return 'statuts';
      case 4: return 'extrait kbis';
      case 5: return 'declaration conflit interet';
      case 6: return 'qam';
      case 7: return 'note travail et autre';
      default: return '';
    }
  }

  onFileSelectedLab(event: Event, n: number, fileNumber: number): void {
    const input = event.target as HTMLInputElement;
    let categorie = this.getCategorieLab(n);
    if (input.files && input.files[0]) {
      if(n == 1) {
        this.modalData.selectedFileLab1?.push(input.files[0]);
        this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, categorie);
        if((this.modalData.selectedFileLab2?.length ?? 0) > 0 && (this.modalData.selectedFileLab3?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab4?.length ?? 0) > 0 && (this.modalData.selectedFileLab5?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab6?.length ?? 0) > 0 && (this.modalData.selectedFileLab7?.length ?? 0) > 0) {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);
        } else {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
        }
        this.fileInputsLab[0].push({});
      } else if(n == 2) {
        this.modalData.selectedFileLab2?.push(input.files[0]);
        console.log('Fichier sélectionné:', this.modalData.selectedFileLab2?.[fileNumber-1]);
        this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, categorie);
        if((this.modalData.selectedFileLab1?.length ?? 0) > 0 && (this.modalData.selectedFileLab3?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab4?.length ?? 0) > 0 && (this.modalData.selectedFileLab5?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab6?.length ?? 0) > 0 && (this.modalData.selectedFileLab7?.length ?? 0) > 0) {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);
        } else {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
        }
        this.fileInputsLab[1].push({});
      } else if(n == 3) {
        this.modalData.selectedFileLab3?.push(input.files[0]);
        console.log('Fichier sélectionné:', this.modalData.selectedFileLab3?.[fileNumber-1]);
        this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, categorie);
        if((this.modalData.selectedFileLab1?.length ?? 0) > 0 && (this.modalData.selectedFileLab2?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab4?.length ?? 0) > 0 && (this.modalData.selectedFileLab5?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab6?.length ?? 0) > 0 && (this.modalData.selectedFileLab7?.length ?? 0) > 0) {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);
        } else {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
        }
        this.fileInputsLab[2].push({});
      } else if(n == 4) {
        this.modalData.selectedFileLab4?.push(input.files[0]);
        console.log('Fichier sélectionné:', this.modalData.selectedFileLab4?.[fileNumber-1]);
        this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, categorie);
        if((this.modalData.selectedFileLab1?.length ?? 0) > 0 && (this.modalData.selectedFileLab2?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab3?.length ?? 0) > 0 && (this.modalData.selectedFileLab5?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab6?.length ?? 0) > 0 && (this.modalData.selectedFileLab7?.length ?? 0) > 0) {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);
        } else {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
        }
        this.fileInputsLab[3].push({});
      } else if(n == 5) {
        this.modalData.selectedFileLab7?.push(input.files[0]);
        console.log('Fichier sélectionné:', this.modalData.selectedFileLab7?.[fileNumber-1]);
        this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, categorie);
        if((this.modalData.selectedFileLab1?.length ?? 0) > 0 && (this.modalData.selectedFileLab2?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab3?.length ?? 0) > 0 && (this.modalData.selectedFileLab4?.length ?? 0) > 0 &&
        (this.modalData.selectedFileLab5?.length ?? 0) > 0 && (this.modalData.selectedFileLab6?.length ?? 0) > 0) {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);
        } else {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
        }
        this.fileInputsLab[6].push({});
      }
      this.fileInputsLab = [...this.fileInputsLab];
      this.changeDetectorRef.detectChanges();
    }
  }

  onFileSelectedDouble(event: Event, categorie: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      if(categorie === 'plaquette') {
        this.modalData.selectedFile = input.files[0];
        console.log('Fichier sélectionné:', this.modalData.selectedFile);
        this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, categorie);
        if(this.modalData.selectedFile2) {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);
        } else {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
        }
      } else if(categorie === 'mail') {
        this.modalData.selectedFile2 = input.files[0];
        console.log('Fichier sélectionné:', this.modalData.selectedFile2);
        this.sendModuleFile(this.moduleGlobal, this.usrMailCollab, input.files[0], this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, categorie);
        if(this.modalData.selectedFile) {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'oui');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'oui', this.missionIdDosPgiDosGroupeGlobal);
        } else {
          this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
          this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
        }
      }
    }
  }

  onFileDrop(event: DragEvent, fileNumber?: number): void {
    event.preventDefault();
    
    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      if (fileNumber === 1) {
        this.modalData.selectedFile = files[0];
      } else if (fileNumber === 2) {
        this.modalData.selectedFile2 = files[0];
      } else {
        this.modalData.selectedFile = files[0];
      }
      this.updateModuleStatus();
    }
  }

  removeFile(fileNumber: string): void {
    this.modalData.selectedFile = null;
    this.deleteModuleFile(fileNumber, this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
    this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'non');
    this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'non', this.missionIdDosPgiDosGroupeGlobal);
  }

  removeFileDouble(fileNumber: string, categorie: string): void {
    this.modalData.selectedFile = null;
    this.deleteModuleFile(fileNumber, this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
    if(categorie == 'plaquette' && this.modalData.selectedFile2) {
      this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
      this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
    } else if(categorie == 'mail' && this.modalData.selectedFile) {
      this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
      this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
    } else {
      this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'non');
      this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'non', this.missionIdDosPgiDosGroupeGlobal);
    }
  }

  removeFileLab(n: number, fileNumber: number): void {
    if(n == 1) {
      this.modalData.selectedFileLab1?.splice(fileNumber - 1, 1);
      this.deleteModuleFile(this.modalData.selectedFileLabId1?.[fileNumber-1] ?? '', this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
      this.modalData.selectedFileLabId1?.splice(fileNumber - 1, 1);
      if(((this.modalData.selectedFileLab2?.length ?? 0) > 0) || ((this.modalData.selectedFileLab3?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab4?.length ?? 0) > 0) || ((this.modalData.selectedFileLab5?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab6?.length ?? 0) > 0) || ((this.modalData.selectedFileLab7?.length ?? 0) > 0)) {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
      } else {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'non');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'non', this.missionIdDosPgiDosGroupeGlobal);
      }
      this.fileInputsLab[0].pop();
    } else if(n == 2) {
      this.modalData.selectedFileLab2?.splice(fileNumber - 1, 1);
      this.deleteModuleFile(this.modalData.selectedFileLabId2?.[fileNumber-1] ?? '', this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
      this.modalData.selectedFileLabId2?.splice(fileNumber - 1, 1);
      if(((this.modalData.selectedFileLab1?.length ?? 0) > 0) || ((this.modalData.selectedFileLab3?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab4?.length ?? 0) > 0) || ((this.modalData.selectedFileLab5?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab6?.length ?? 0) > 0) || ((this.modalData.selectedFileLab7?.length ?? 0) > 0)) {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
      } else {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'non');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'non', this.missionIdDosPgiDosGroupeGlobal);
      }
      this.fileInputsLab[1].pop();
    } else if(n == 3) {
      this.modalData.selectedFileLab3?.splice(fileNumber - 1, 1);
      this.deleteModuleFile(this.modalData.selectedFileLabId3?.[fileNumber-1] ?? '', this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
      this.modalData.selectedFileLabId3?.splice(fileNumber - 1, 1);
      if(((this.modalData.selectedFileLab1?.length ?? 0) > 0) || ((this.modalData.selectedFileLab2?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab4?.length ?? 0) > 0) || ((this.modalData.selectedFileLab5?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab6?.length ?? 0) > 0) || ((this.modalData.selectedFileLab7?.length ?? 0) > 0)) {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
      } else {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'non');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'non', this.missionIdDosPgiDosGroupeGlobal);
      }
      this.fileInputsLab[2].pop();
    } else if(n == 4) {
      this.modalData.selectedFileLab4?.splice(fileNumber - 1, 1);
      this.deleteModuleFile(this.modalData.selectedFileLabId4?.[fileNumber-1] ?? '', this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
      this.modalData.selectedFileLabId4?.splice(fileNumber - 1, 1);
      if(((this.modalData.selectedFileLab1?.length ?? 0) > 0) || ((this.modalData.selectedFileLab2?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab3?.length ?? 0) > 0) || ((this.modalData.selectedFileLab5?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab6?.length ?? 0) > 0) || ((this.modalData.selectedFileLab7?.length ?? 0) > 0)) {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
      } else {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'non');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'non', this.missionIdDosPgiDosGroupeGlobal);
      }
      this.fileInputsLab[3].pop();
    } else if(n == 5) {
      this.modalData.selectedFileLab7?.splice(fileNumber - 1, 1);
      this.deleteModuleFile(this.modalData.selectedFileLabId7?.[fileNumber-1] ?? '', this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
      this.modalData.selectedFileLabId7?.splice(fileNumber - 1, 1);
      if(((this.modalData.selectedFileLab1?.length ?? 0) > 0) || ((this.modalData.selectedFileLab2?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab3?.length ?? 0) > 0) || ((this.modalData.selectedFileLab4?.length ?? 0) > 0) ||
      ((this.modalData.selectedFileLab5?.length ?? 0) > 0) || ((this.modalData.selectedFileLab6?.length ?? 0) > 0)) {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'encours');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'encours', this.missionIdDosPgiDosGroupeGlobal);
      } else {
        this.sendModuleStatus(this.moduleGlobal, this.usrMailCollab, this.missionIdDosPgiDosGroupeGlobal, this.sourceGlobal, 'non');
        this.updateStatusTable(this.sourceGlobal, this.moduleGlobal, 'non', this.missionIdDosPgiDosGroupeGlobal);
      }
      this.fileInputsLab[6].pop();
    }
    this.fileInputsLab = [...this.fileInputsLab];
    this.changeDetectorRef.detectChanges();
  }

  updateQuestionnaireStatus(): void {
    if (this.modalData.questionnaire) {
      const allAnswered = this.modalData.questionnaire.questions.every(q => q.answer);
      this.updateModuleStatus();
    }
  }

  updateModuleStatus(): void {
    
    let newStatus: 'empty' | 'incomplete' | 'complete' = 'empty';
    
    switch (this.modalData.type) {
      case 'pdf':
      case 'document':
        newStatus = this.modalData.selectedFile ? 'complete' : 'incomplete';
        break;
      case 'double-document':
        newStatus = (this.modalData.selectedFile && this.modalData.selectedFile2) ? 'complete' : 'incomplete';
        break;
      case 'questionnaire':
        break;
      case 'coming-soon':
        newStatus = 'empty';
        break;
      default:
        newStatus = 'empty';
    }
  }

  public saveStatus(): void {
    // Ici vous pouvez ajouter la logique pour sauvegarder le statut
    console.log('Sauvegarde:', {
      columnName: this.modalData.columnName,
      missionId: this.modalData.missionId,
      status: this.modalData.currentStatus,
      file: this.modalData.selectedFile
    });
    
    // Fermer le modal après sauvegarde
    this.closeModal();
  }

  public previewFile(file: File | null): void {
    if (file) {
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    }
  }

  public downloadFile(file: File | null): void {
    if (file) {
      const fileURL = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = fileURL;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(fileURL);
    }
  }

  public labTitles: { [key: number]: string } = {
    1: "Registre des bénéficiaires",
    2: "Pièce d'identité",
    3: "Statuts",
    4: "Extrait Kbis",
    5: "Note de travail et autre document"
  }

  public labDateTitles: { [key: number]: string } = {
    1: "Date de génération",
    2: "Date de fin de validité de la pièce",
    3: "Date de signature des statuts",
    4: "date de génération"
  }

  public getFileName(index: number): string {
    const file = this.getFile(index);
    return file ? file.name : '';
  }

  public getFileLabName(n: number, index: number): string {
    const file = this.getFileLab(n, index);
    return file ? file.name : '';
  }

  public getFileLabDate(n: number, index: number): string {
    if (n === 1) {
      return this.modalData.selectedFileLabDate1?.[index-1] ?? '';
    } else if (n === 2) {
      return this.modalData.selectedFileLabDate2?.[index-1] ?? '';
    } else if (n === 3) {
      return this.modalData.selectedFileLabDate3?.[index-1] ?? '';
    } else if (n === 4) {
      return this.modalData.selectedFileLabDate4?.[index-1] ?? '';
    } else if (n === 5) {
      return this.modalData.selectedFileLabDate5?.[index-1] ?? '';
    }
    return '';
  }

  public getFileLabId(n: number, index: number): string {
    if (n === 1) {
      return this.modalData.selectedFileLabId1?.[index-1] ?? '';
    } else if (n === 2) {
      return this.modalData.selectedFileLabId2?.[index-1] ?? '';
    } else if (n === 3) {
      return this.modalData.selectedFileLabId3?.[index-1] ?? '';
    } else if (n === 4) {
      return this.modalData.selectedFileLabId4?.[index-1] ?? '';
    } else if (n === 5) {
      return this.modalData.selectedFileLabId5?.[index-1] ?? '';
    }
    return '';
  }

  public getFileType(index: number): string {
    const file = this.getFile(index);
    return file ? file.type : '';
  }

  public getFileLabType(n: number, index: number): string {
    const file = this.getFileLab(n, index);
    return file ? file.type : '';
  }

  public getFile(index: number): File | null {
    switch (index) {
      case 1: return this.modalData.selectedFile ?? null;
      case 2: return this.modalData.selectedFile2 ?? null;
      case 3: return this.modalData.selectedFile3 ?? null;
      case 4: return this.modalData.selectedFile4 ?? null;
      case 5: return this.modalData.selectedFile5 ?? null;
      case 6: return this.modalData.selectedFile6 ?? null;
      case 7: return this.modalData.selectedFile7 ?? null;
      case 8: return this.modalData.selectedFile8 ?? null;
      case 9: return this.modalData.selectedFile9 ?? null;
      case 10: return this.modalData.selectedFile10 ?? null;
      default: return null;
    }
  }

  public getFileLab(n: number, index: number): File | null {
    switch (n) {
      case 1: return this.modalData.selectedFileLab1?.[index-1] ?? null;
      case 2: return this.modalData.selectedFileLab2?.[index-1] ?? null;
      case 3: return this.modalData.selectedFileLab3?.[index-1] ?? null;
      case 4: return this.modalData.selectedFileLab4?.[index-1] ?? null;
      case 5: return this.modalData.selectedFileLab7?.[index-1] ?? null;
      default: return null;
    }
  }

  public getAllFilesStatus() {
    let res = false;

    for(let i = 1; i <= 10; i++) {
      const file = this.getFile(i);
      if (file) {
        res = true;
      }
    }
    return res;
  }

  public getAllFilesLabStatus(n: number) {
    switch (n) {
      case 1: return (this.modalData.selectedFileLab1?.length ?? 0) > 0;
      case 2: return (this.modalData.selectedFileLab2?.length ?? 0) > 0;
      case 3: return (this.modalData.selectedFileLab3?.length ?? 0) > 0;
      case 4: return (this.modalData.selectedFileLab4?.length ?? 0) > 0;
      case 5: return (this.modalData.selectedFileLab7?.length ?? 0) > 0;
      default: return null;
    }
  }

  sendModuleFile(module: String, email: String, file: File, missionIdDosPgiDosGroupe: String, source: String, categorie?: string | ''): void {
    console.log('Envoi du fichier du module:', module);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let base64File = '';
      let fileName = '';
      if (reader.result) {
        base64File = (reader.result as string).split(',')[1];
        fileName = file.name;
      }
      const moduleFile = {
        module,
        email,
        file: base64File,
        missionIdDosPgiDosGroupe: missionIdDosPgiDosGroupe + "",
        title: fileName,
        source,
        categorie: categorie || '',
        mailPriseProfil: this.userEmail
      };

      this.http.post<{ success: boolean; data: InsertFile[]; count: number; timestamp: string }>(`${environment.apiUrl}/files/setModuleFile`, moduleFile)
        .subscribe(response => {
          if(categorie == 'plaquette') {
            this.modalData.selectedFileId = response.data[0].MODFILE_Id;
          } else if(categorie == 'mail') {
            this.modalData.selectedFileId2 = response.data[0].MODFILE_Id;
          } else if(categorie == this.getCategorieLab(1)) {
            console.log('LAB 1', response.data[0].MODFILE_Id);
            this.modalData.selectedFileLabId1?.push(response.data[0].MODFILE_Id);
          } else if(categorie == this.getCategorieLab(2)) {
            this.modalData.selectedFileLabId2?.push(response.data[0].MODFILE_Id);
          } else if(categorie == this.getCategorieLab(3)) {
            this.modalData.selectedFileLabId3?.push(response.data[0].MODFILE_Id);
          } else if(categorie == this.getCategorieLab(4)) {
            this.modalData.selectedFileLabId4?.push(response.data[0].MODFILE_Id);
          } else if(categorie == this.getCategorieLab(5)) {
            this.modalData.selectedFileLabId5?.push(response.data[0].MODFILE_Id);
          } else if(categorie == this.getCategorieLab(6)) {
            this.modalData.selectedFileLabId6?.push(response.data[0].MODFILE_Id);
          } else if(categorie == this.getCategorieLab(7)) {
            this.modalData.selectedFileLabId7?.push(response.data[0].MODFILE_Id);
          } else {
            this.modalData.selectedFileId = response.data[0].MODFILE_Id;
          }
          iziToast.success({
            timeout: 3000, 
            icon: 'fa-regular fa-thumbs-up', 
            title: 'Fichier ajouté avec succès !', 
            close: false, 
            position: 'bottomCenter', 
            transitionIn: 'flipInX',
            transitionOut: 'flipOutX'
          });
          console.log('Réponse du serveur:', response);
        });
    };
  }

  getModuleFiles(missionIdDosPgiDosGroupe: String, module: String, profilId: String, source: string): Promise<any> {
    return firstValueFrom(
      this.http.get(`${environment.apiUrl}/files/getModuleFiles/${missionIdDosPgiDosGroupe}&${module}&${profilId}&${source}`)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la récupération des fichiers du module:', error);
          throw error; // Rejeter la promesse avec l'erreur pour gérer les erreurs de manière propre
        }),
        tap(response => {
          console.log('Réponse du serveur:', response);
        })
      )
    );
  }

  base64ToFile(base64String: string, fileName: string): File {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const fileExtension = fileName.split('.').pop();
    let mimeType = 'application/octet-stream';

    switch (fileExtension) {
      case 'pdf':
        mimeType = 'application/pdf';
        break;
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      case 'txt':
        mimeType = 'text/plain';
        break;
      case 'xlsx':
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'docx':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    const blob = new Blob([byteArray], { type: mimeType });
    const file = new File([blob], fileName, { type: blob.type });
    return file;
  }

  sendModuleStatus(module: String, email: String, missionIdDosPgiDosGroupe: String, source: String, status: String) {
    console.log('Envoi du status du module:', module);

    const moduleStatus = {
      module,
      email,
      status,
      missionIdDosPgiDosGroupe: missionIdDosPgiDosGroupe + "",
      source,
      mailPriseProfil: this.userEmail
    };

    this.http.post(`${environment.apiUrl}/modules/setModuleStatus`, moduleStatus)
      .subscribe(response => {
        console.log('Réponse du serveur:', response);
      });
  }

  deleteModuleFile(fileId: String, email: String, source: String, missionIdDosPgiDosGroupe: String, module: String) {
    console.log('Suppression du fichier du module:', fileId);

    console.log(this.modalData.selectedFileLabId1);

    this.http.post(`${environment.apiUrl}/files/deleteModuleFile`, {
        fileId,
        email,
        source,
        missionIdDosPgiDosGroupe,
        module
    })
    .subscribe(response => {
      console.log('Réponse du serveur:', response);
      iziToast.success({
        timeout: 3000, 
        icon: 'fa-regular fa-thumbs-up', 
        title: 'Fichier supprimé avec succès !', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
    });
  }

  updateDateFichier(fileId: String, dateFichier: string, email: String, source: String, missionIdDosPgiDosGroupe: String, module: String) {
    console.log('Update date du fichier du module:', fileId);

    console.log(this.modalData.selectedFileLabId1);

    this.http.post(`${environment.apiUrl}/files/setDateFichierModuleFile`, {
        fileId,
        dateFichier,
        email,
        source,
        missionIdDosPgiDosGroupe,
        module
    })
    .subscribe(response => {
      console.log('Réponse du serveur:', response);
      iziToast.success({
        timeout: 3000, 
        icon: 'fa-regular fa-thumbs-up', 
        title: 'Date mise à jour avec succès !', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
    });
  }

  setLogConnexion() {
    console.log('Envoi du log de connexion:', this.usrMailCollab);

    this.http.post(`${environment.apiUrl}/logs/setLogConnexion`, {
        email: this.usrMailCollab,
        page: 'Vue listing'
    })
    .subscribe(response => {
      console.log('Réponse du serveur:', response);
    });
  }

  updateStatusTable(niveau: string, module: string, etat: string, missionIdDosPgiDosGroupe: string) {
    console.log('Niveau', niveau);
    console.log('Module', module);
    this.paginatedData.forEach((group: GroupData) => {
      group.clients.forEach((client: ClientGroup) => {
        client.missions.forEach((mission: MissionData) => {
          if(niveau == 'Groupe') {
            if(mission.numeroGroupe == missionIdDosPgiDosGroupe) {
              if(module == 'LAB documentaire') {
                mission.avantMission.labGroupe = etat;
              } else if(module == 'Cartographie LAB') {
                mission.avantMission.cartoLabGroupe = etat;
              }
            }
          } else if(niveau == 'Dossier') {
            if(mission.numeroClient == missionIdDosPgiDosGroupe) {
              if(module == 'LAB documentaire') {
                mission.avantMission.labDossier = etat;
              } else if(module == 'Cartographie LAB') {
                mission.avantMission.cartoLabDossier = etat;
              } else if(module == 'QAC') {
                mission.avantMission.qac = etat;
              } else if(module == 'Conflict check') {
                mission.avantMission.conflitCheck = etat;
              }
            }
          } else if(niveau == 'Mission') {
            if(mission.missionId == missionIdDosPgiDosGroupe) {
              if(module == 'QAM') {
                mission.avantMission.qam = etat;
              } else if(module == 'LDM') {
                mission.avantMission.ldm = etat;
              } else if(module == 'NOG') {
                mission.pendantMission.nog = etat;
              } else if(module == 'Checklist') {
                mission.pendantMission.checklist = etat;
              } else if(module == 'Revision') {
                mission.pendantMission.revision = etat;
              } else if(module == 'Supervision') {
                mission.pendantMission.supervision = etat;
              } else if(module == 'NDS') {
                mission.finMission.nds = etat;
              } else if(module == 'CR mission ou Attestation') {
                mission.finMission.cr = etat;
              } else if(module == 'QMM') {
                mission.finMission.qmm = etat;
              } else if(module == 'Plaquette') {
                mission.finMission.plaquette = etat;
              } else if(module == 'Restitution') {
                mission.finMission.restitution = etat;
              } else if(module == 'Fin relation client') {
                mission.finMission.finRelationClient = etat;
              }
            }
          }
        });
      });
    });
  }

  loadDataFiltred(): void {
    let filters = this.activeFilters;
    this.allMissionsFiltred = this.initialData;

    let listeFiltre = Object.keys(filters);
    listeFiltre.forEach((key: string) => {
      const filtersValues = filters[key];
      if(key == 'etat_dossier') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.DOS_ETAT)
          );
        }
      }
      if(key == 'etat_mission') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.MD_ETAT)
          );
        }
      }
      if(key == 'dossier') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.numeroClient)
          );
        }
      }
      if(key == 'groupe') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.numeroGroupe)
          );
        }
      }
      if(key == 'bureau_dossier') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.DOS_BUREAU)
          );
        }
      }
      if(key == 'bureau_mission') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.BUREAU_ID)
          );
        }
      }
      if(key == 'naf_section') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.NAF_ID)
          );
        }
      }
      if(key == 'forme_juridique') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.DOS_FORME_JURIDIQUE)
          );
        }
      }
      if(key == 'millesime') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.MD_MILLESIME)
          );
        }
      }
      if(key == 'mission') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.MD_MISSION)
          );
        }
      }
      if(key == 'mois_cloture') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.DOS_MOIS_CLOTURE)
          );
        }
      }
      if(key == 'associe_mission') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.MD_RESP_PRINCIPAL_MISS_SIRH)
          );
        }
      }
      if(key == 'associe_dossier') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.DOS_ASSOCIE_SIRH)
          );
        }
      }
      if(key == 'dmcm_factureur') {
        if (filtersValues && Array.isArray(filtersValues) && filtersValues.length > 0) {
          this.allMissionsFiltred = this.allMissionsFiltred.filter(mission =>
            filtersValues.includes(mission.MD_DMCM_SIRH) || filtersValues.includes(mission.MD_FACTUREUR_SIRH)
          );
        }
      }
    })

    console.log('APRES:',this.allMissionsFiltred);

    this.processData(this.allMissionsFiltred);
  }

  onFiltersChanged(filters: ActiveFilters): void {
    this.activeFilters = filters;
    // Appliquer les filtres ici si nécessaire
    console.log('Filter:',this.activeFilters);
    console.log('Data:',this.paginatedData);
    console.log('AVANT:',this.initialData);

    this.loadDataFiltred();
  }

  redirectNog(dosPgi: string, mission: string, millesime: string): void {
    console.log('dosPgi', dosPgi);
    console.log('mission', mission);
    console.log('millesime', millesime);

    // Récupérer le domaine
    const protocolUrl = window.location.protocol;
    const domain = window.location.hostname;
    const port = window.location.port;

    // Construire l'URL avec ou sans port
    const domainAndPort = port ? `${domain}:${port}` : domain;
    const url = `${protocolUrl}//${domainAndPort}/myjourney/nog?dossier=${encodeURIComponent(dosPgi)}&mission=${encodeURIComponent(mission)}&millesime=${encodeURIComponent(millesime)}`;

    // Ouvrir l'URL dans un nouvel onglet
    window.open(url, '_blank');
  }

  getActualYear(): number {
    return new Date().getFullYear();
  }

  convertToNumber(value: string): number {
    return Number(value);
  }

  changeDateFichier(event: Event, fileId: string): void {
    const input = event.target as HTMLInputElement;
    console.log('input value', input.value);
    console.log('fileId', fileId);
    this.updateDateFichier(fileId, input.value, this.usrMailCollab, this.sourceGlobal, this.missionIdDosPgiDosGroupeGlobal, this.moduleGlobal);
  }

  formatDateInput(input: string): string {
    if(input == null || input == '') {
      return '';
    }
    const date = new Date(input);

    const day = ('0' + date.getUTCDate()).slice(-2);
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2); // getUTCMonth() retourne 0 pour janvier, donc on ajoute 1
    const year = date.getUTCFullYear();

    return `${year}-${month}-${day}`;
  }

  formatDate(value: string): string {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  }
}