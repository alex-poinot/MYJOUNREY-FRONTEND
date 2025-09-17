import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService, UserProfile } from '../../services/auth.service';
import { environment } from '../../environments/environment';

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
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Vue listing</h1>
        <div class="header-controls">
          <button class="expand-all-btn" (click)="toggleAllGroups()">
            <i class="fas" [ngClass]="allGroupsExpanded ? 'fa-folder-minus' : 'fa-folder-plus'"></i>
            {{ allGroupsExpanded ? 'Réduire tout' : 'Développer tout' }}
          </button>
        </div>
      </div>

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
                Information
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
              <th class="column-header">N° Groupe</th>
              <th class="column-header">Nom Groupe</th>
              <th class="column-header">N° Client</th>
              <th class="column-header">Nom Client</th>
              <th class="column-header">Mission</th>
              
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
                      <i class="fas fa-users"></i> {{ getTotalClientsInGroup(group) }} client(s) -
                      <i class="fas fa-briefcase"></i> {{ getTotalMissionsInGroup(group) }} mission(s)
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
                      [ngClass]="group.clients[0].missions[0].avantMission.labGroupe ? 'fa-check-circle' : 'fa-clock'"
                      [class.completed]="group.clients[0].missions[0].avantMission.labGroupe"></i>
                </td>
                <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Carto LAB', group.clients[0].missions[0].numeroGroupe + '-' + group.clients[0].missions[0].numeroClient + '-' + group.clients[0].missions[0].mission, group.clients[0].missions[0].avantMission.cartoLabGroupe)">
                  <i class="fas status-icon" 
                      [ngClass]="group.clients[0].missions[0].avantMission.cartoLabGroupe ? 'fa-check-circle' : 'fa-clock'"
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
                       [ngClass]="client.missions[0].avantMission.conflitCheck ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="client.missions[0].avantMission.conflitCheck"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LAB', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].mission, client.missions[0].avantMission.labDossier)">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.labDossier ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="client.missions[0].avantMission.labDossier"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('Carto LAB', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].mission, client.missions[0].avantMission.cartoLabDossier)">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.cartoLabDossier ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="client.missions[0].avantMission.cartoLabDossier"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('QAC', client.missions[0].numeroGroupe + '-' + client.missions[0].numeroClient + '-' + client.missions[0].mission, client.missions[0].avantMission.qac)">
                    <i class="fas status-icon" 
                       [ngClass]="client.missions[0].avantMission.qac ? 'fa-check-circle' : 'fa-clock'"
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
                       [ngClass]="mission.avantMission.qam ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.avantMission.qam"></i>
                  </td>
                  <td *ngIf="!avantMissionCollapsed" class="status-cell" (click)="openStatusModal('LDM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.avantMission.ldm)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.avantMission.ldm ? 'fa-check-circle' : 'fa-clock'"
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
                       [ngClass]="mission.pendantMission.nog ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.pendantMission.nog"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Checklist', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.pendantMission.checklist)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.checklist ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.pendantMission.checklist"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Révision', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.pendantMission.revision)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.revision ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.pendantMission.revision"></i>
                  </td>
                  <td *ngIf="!pendantMissionCollapsed" class="status-cell" (click)="openStatusModal('Supervision', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.pendantMission.supervision)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.pendantMission.supervision ? 'fa-check-circle' : 'fa-clock'"
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
                       [ngClass]="mission.finMission.nds ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.finMission.nds"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('CR Mission', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.cr)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.cr ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.finMission.cr"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('QMM', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.qmm)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.qmm ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.finMission.qmm"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Plaquette', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.plaquette)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.plaquette ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.finMission.plaquette"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Restitution communication client', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.restitution)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.restitution ? 'fa-check-circle' : 'fa-clock'"
                       [class.completed]="mission.finMission.restitution"></i>
                  </td>
                  <td *ngIf="!finMissionCollapsed" class="status-cell" (click)="openStatusModal('Fin relation client', mission.numeroGroupe + '-' + mission.numeroClient + '-' + mission.mission, mission.finMission.finRelationClient)">
                    <i class="fas status-icon" 
                       [ngClass]="mission.finMission.finRelationClient ? 'fa-check-circle' : 'fa-clock'"
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
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="modalData.currentStatus"
                  class="status-checkbox">
                <span class="checkbox-text">Tâche terminée</span>
              </label>
            </div>
          <!-- Modal "À venir" -->
          <div *ngIf="modalData.type === 'coming-soon'" class="coming-soon-content">
            <div class="coming-soon-icon">🚧</div>
            <h4>Fonctionnalité à venir</h4>
            <p>Cette fonctionnalité sera bientôt disponible.</p>
          </div>
          
          <!-- Modal Questionnaire (Carto LAB) -->
          <div *ngIf="modalData.type === 'questionnaire'" class="questionnaire-content">
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
          <div *ngIf="modalData.type === 'pdf' || modalData.type === 'document'" class="upload-section">
            <p>{{ modalData.description }}</p>
              <input 
                type="file" 
                id="file-input"
                (change)="onFileSelected($event)"
                [accept]="modalData.acceptedTypes"
                class="file-input">
              <div *ngIf="modalData.selectedFile" class="file-info">
                <span class="file-name">{{ modalData.selectedFile.name }}</span>
                <button class="remove-file" (click)="removeFile()">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div>
                <small>Formats acceptés : {{ modalData.acceptedTypes }}</small>
              </div>
          </div>
          
          <!-- Modal Upload Double (Plaquette) -->
          <div *ngIf="modalData.type === 'double-document'" class="double-upload-section">
            <p>{{ modalData.description }}</p>
            
            <!-- Premier document -->
            <div class="upload-group">
              <h4>1. Plaquette</h4>
              <div class="file-upload-area"
                   (click)="fileInput1.click()">
                <div class="upload-content">
                  <i class="fas fa-cloud-upload-alt upload-icon"></i>
                  <p>Glissez-déposez la plaquette ici</p>
                  <small>Formats acceptés : {{ modalData.acceptedTypes }}</small>
                </div>
                <input #fileInput1 
                       type="file" 
                       [accept]="modalData.acceptedTypes"
                       (change)="onFileSelected($event, 1)"
                       style="display: none;">
              </div>
              
              <div *ngIf="modalData.selectedFile" class="file-preview">
                <div class="file-info">
                  <i class="fas fa-file-pdf file-icon"></i>
                  <div class="file-details">
                    <span class="file-name">{{ modalData.selectedFile.name }}</span>
                  </div>
                  <button class="remove-file-btn" (click)="removeFile(1)">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Deuxième document -->
            <div class="upload-group">
              <h4>2. Mail accompagnement de la remise des comptes annuels</h4>
              <div class="file-upload-area" 
                   (click)="fileInput2.click()">
                <div class="upload-content">
                  <i class="fas fa-cloud-upload-alt upload-icon"></i>
                  <p>Glissez-déposez le mail d'accompagnement ici</p>
                  <small>Formats acceptés : {{ modalData.acceptedTypes }}</small>
                </div>
                <input #fileInput2 
                       type="file" 
                       [accept]="modalData.acceptedTypes"
                       (change)="onFileSelected($event, 2)"
                       style="display: none;">
              </div>
              
              <div *ngIf="modalData.selectedFile2" class="file-preview">
                <div class="file-info">
                  <i class="fas fa-file-pdf file-icon"></i>
                  <div class="file-details">
                    <span class="file-name">{{ modalData.selectedFile2.name }}</span>
                  </div>
                  <button class="remove-file-btn" (click)="removeFile(2)">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeModal()">Annuler</button>
            <button class="btn-save" (click)="saveStatus()">Enregistrer</button>
          </div>
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
      height: calc(100vh - 70px);
      background: var(--gray-50);
      overflow: hidden;
    }

    .dashboard-header {
      flex-shrink: 0;
      padding: 12px 24px 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dashboard-header h1 {
      margin: 0 0 8px 0;
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
      gap: 12px;
    }

    .expand-all-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: var(--font-size-md);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .expand-all-btn:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
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
      padding: 8px 12px;
      border: 1px solid var(--gray-300);
      background: white;
      border-radius: 6px;
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
      margin: 0 24px;
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--gray-200);
    }

    .mission-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-md);
      min-width: 100%;
    }

    .mission-table thead tr:nth-child(1) th:nth-child(n+2) {
      min-width: 7vw;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(1),
    .mission-table tbody .mission-row td:nth-child(1) {
      width: 3.8vw;
      min-width: 3.8vw;
      max-width: 3.8vw;
      text-align: left;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(2),
    .mission-table tbody .mission-row td:nth-child(2) {
      width: 10vw;
      min-width: 10vw;
      max-width: 10vw;
      text-align: left;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(3),
    .mission-table tbody .mission-row td:nth-child(3) {
      width: 3.8vw;
      min-width: 3.8vw;
      max-width: 3.8vw;
      text-align: left;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(4),
    .mission-table tbody .mission-row td:nth-child(4) {
      width: 10vw;
      min-width: 10vw;
      max-width: 10vw;
      text-align: left;
    }

    .mission-table thead tr:nth-child(2) th:nth-child(5),
    .mission-table tbody .mission-row td:nth-child(5) {
      width: 5vw;
      min-width: 5vw;
      max-width: 5vw;
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
      background: rgba(100, 206, 199, 0.1);
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .group-row.client-group:hover {
      background: rgba(100, 206, 199, 0.2);
    }

    .client-indent {
      width: 40px;
      background: rgba(100, 206, 199, 0.1);
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
      max-width: 19vw;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
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

    .progress-circle[data-percentage="25"] {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
    }

    .progress-circle[data-percentage="50"] {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
    }

    .progress-circle[data-percentage="75"] {
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
      padding: 16px 24px;
    }

    .page-numbers {
      display: flex;
      gap: 4px;
    }

    .page-btn {
      padding: 8px 12px;
      border: 1px solid var(--gray-300);
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: var(--font-size-md);
      min-width: 40px;
      transition: all 0.2s;
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
    }

    tr.group-row.client-group .progress-circle {
      height: 27px;
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

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      
      .header-controls {
        width: 100%;
        justify-content: flex-end;
      }
      
      .table-controls {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
      
      .pagination-controls {
        justify-content: center;
      }
      
      .pagination-container {
        flex-direction: column;
        gap: 12px;
      }
      
      .mission-count-display {
        text-align: center;
      }
      
      .page-numbers {
        display: none;
      }
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
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-xl);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
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
      gap: 16px;
      margin-top: 8px;
      font-size: var(--font-size-sm);
      color: var(--gray-600);
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

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--gray-200);
      background: var(--primary-color);
      color: white;
      border-radius: 12px 12px 0 0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      color: white;
      font-size: var(--font-size-xl);
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    }

    .modal-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .modal-body {
      padding: 24px;
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
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--gray-100);
      border-radius: 6px;
      margin-top: 8px;
    }

    .file-name {
      font-size: var(--font-size-md);
      color: var(--gray-700);
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
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid var(--gray-200);
      background: var(--gray-50);
      border-radius: 0 0 12px 12px;
    }

    .btn-cancel {
      padding: 10px 20px;
      border: 1px solid var(--gray-300);
      background: white;
      color: var(--gray-700);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: var(--gray-50);
      border-color: var(--gray-400);
    }

    .btn-save {
      padding: 10px 20px;
      border: none;
      background: var(--primary-color);
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-save:hover {
      background: var(--primary-dark);
    }

    @media (max-width: 1200px) {
      .mission-table {
        font-size: var(--font-size-sm);
      }
      
      .column-header,
      .mission-row td {
        padding: 8px 6px;
      }
      
      .progress-circle {
        width: 35px;
        height: 35px;
        font-size: var(--font-size-sm);
      }
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
  completeGroupedData: GroupData[] = [];
  currentPage = 1;
  itemsPerPage = 150;
  totalMissions = 0;
  totalPages = 0;
  startIndex = 0;
  endIndex = 0;

  currentUser: UserProfile | null = null;
  userEmail: string = '';

  public modalData: ModalData = {
    isOpen: false,
    columnName: '',
    missionId: '',
    currentStatus: false,
    selectedFile: null
  };
  uploadedDocuments: { [key: string]: File | null } = {};
  cartoLabAnswers: { [key: string]: string } = {
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    question5: ''
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Récupérer les informations utilisateur
    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
      this.userEmail = user?.mail || '';
      // console.log('Email :', this.userEmail);
      if(this.userEmail) {
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
    // Récupérer les données des missions depuis l'API
    console.log('Email api:', this.userEmail);
    this.http.get<{ success: boolean; data: MissionData[]; count: number; timestamp: string }>(`${environment.apiUrl}/missions/getAllMissionsDashboard/${this.userEmail}`)
      .subscribe((response) => {
        this.processData(response.data);
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
    const paginatedMissions = this.allMissions.slice(this.startIndex, this.endIndex);
    
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
    
    // // Quand on ouvre/ferme le groupe, synchroniser tous les clients avec l'état du groupe
    // this.paginatedData[index].clients.forEach(client => {
    //   client.expanded = this.paginatedData[index].expanded;
      
    //   // Synchroniser avec les données complètes
    //   if (completeGroup) {
    //     const completeClient = completeGroup.clients.find(c => c.numeroClient === client.numeroClient);
    //     if (completeClient) {
    //       completeClient.expanded = client.expanded;
    //     }
    //   }
    // });
    
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
    if (client.missions.length === 0) return 0;
    
    const total = client.missions.reduce((sum, mission) => {
      return sum + mission[phase].percentage;
    }, 0);
    
    return Math.round(total / client.missions.length);
  }

  getClientRecap(client: ClientGroup, phase: 'avantMission' | 'pendantMission' | 'finMission', colonne: String): String {
    if (client.missions.length === 0) return '<div class="recap-dossier-groupe recap-empty">0/0</div>';
    
    let totalMissions = 0;
    let nbMissionsValide = 0;

    client.missions.forEach(mission => {
      totalMissions++;
      // @ts-ignore
      if (mission[phase][colonne] == true) {
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

    group.clients.forEach(client => {
      client.missions.forEach(mission => {
        totalMissions++;
        // @ts-ignore
        if (mission[phase][colonne] == true) {
          nbMissionsValide++;
        }
      });
    });
  
    let className = '';
    if (totalMissions === nbMissionsValide) {
      className += ' recap-complete';
    } else {
      className += ' recap-incomplete';
    }

    return `<div class="recap-dossier-groupe ${className}">${nbMissionsValide}/${totalMissions}</div>`;
  }

  getGroupeAverage(group: GroupData, phase: 'avantMission' | 'pendantMission' | 'finMission'): number {
    const allMissions = group.clients.flatMap(client => client.missions);
    if (allMissions.length === 0) return 0;
    
    const total = allMissions.reduce((sum, mission) => {
      return sum + mission[phase].percentage;
    }, 0);
    
    return Math.round(total / allMissions.length);
  }

  public openStatusModal(columnName: string, missionId: string, currentStatus: boolean): void {
    // Initialiser les données de base
    this.modalData = {
      isOpen: true,
      columnName: columnName,
      missionId: missionId,
      currentStatus: currentStatus,
      selectedFile: null,
      selectedFile2: null
    };

    // Configuration spécifique par module
    switch (columnName) {
      case 'Conflit Check':
        this.modalData.type = 'pdf';
        this.modalData.title = 'Conflit Check - Dépôt PDF';
        this.modalData.description = 'Déposez le PDF de vérification des conflits';
        this.modalData.acceptedTypes = '.pdf';
        break;

      case 'LAB':
        this.modalData.type = 'document';
        this.modalData.title = 'LAB - Dépôt Document';
        this.modalData.description = 'Déposez le document LAB';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'Carto LAB':
        this.modalData.type = 'questionnaire';
        this.modalData.title = 'Carto LAB - Questionnaire';
        this.modalData.description = 'Remplissez le questionnaire de cartographie';
        break;

      case 'QAC':
        this.modalData.type = 'document';
        this.modalData.title = 'QAC - Dépôt Document';
        this.modalData.description = 'Déposez le document QAC';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'QAM':
        this.modalData.type = 'document';
        this.modalData.title = 'QAM - Dépôt Document';
        this.modalData.description = 'Déposez le document QAM';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'LDM':
        this.modalData.type = 'document';
        this.modalData.title = 'LDM - Dépôt Document';
        this.modalData.description = 'Déposez le document LDM';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'NOG':
        this.modalData.type = 'document';
        this.modalData.title = 'NOG - Dépôt Document';
        this.modalData.description = 'Déposez le document NOG';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'Checklist':
        this.modalData.type = 'document';
        this.modalData.title = 'Checklist - Dépôt Document';
        this.modalData.description = 'Déposez le document Checklist';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'Révision':
        this.modalData.type = 'document';
        this.modalData.title = 'Révision - Dépôt Document';
        this.modalData.description = 'Déposez le document de révision';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'Supervision':
        this.modalData.type = 'document';
        this.modalData.title = 'Supervision - Dépôt Document';
        this.modalData.description = 'Déposez le document de supervision';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'NDS/CR Mission':
        this.modalData.type = 'document';
        this.modalData.title = 'NDS/CR Mission - Dépôt Document';
        this.modalData.description = 'Déposez le document NDS/CR Mission';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'QMM':
        this.modalData.type = 'document';
        this.modalData.title = 'QMM - Dépôt Document';
        this.modalData.description = 'Déposez le document QMM';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'Plaquette':
        this.modalData.type = 'double-document';
        this.modalData.title = 'Plaquette - Dépôt Documents';
        this.modalData.description = 'Déposez la plaquette et le mail d\'accompagnement';
        this.modalData.acceptedTypes = '.pdf,.doc,.docx';
        break;

      case 'Restitution communication client':
        this.modalData.type = 'document';
        this.modalData.title = 'Restitution - Dépôt Document';
        this.modalData.description = 'Déposez le document de restitution';
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
  }

  public closeModal(): void {
    this.modalData.isOpen = false;
    this.modalData.selectedFile = null;
  }

  onFileSelected(event: Event, fileNumber?: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      if (fileNumber === 1) {
        this.modalData.selectedFile = input.files[0];
      } else if (fileNumber === 2) {
        this.modalData.selectedFile2 = input.files[0];
      } else {
        this.modalData.selectedFile = input.files[0];
      }
      this.updateModuleStatus();
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

  removeFile(fileNumber?: number): void {
    if (fileNumber === 1) {
      this.modalData.selectedFile = null;
    } else if (fileNumber === 2) {
      this.modalData.selectedFile2 = null;
    } else {
      this.modalData.selectedFile = null;
    }
    this.updateModuleStatus();
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
}
