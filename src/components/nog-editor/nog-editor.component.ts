import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface Mission {
  MD_MISSION: string;
  LIBELLE_MISSIONS: string;
}

interface Millesime {
  MD_MILLESIME: string;
}

interface NogPartie1 {
  coordonnees: Coordonnees;
  contacts: Contacts[];
  associes: Associes[];
  chiffresSignificatifs: ChiffresSignificatifs[];
  activiteExHisto: string;
}

interface Coordonnees {
  DOS_PGI: string;
  DOS_NOM: string;
  NAF_ID: string;
  NAF_LIBELLE: string;
  DOS_SIRET: string;
  DOS_ADRESSE: string;
  DOS_VILLE: string;
  DOS_CP: string;
}

interface Contacts {
  id: number;
  nom: string;
  prenom: string;
  mail: string;
  telephone: string;
  fonction: string;
  libelle: string;
  isEditing?: boolean;
}

interface Associes {
  nom: string;
  nbPart: number;
  pourcPart: number;
  isEditing?: boolean;
}

interface ChiffresSignificatifs {
  dosPgi: string;
  datePeriode: string;
  dureeExercice: string;
  effectif: number;
  capitauxPropres: number;
  bilanNet: number;
  ca: number;
  beneficePerte: number;
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
    CommonModule,
    FormsModule
  ],
  template: `
    <div *ngIf="!isDossierMissionMillesimeSelected" id="container-select-dossier">
      <div class="form-group">
        <label for="dossier-input">Choisissez votre dossier :</label>
        <div class="autocomplete-container">
          <input 
            type="text" 
            id="dossier-input"
            [value]="selectedDossierDisplay"
            (input)="onDossierInputChange($event.target.value)"
            (blur)="hideDossierDropdown()"
            placeholder="Tapez pour rechercher un dossier..."
            class="dossier-input"
            autocomplete="off">
          
          <!-- Dropdown des suggestions -->
          <div *ngIf="showDossierDropdown" class="dossier-dropdown">
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

      <!-- Dropdown des missions -->
      <div class="form-group" *ngIf="selectedDossier">
        <label for="mission-select">Choisissez votre mission :</label>
        <select 
          id="mission-select"
          [(ngModel)]="selectedMission"
          (change)="onMissionChange()"
          class="mission-select">
          <option value="">-- Sélectionnez une mission --</option>
          <option *ngFor="let mission of availableMissions" 
                  [value]="mission.MD_MISSION">
            {{ mission.MD_MISSION + ' - ' + mission.LIBELLE_MISSIONS }}
          </option>
        </select>
      </div>

      <!-- Dropdown des millésimes -->
      <div class="form-group" *ngIf="selectedDossier && selectedMission">
        <label for="millesime-select">Choisissez votre millésime :</label>
        <select 
          id="millesime-select"
          [(ngModel)]="selectedMillesime"
          (change)="onMillesimeChange()"
          class="millesime-select">
          <option value="">-- Sélectionnez un millésime --</option>
          <option *ngFor="let millesime of availableMillesimes" 
                  [value]="millesime.MD_MILLESIME">
            {{ millesime.MD_MILLESIME }}
          </option>
        </select>
      </div>

      <!-- Bouton de validation -->
      <div class="form-group" *ngIf="selectedDossier && selectedMission && selectedMillesime">
        <button 
          class="validate-btn"
          (click)="validateSelection()"
          [disabled]="!canValidate()">
          Valider la sélection
        </button>
      </div>

      <!-- Affichage de la sélection -->
      <div class="selection-summary" *ngIf="selectedDossier && selectedMission && selectedMillesime">
        <h3>Sélection actuelle :</h3>
        <p><strong>Dossier :</strong> {{ selectedDossier.DOS_PGI }} - {{ selectedDossier.DOS_NOM }}</p>
        <p><strong>Mission :</strong> {{ selectedMission }} - {{ getSelectedMissionLabel() }}</p>
        <p><strong>Millésime :</strong> {{ selectedMillesime }}</p>
      </div>
    </div>

    <div *ngIf="isDossierMissionMillesimeSelected && !isAllDataNogLoaded" id="container-loader-all-data-nog">
      <i class="fa-solid fa-spinner-scale fa-spin-pulse"></i>
      <div class="container-text-loader-nog">
        <div class="text-loader-nog">Importation des données en cours...</div>
        <div class="text-loader-nog">Veuillez ne pas fermer cette page</div>
      </div>
    </div>

    <div *ngIf="isDossierMissionMillesimeSelected && isAllDataNogLoaded" id="container-page-nog">
      <div id="part-top-page-nog">
        <div id="container-dossier-selected">
          <div><strong>Dossier :</strong> {{ selectedDossierDisplay }} </div>
          <div><strong>Mission :</strong> {{ selectedMission }} - {{ getSelectedMissionLabel() }}</div>
          <div><strong>Millésime :</strong> {{ selectedMillesime }}</div>
        </div>
      </div>
      <div id="part-bottom-page-nog">
        <div id="part-bottom-left-page-nog">
          <div id="container-menu-nog">
            <div class="container-element-menu-nog selected" (click)="changePartNog('1', $event)">
              <div class="text-element-menu-nog">1. Présentation de la société</div>
            </div>
            <div class="container-element-menu-nog" (click)="changePartNog('2', $event)">
              <div class="text-element-menu-nog">2. Présentation de la mission</div>
            </div>
            <div class="container-element-menu-nog" (click)="changePartNog('3', $event)">
              <div class="text-element-menu-nog">3. Organisation administrative et comptable</div>
            </div>
            <div class="container-element-menu-nog" (click)="changePartNog('4', $event)">
              <div class="text-element-menu-nog">4. Zones de risque</div>
            </div>
            <div class="container-element-menu-nog" (click)="changePartNog('5', $event)">
              <div class="text-element-menu-nog">5. Diligences</div>
            </div>
            <div class="container-element-menu-nog" (click)="changePartNog('6', $event)">
              <div class="text-element-menu-nog">6. Restitution clients</div>
            </div>
            <div class="container-element-menu-nog" (click)="changePartNog('7', $event)">
              <div class="text-element-menu-nog">7. Déontologie</div>
            </div>
            <div class="container-element-menu-nog" (click)="changePartNog('annexes', $event)">
              <div class="text-element-menu-nog">Annexes</div>
            </div>
          </div>
        </div>
        <div id="part-bottom-right-page-nog">
          <div *ngIf="selectedPartNog=='1'" id="container-part-1-nog" class="container-part-nog">
            <div class="row-part-nog">
              <div id="container-part-1-1-nog" class="containter-element-nog">
                <div class="title-element-nog">1.1. Coordonnées</div>
                <div class="body-element-nog">
                  <div class="row-coordonnees-nog">
                    <div class="icon-coordonnees-nog">
                      <i class="fa-regular fa-building-memo"></i>
                    </div>
                    <div class="text-coordonnees-nog"><strong> {{ nogPartie1.coordonnees.DOS_NOM }} </strong></div>
                  </div>
                  <div class="row-coordonnees-nog">
                    <div class="icon-coordonnees-nog">
                      <i class="fa-regular fa-location-dot"></i>
                    </div>
                    <div class="text-coordonnees-nog"> {{ nogPartie1.coordonnees.DOS_ADRESSE }} {{ nogPartie1.coordonnees.DOS_CP }} {{ nogPartie1.coordonnees.DOS_VILLE }} </div>
                  </div>
                  <div class="row-coordonnees-nog">
                    <div class="icon-coordonnees-nog">
                      <i class="fa-regular fa-fingerprint"></i>
                      <strong>Siret :</strong>
                    </div>
                    <div class="text-coordonnees-nog"> {{ nogPartie1.coordonnees.DOS_SIRET }} </div>
                  </div>
                  <div class="row-coordonnees-nog">
                    <div class="icon-coordonnees-nog">
                      <i class="fa-regular fa-memo-circle-info"></i>
                      <strong>APE :</strong>
                    </div>
                    <div class="text-coordonnees-nog"> {{ nogPartie1.coordonnees.NAF_LIBELLE }} </div>
                  </div>
                </div>
              </div>

              <div id="container-part-1-2-nog" class="containter-element-nog">
                <div class="title-element-nog">1.2. Contacts</div>
                <button class="btn-add-row" (click)="addContact()"><i class="fa-solid fa-plus"></i> Ajouter un contact</button>
                <div class="body-element-nog">
                  <table class="table-nog">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Fonction</th>
                        <th>Télephone</th>
                        <th>Adresse mail</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <ng-container *ngFor="let contact of nogPartie1.contacts; let i = index">
                        <tr>
                          <td>
                            <input *ngIf="contact.isEditing" type="text" [(ngModel)]="contact.prenom" class="input-table-nog" style="width: 45%; display: inline-block;">
                            <input *ngIf="contact.isEditing" type="text" [(ngModel)]="contact.nom" class="input-table-nog" style="width: 45%; display: inline-block; margin-left: 5%;">
                            <span *ngIf="!contact.isEditing">{{ contact.prenom }} {{ contact.nom }}</span>
                          </td>
                          <td>
                            <input *ngIf="contact.isEditing" type="text" [(ngModel)]="contact.libelle" class="input-table-nog">
                            <span *ngIf="!contact.isEditing">{{ contact.libelle }}</span>
                          </td>
                          <td>
                            <input *ngIf="contact.isEditing" type="text" [(ngModel)]="contact.telephone" class="input-table-nog">
                            <span *ngIf="!contact.isEditing">{{ contact.telephone }}</span>
                          </td>
                          <td>
                            <input *ngIf="contact.isEditing" type="email" [(ngModel)]="contact.mail" class="input-table-nog">
                            <span *ngIf="!contact.isEditing">{{ contact.mail }}</span>
                          </td>
                          <td>
                            <div class="action-tableau">
                              <i *ngIf="!contact.isEditing" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditContact(i)"></i>
                              <i *ngIf="contact.isEditing" class="fa-solid fa-check action-validate" (click)="toggleEditContact(i)"></i>
                              <i class="fa-solid fa-trash action-delete" (click)="deleteContact(i)"></i>
                            </div>
                          </td>
                        </tr>
                      </ng-container>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="row-part-nog">
              <div id="container-part-1-3-nog" class="containter-element-nog">
                <div class="title-element-nog">1.3. Associés</div>
                <button class="btn-add-row" (click)="addAssocie()"><i class="fa-solid fa-plus"></i> Ajouter un associé</button>
                <div class="body-element-nog">
                  <table class="table-nog">
                    <thead>
                      <tr>
                        <th>Nom de l'associé</th>
                        <th>Nombre de titres détenus</th>
                        <th>Montant du capital détenu</th>
                        <th>% de détention</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <ng-container *ngFor="let associe of nogPartie1.associes; let i = index">
                        <tr>
                          <td>
                            <input *ngIf="associe.isEditing" type="text" [(ngModel)]="associe.nom" class="input-table-nog">
                            <span *ngIf="!associe.isEditing">{{ associe.nom }}</span>
                          </td>
                          <td>
                            <input *ngIf="associe.isEditing" type="number" [(ngModel)]="associe.nbPart" class="input-table-nog">
                            <span *ngIf="!associe.isEditing">{{ formatNumber(associe.nbPart) }}</span>
                          </td>
                          <td></td>
                          <td>
                            <input *ngIf="associe.isEditing" type="number" [(ngModel)]="associe.pourcPart" class="input-table-nog">
                            <span *ngIf="!associe.isEditing">{{ formatNumber(associe.pourcPart) }}</span>
                          </td>
                          <td>
                            <div class="action-tableau">
                              <i *ngIf="!associe.isEditing" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditAssocie(i)"></i>
                              <i *ngIf="associe.isEditing" class="fa-solid fa-check action-validate" (click)="toggleEditAssocie(i)"></i>
                              <i class="fa-solid fa-trash action-delete" (click)="deleteAssocie(i)"></i>
                            </div>
                          </td>
                        </tr>
                      </ng-container>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="row-part-nog">
              <div id="container-part-1-4-nog" class="containter-element-nog">
                <div class="title-element-nog">1.4. Chiffres significatifs</div>
                <div class="body-element-nog">
                  <div id="container-chiffres-sign-nog">
                    <div class="colonne-chiffres-sign-nog">
                      <div></div>
                      <div class="libelle-chiffres-sign-nog">Effectif</div>
                      <div class="libelle-chiffres-sign-nog">Capitaux propres</div>
                      <div class="libelle-chiffres-sign-nog">Total bilan</div>
                      <div class="libelle-chiffres-sign-nog">Chiffres d'affaires</div>
                      <div class="libelle-chiffres-sign-nog">Résultat net (ou avant impôt)</div>
                    </div>

                    <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                      <div class="colonne-chiffres-sign-nog">
                        <div class="titre-colonne-chiffres-sign-nog"> {{ formatDate(cs.datePeriode) }} ({{ cs.dureeExercice }} mois) </div>
                        <div class="montant-chiffres-sign-nog">
                          <input type="number" [(ngModel)]="cs.effectif" (ngModelChange)="updateVariations()" class="input-chiffres-sign-nog">
                        </div>
                        <div class="montant-chiffres-sign-nog">
                          <input type="number" [(ngModel)]="cs.capitauxPropres" (ngModelChange)="updateVariations()" class="input-chiffres-sign-nog">
                        </div>
                        <div class="montant-chiffres-sign-nog">
                          <input type="number" [(ngModel)]="cs.bilanNet" (ngModelChange)="updateVariations()" class="input-chiffres-sign-nog">
                        </div>
                        <div class="montant-chiffres-sign-nog">
                          <input type="number" [(ngModel)]="cs.ca" (ngModelChange)="updateVariations()" class="input-chiffres-sign-nog">
                        </div>
                        <div class="montant-chiffres-sign-nog">
                          <input type="number" [(ngModel)]="cs.beneficePerte" (ngModelChange)="updateVariations()" class="input-chiffres-sign-nog">
                        </div>
                      </div>
                    </ng-container>

                    <div class="colonne-chiffres-sign-nog" id="colonne-variation-cs">
                      <div class="titre-colonne-chiffres-sign-nog">Variation</div>
                      <div class="montant-chiffres-sign-nog">{{ calculateVariation('effectif') }}</div>
                      <div class="montant-chiffres-sign-nog">{{ calculateVariation('capitauxPropres') }}</div>
                      <div class="montant-chiffres-sign-nog">{{ calculateVariation('bilanNet') }}</div>
                      <div class="montant-chiffres-sign-nog">{{ calculateVariation('ca') }}</div>
                      <div class="montant-chiffres-sign-nog">{{ calculateVariation('beneficePerte') }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row-part-nog">
              <div id="container-part-1-5-nog" class="containter-element-nog">
                <div class="title-element-nog">1.5. Activité exercée et historique</div>
                <div class="body-element-nog">
                  <div id="editeur-texte-activite-exerce">
                    <div class="toolbar-editor">
                      <button (click)="execCommand('bold')" class="btn-toolbar" title="Gras"><i class="fa-solid fa-bold"></i></button>
                      <button (click)="execCommand('italic')" class="btn-toolbar" title="Italique"><i class="fa-solid fa-italic"></i></button>
                      <button (click)="execCommand('underline')" class="btn-toolbar" title="Souligné"><i class="fa-solid fa-underline"></i></button>
                      <button (click)="execCommand('insertUnorderedList')" class="btn-toolbar" title="Liste à puces"><i class="fa-solid fa-list-ul"></i></button>
                      <button (click)="execCommand('insertOrderedList')" class="btn-toolbar" title="Liste numérotée"><i class="fa-solid fa-list-ol"></i></button>
                      <input type="color" (change)="changeColor($event)" class="color-picker" title="Couleur du texte">
                      <button (click)="execCommand('justifyLeft')" class="btn-toolbar" title="Aligner à gauche"><i class="fa-solid fa-align-left"></i></button>
                      <button (click)="execCommand('justifyCenter')" class="btn-toolbar" title="Centrer"><i class="fa-solid fa-align-center"></i></button>
                      <button (click)="execCommand('justifyRight')" class="btn-toolbar" title="Aligner à droite"><i class="fa-solid fa-align-right"></i></button>
                    </div>
                    <div
                      contenteditable="true"
                      class="editor-content"
                      #editorContent
                      (input)="onEditorContentChange($event)"
                      (keyup)="onEditorContentChange($event)"
                      (paste)="onEditorContentChange($event)">
                      {{ nogPartie1.activiteExHisto }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="selectedPartNog=='2'" id="container-part-2-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='3'" id="container-part-3-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='4'" id="container-part-4-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='5'" id="container-part-5-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='6'" id="container-part-6-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='7'" id="container-part-7-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='annexes'" id="container-part-annexes-nog" class="container-part-nog">
          
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    #container-select-dossier {
      padding: 2vh 2vw;
      max-width: 35vw;
      margin-left: auto;
      margin-right: auto;
      margin-top: 15vh;
    }

    .form-group {
      margin-bottom: 2vh;
    }

    .form-group label {
      display: block;
      margin-bottom: 1vh;
      font-weight: 500;
      color: var(--gray-700);
      font-size: var(--font-size-lg);
    }

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

    .mission-select,
    .millesime-select {
      width: 100%;
      padding: 1vh 1vw;
      border: 0.2vh solid var(--gray-300);
      border-radius: 0.5vw;
      font-size: var(--font-size-md);
      transition: all 0.2s;
      background: white;
    }

    .mission-select:focus,
    .millesime-select:focus {
      outline: none;
      border-color: var(--secondary-color);
      box-shadow: 0 0 0 3px rgba(100, 206, 199, 0.1);
    }

    .validate-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 1.5vh 2vw;
      border-radius: 0.5vw;
      font-size: var(--font-size-lg);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }

    .validate-btn:hover:not(:disabled) {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .validate-btn:disabled {
      background: var(--gray-400);
      cursor: not-allowed;
      transform: none;
    }

    .selection-summary {
      background: var(--gray-50);
      border: 0.1vh solid var(--gray-200);
      border-radius: 0.5vw;
      padding: 1.5vh 1.5vw;
      margin-top: 2vh;
    }

    .selection-summary h3 {
      margin: 0 0 1vh 0;
      color: var(--primary-color);
      font-size: var(--font-size-lg);
    }

    .selection-summary p {
      margin: 0.5vh 0;
      font-size: var(--font-size-md);
      color: var(--gray-700);
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

    div#container-dossier-selected {
      display: flex;
      align-items: center;
      height: 100%;
      gap: 1vw;
      font-size: var(--font-size-md);
      color: white;
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

    div#container-page-nog {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 92vh;
    }

    div#part-top-page-nog {
      height: 6vh;
      background-color: var(--primary-light);
      padding: 1vh 1vw;
    }

    div#part-bottom-page-nog {
      height: 86vh;
      display: flex;
    }

    div#part-bottom-left-page-nog {
      width: 15vw;
      padding: 1vh 1vw;
    }

    div#container-menu-nog {
      display: flex;
      flex-direction: column;
      gap: 1vh;
    }

    .text-element-menu-nog {
      font-size: var(--font-size-md);
      cursor: pointer;
      color: var(--gray-400);
    }

    .container-element-menu-nog.selected .text-element-menu-nog {
      color: var(--primary-color);
      font-weight: 600;
    }

    .text-element-menu-nog:hover {
      color: var(--primary-color);
    }

    div#part-bottom-right-page-nog {
      width: 85vw;
      background-color: var(--gray-100);
      overflow-y: auto;
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

    div#container-loader-all-data-nog {
      width: 100%;
      height: 92vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 2vh;
    }

    div#container-loader-all-data-nog .fa-spinner-scale {
      font-size: 3vw;
      height: 6vh;
      width: 3vw;
      color: var(--primary-color);
    }

    .text-loader-nog {
      text-align: center;
      font-size: var(--font-size-md);
    }

    .container-text-loader-nog {
      display: flex;
      flex-direction: column;
      gap: 0.5vh;
    }

    .row-part-nog {
      display: flex;
      height: 25vh;
      justify-content: space-between;
    }

    .containter-element-nog {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .body-element-nog {
      background-color: white;
      height: 90%; 
      position: relative;
    }

    .row-coordonnees-nog {
      display: flex;
      align-items: center;
      gap: 0.5vw;
    }

    .text-coordonnees-nog {
      font-size: var(--font-size-md);
    }

    .icon-coordonnees-nog i {
      font-size: var(--font-size-lg);
    }

    .icon-coordonnees-nog strong {
      font-size: var(--font-size-md);
    }

    .title-element-nog {
      font-size: var(--font-size-lg);
      color: var(--primary-dark);
      font-weight: 600;
      height: 16%;
      padding: 1vh 0;
    }

    .icon-coordonnees-nog {
      color: var(--primary-dark);
      display: flex;
      align-items: center;
      gap: 0.2vw;
    }

    div#container-part-1-1-nog .body-element-nog {
      width: 30vw;
      padding: 2vh 2vw;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2vh;
    }

    .container-part-nog {
      padding: 2vh 2vw;
      display: flex;
      flex-direction: column;
      gap: 2vh;
    }

    div#container-part-1-2-nog .body-element-nog {
      width: 45vw;
    }

    table.table-nog {
      width: 100%;
    }

    table.table-nog thead th {
      background-color: var(--primary-color);
      color: white;
      font-size: var(--font-size-md);
      font-weight: 600;
      text-align: left;
      padding: 0.5vh 0.4vw;
    }

    table.table-nog tbody td {
      padding: 0.5vh 0.4vw;
      font-size: var(--font-size-md);
      text-align: left;
    }

    table.table-nog tbody tr:nth-child(even) {
      background-color: var(--gray-100);
    }

    .action-tableau {
      width: 100%;
      display: flex;
      gap: 1vw;
      justify-content: center;
    }

    .action-tableau i {
      color: var(--gray-400);
      cursor: pointer;
    }

    .action-tableau .action-edit:hover {
      color: #f59e0b;
    }

    .action-tableau .action-delete:hover {
      color: #b50000;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(1),
    div#container-part-1-2-nog .table-nog td:nth-child(1){
      width: 13vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(2),
    div#container-part-1-2-nog .table-nog td:nth-child(2){
      width: 8vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(3),
    div#container-part-1-2-nog .table-nog td:nth-child(3){
      width: 8vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(4),
    div#container-part-1-2-nog .table-nog td:nth-child(4){
      width: 12vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(5),
    div#container-part-1-2-nog .table-nog td:nth-child(5){
      width: 3.5vw;
      white-space: nowrap;
    }

    div#container-part-1-3-nog .body-element-nog {
      width: 81vw;
    }

    div#container-part-1-3-nog .table-nog th:nth-child(1),
    div#container-part-1-3-nog .table-nog td:nth-child(1){
      width: 17vw;
      white-space: nowrap;
    }

    div#container-part-1-3-nog .table-nog th:nth-child(2),
    div#container-part-1-3-nog .table-nog td:nth-child(2){
      width: 17vw;
      white-space: nowrap;
    }

    div#container-part-1-3-nog .table-nog th:nth-child(3),
    div#container-part-1-3-nog .table-nog td:nth-child(3){
      width: 17vw;
      white-space: nowrap;
    }

    div#container-part-1-3-nog .table-nog th:nth-child(4),
    div#container-part-1-3-nog .table-nog td:nth-child(4){
      width: 17vw;
      white-space: nowrap;
    }

    div#container-part-1-3-nog .table-nog th:nth-child(5),
    div#container-part-1-3-nog .table-nog td:nth-child(5){
      width: 3.5vw;
      white-space: nowrap;
    }

    div#container-chiffres-sign-nog {
      display: flex;
      justify-content: space-around;
      height: 100%;
    }

    .colonne-chiffres-sign-nog {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
    }

    .colonne-chiffres-sign-nog div {
      height: 3.5vh;
      width: 18vw;
    }

    .libelle-chiffres-sign-nog, .titre-colonne-chiffres-sign-nog {
      font-size: var(--font-size-md);
      color: var(--primary-dark);
      font-weight: 600;
    }

    div#container-part-1-4-nog .body-element-nog {
      width: 81vw;
    }

    .montant-chiffres-sign-nog {
      font-size: var(--font-size-md);
      text-align: right;
    }

    div#container-part-1-4-nog .body-element-nog {
      padding: 2vh 1vw;
    }

    div#container-part-1-5-nog .body-element-nog {
      width: 81vw;
    }

    .input-table-nog {
      width: 100%;
      padding: 0.3vh 0.3vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      font-size: var(--font-size-md);
    }

    .input-table-nog:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .action-tableau .action-validate {
      color: var(--gray-400);
      cursor: pointer;
    }

    .action-tableau .action-validate:hover {
      color: #10b981;
    }

    .btn-add-row {
      padding: 0.8vh 1vw;
      background-color: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.3vw;
      cursor: pointer;
      font-size: var(--font-size-md);
      transition: all 0.2s;
      width: 11vw;
      position: absolute;
      top: 0;
      right: 0;
    }

    .btn-add-row:hover {
      background-color: var(--primary-dark);
    }

    .btn-add-row i {
      margin-right: 0.5vw;
    }

    .input-chiffres-sign-nog {
      width: 100%;
      padding: 0.3vh 0.3vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      font-size: var(--font-size-md);
      text-align: right;
    }

    .input-chiffres-sign-nog:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    #editeur-texte-activite-exerce {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .toolbar-editor {
      display: flex;
      gap: 0.5vw;
      padding: 0.5vh 0.5vw;
      background-color: var(--gray-100);
      border-bottom: 0.1vh solid var(--gray-300);
      flex-wrap: wrap;
    }

    .btn-toolbar {
      padding: 0.5vh 0.8vw;
      background-color: white;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      cursor: pointer;
      font-size: var(--font-size-md);
      transition: all 0.2s;
    }

    .btn-toolbar:hover {
      background-color: var(--primary-color);
      color: white;
    }

    .color-picker {
      width: 3vw;
      height: 3vh;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      cursor: pointer;
    }

    .editor-content {
      flex: 1;
      padding: 1vh 1vw;
      overflow-y: auto;
      font-size: var(--font-size-md);
      line-height: 1.6;
      outline: none;
    }

    .editor-content:focus {
      background-color: var(--gray-50);
    }
  `]
})
export class NogEditorComponent implements OnInit, OnDestroy {

  isDossierMissionMillesimeSelected = false;
  isAllDataNogLoaded = false;
  isCoordonneesLoaded = false;
  isContactsLoaded = false;
  isChiffresSignificatifsLoaded = false;
  isAssociesLoaded = false;

  filteredDossiers: Dossier[] = [];
  allDossiers: Dossier[] = [];
  allMissionsData: Dossier[] = []; // Stocke toutes les données de l'API
  dossiersLoaded = false;
  showDossierDropdown = false;
  isLoadingAllDossiers = false;
  isSearchingDossiers = false;
  allAdminUsers: string[] = [];
  currentUser: UserProfile | null = null;
  userEmail: string = '';
  usrMailCollab: string = '';
  
  // Variables pour les sélections
  selectedDossier: Dossier | null = null;
  selectedDossierDisplay: string = '';
  selectedMission: string = '';
  selectedMillesime: string = '';

  selectedPartNog: string = '1';
  
  // Listes filtrées
  availableMissions: Mission[] = [];
  availableMillesimes: Millesime[] = [];

  nogPartie1: NogPartie1 = {
    coordonnees: {
      DOS_PGI: '',
      DOS_NOM: '',
      NAF_ID: '',
      NAF_LIBELLE: '',
      DOS_SIRET: '',
      DOS_ADRESSE: '',
      DOS_VILLE: '',
      DOS_CP: ''
    },
    contacts: [],
    associes: [],
    chiffresSignificatifs: [],
    activiteExHisto: ''
  };

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
        this.dossiersLoaded = false;
        this.isLoadingAllDossiers = false;
        this.loadAllDossiers();
      }
    });
  }

  ngOnDestroy(): void {

  }

  selectDossier(dossier: Dossier): void {
    this.selectedDossier = dossier;
    this.selectedDossierDisplay = `${dossier.DOS_PGI.trim()} - ${dossier.DOS_NOM.trim()}`;
    this.showDossierDropdown = false;
    this.filteredDossiers = [];
    
    // Réinitialiser les sélections suivantes
    this.selectedMission = '';
    this.selectedMillesime = '';
    this.availableMillesimes = [];
    
    // Charger les missions pour ce dossier
    this.loadMissionsForDossier();
  }

  loadMissionsForDossier(): void {
    if (!this.selectedDossier) return;
    
    // Filtrer les missions uniques pour le dossier sélectionné
    const missionsForDossier = this.allMissionsData.filter(
      item => item.DOS_PGI === this.selectedDossier!.DOS_PGI
    );
    
    // Créer une liste unique de missions
    const uniqueMissions = new Map<string, Mission>();
    missionsForDossier.forEach(item => {
      if (!uniqueMissions.has(item.MD_MISSION)) {
        uniqueMissions.set(item.MD_MISSION, {
          MD_MISSION: item.MD_MISSION,
          LIBELLE_MISSIONS: item.LIBELLE_MISSIONS
        });
      }
    });
    
    this.availableMissions = Array.from(uniqueMissions.values());
  }

  onMissionChange(): void {
    // Réinitialiser le millésime
    this.selectedMillesime = '';
    
    if (this.selectedMission) {
      this.loadMillesimesForMission();
    } else {
      this.availableMillesimes = [];
    }
  }

  loadMillesimesForMission(): void {
    if (!this.selectedDossier || !this.selectedMission) return;
    
    // Filtrer les millésimes pour le dossier et la mission sélectionnés
    const millesimesForMission = this.allMissionsData.filter(
      item => item.DOS_PGI === this.selectedDossier!.DOS_PGI && 
              item.MD_MISSION === this.selectedMission
    );
    
    // Créer une liste unique de millésimes
    const uniqueMillesimes = new Map<string, Millesime>();
    millesimesForMission.forEach(item => {
      if (!uniqueMillesimes.has(item.MD_MILLESIME)) {
        uniqueMillesimes.set(item.MD_MILLESIME, {
          MD_MILLESIME: item.MD_MILLESIME
        });
      }
    });
    
    this.availableMillesimes = Array.from(uniqueMillesimes.values())
      .sort((a, b) => b.MD_MILLESIME.localeCompare(a.MD_MILLESIME)); // Tri décroissant
  }

  onMillesimeChange(): void {
    // Rien de spécial à faire pour l'instant
  }

  canValidate(): boolean {
    return !!(this.selectedDossier && this.selectedMission && this.selectedMillesime);
  }

  validateSelection(): void {
    if (!this.canValidate()) return;
    
    console.log('Sélection validée:', {
      dossier: this.selectedDossier,
      mission: this.selectedMission,
      millesime: this.selectedMillesime
    });
    
    this.isDossierMissionMillesimeSelected = true;

    this.loadCoordonnees();
    this.loadContacts();
    this.loadChiffresSignificatifs();
    this.loadAssocies();
  }

  getSelectedMissionLabel(): string {
    const mission = this.availableMissions.find(m => m.MD_MISSION === this.selectedMission);
    return mission ? mission.LIBELLE_MISSIONS : '';
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
    this.selectedDossierDisplay = value;
    
    // Si l'utilisateur tape quelque chose de différent, réinitialiser la sélection
    if (this.selectedDossier && 
        value !== `${this.selectedDossier.DOS_PGI.trim()} - ${this.selectedDossier.DOS_NOM.trim()}`) {
      this.selectedDossier = null;
      this.selectedMission = '';
      this.selectedMillesime = '';
      this.availableMissions = [];
      this.availableMillesimes = [];
    }
    
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
        // Stocker toutes les données pour les filtres en cascade
        this.allMissionsData = response.data;
        
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
      console.error('Erreur lors du chargement des dossiers:', error);
      this.allDossiers = [];
    } finally {
      this.dossiersLoaded = true;
    }
  }

  hideDossierDropdown(): void {
    // Délai pour permettre le clic sur un élément de la liste
    setTimeout(() => {
      this.showDossierDropdown = false;
    }, 200);
  }

  loadCoordonnees(): void {
    this.http.get<{ success: boolean; data: Coordonnees[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getCoordonneesNog/${this.selectedDossier?.DOS_PGI}`)
    .subscribe(response => {
      this.nogPartie1.coordonnees.DOS_PGI = response.data[0].DOS_PGI;
      this.nogPartie1.coordonnees.DOS_NOM = response.data[0].DOS_NOM;
      this.nogPartie1.coordonnees.DOS_SIRET = response.data[0].DOS_SIRET;
      this.nogPartie1.coordonnees.DOS_ADRESSE = response.data[0].DOS_ADRESSE;
      this.nogPartie1.coordonnees.DOS_CP = response.data[0].DOS_CP;
      this.nogPartie1.coordonnees.DOS_ADRESSE = response.data[0].DOS_ADRESSE;
      this.isCoordonneesLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 1',this.nogPartie1);
    });
  }

  loadContacts(): void {
    this.http.get<Contacts[]>(`${environment.apiUrlMyVision}/dossierDetail/getContactDossierForMyJourney/${this.selectedDossier?.DOS_PGI}`)
    .subscribe(response => {
      this.nogPartie1.contacts = response;
      this.isContactsLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 1',this.nogPartie1);
    });
  }

  loadChiffresSignificatifs(): void {
    this.http.get<ChiffresSignificatifs[]>(`${environment.apiUrlMyVision}/dossierDetail/getChiffresSignificatifsNogMyJourney/${this.selectedDossier?.DOS_PGI}`)
    .subscribe(response => {
      this.nogPartie1.chiffresSignificatifs = response;
      this.isChiffresSignificatifsLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 1',this.nogPartie1);
    });
  }

  loadAssocies(): void {
    this.http.get<Associes[]>(`${environment.apiUrlMyVision}/dossierDetail/getAssocieNogMyJourney/${this.selectedDossier?.DOS_PGI}`)
    .subscribe(response => {
      this.nogPartie1.associes = response;
      this.isAssociesLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 1',this.nogPartie1);
    });
  }

  checkIdAllDataLoaded(): void {
    if(this.isCoordonneesLoaded && this.isContactsLoaded && this.isChiffresSignificatifsLoaded && this.isAssociesLoaded) {
      this.isAllDataNogLoaded = true;
    }
  }

  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    return value
      .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/\u202F/g, ' ');
  }

  formatDate(value: string): string {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  }

  toggleEditContact(index: number): void {
    this.nogPartie1.contacts[index].isEditing = !this.nogPartie1.contacts[index].isEditing;
  }

  deleteContact(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
      this.nogPartie1.contacts.splice(index, 1);
    }
  }

  addContact(): void {
    this.nogPartie1.contacts.push({
      id: Date.now(),
      nom: '',
      prenom: '',
      mail: '',
      telephone: '',
      fonction: '',
      libelle: '',
      isEditing: true
    });
  }

  toggleEditAssocie(index: number): void {
    this.nogPartie1.associes[index].isEditing = !this.nogPartie1.associes[index].isEditing;
  }

  deleteAssocie(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet associé ?')) {
      this.nogPartie1.associes.splice(index, 1);
    }
  }

  addAssocie(): void {
    this.nogPartie1.associes.push({
      nom: '',
      nbPart: 0,
      pourcPart: 0,
      isEditing: true
    });
  }

  updateVariations(): void {
    // Cette fonction sera appelée automatiquement lors de la modification des inputs
  }

  calculateVariation(field: keyof ChiffresSignificatifs): string {
    if (this.nogPartie1.chiffresSignificatifs.length < 2) return '';
    const cs0 = this.nogPartie1.chiffresSignificatifs[0];
    const cs1 = this.nogPartie1.chiffresSignificatifs[1];

    const val0 = cs0[field] as number;
    const val1 = cs1[field] as number;

    if (val0 === null || val0 === undefined || val1 === null || val1 === undefined) return '';

    const difference = val1 - val0;
    return this.formatNumber(difference);
  }

  execCommand(command: string): void {
    document.execCommand(command, false, '');
  }

  changeColor(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    document.execCommand('foreColor', false, color);
  }

  onEditorContentChange(event: Event): void {
    const target = event.target as HTMLElement;
    // Sauvegarder la position du curseur
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    const cursorPosition = range?.startOffset;
    const parentNode = range?.startContainer;

    // Mettre à jour le contenu
    this.nogPartie1.activiteExHisto = target.innerHTML;
    
    // Restaurer la position du curseur après un court délai
    setTimeout(() => {
      if (selection && range && parentNode && cursorPosition !== undefined) {
        try {
          // Mettre à jour le contenu seulement si différent pour éviter la duplication
          const newContent = target.textContent || '';
          if (this.nogPartie1.activiteExHisto !== newContent) {
            this.nogPartie1.activiteExHisto = newContent;
          }
          if (target.contains(parentNode as Node) || target === parentNode) {
            const newRange = document.createRange();
            newRange.setStart(parentNode, Math.min(cursorPosition, (parentNode as Text).length || 0));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
            // Si le nœud n'existe plus, placer le curseur à la fin
            const newRange = document.createRange();
            newRange.selectNodeContents(target);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } catch (e) {
          // En cas d'erreur, placer le curseur à la fin
          const newRange = document.createRange();
          newRange.selectNodeContents(target);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }, 0);
  }

  changePartNog(value: string, event: MouseEvent): void {
    if(this.selectedPartNog == value) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.parentElement && target.parentElement.parentElement) {
      Array.from(target.parentElement.parentElement.children).forEach(child => {
        child.classList.remove('selected');
      });
      target.parentElement.classList.add('selected');
    }
    this.selectedPartNog = value;
  }
}