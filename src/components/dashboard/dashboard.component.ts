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
              <th *ngIf="!avantMissionCollapsed" class="column-header">Conflit Check</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">LAB</th>
              <th *ngIf="!avantMissionCollapsed" class="column-header">Carto LAB</th>
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
              <th *ngIf="!finMissionCollapsed" class="column-header">Fin Relation Client</th>
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
})
export class DashboardComponent implements OnInit {