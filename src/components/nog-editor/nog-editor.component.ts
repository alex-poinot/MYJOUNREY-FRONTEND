import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { PdfService } from '../../services/pdf.service';
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

interface NogPartie2 {
  dateMiseAJour: string;
  montantHonoraire: number;
  typeMission: string;
  natureMission: string;
  consultationPro: string;
  interim: string;
  final: string;
  delaiRespecter: string;
  planning: Planning[];
  equipeInter: EquipeInter[];
  precisionTravaux: string;
}

interface NogPartie5 {
  diligence: Diligence[];
}

interface Planning {
  id?: number;
  nom: string;
  fonction: string;
  listeLib: string[];
  listeValue: string[];
  isEditing?: boolean;
}

interface EquipeInter {
  respMission: string;
  dmcm: string;
  factureur: string;
  respMissionStatut: string;
  dmcmStatut: string;
  factureurStatut: string;
  isEditingRespMission: boolean;
  isEditingDmcm: boolean;
  isEditingFactureur: boolean;
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
  partCapital: number;
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
interface Diligence {
  groupe: string;
  libelleGroupe: string;
  tabDiligence: TabDiligence[];
}

interface TabDiligence {
  diligence: string;
  titre: string;
  activation: boolean;
  objectif: string;
  controle: string;
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
        <div id="container-bouton-pdf">
          <div id="btn-apercu-pdf" (click)="openApercuPopup()"><i class="fa-solid fa-files"></i> Aperçu</div>
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
                        <th>Prénom</th>
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
                            <input *ngIf="contact.isEditing" type="text" [(ngModel)]="contact.prenom" class="input-table-nog">
                            <span *ngIf="!contact.isEditing">{{ contact.prenom }}</span>
                          </td>
                          <td>
                            <input *ngIf="contact.isEditing" type="text" [(ngModel)]="contact.nom" class="input-table-nog">
                            <span *ngIf="!contact.isEditing">{{ contact.nom }}</span>
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
                          <td>
                            <input *ngIf="associe.isEditing" type="number" [(ngModel)]="associe.partCapital" class="input-table-nog">
                            <span *ngIf="!associe.isEditing">{{ formatNumber(associe.partCapital) }}</span>
                          </td>
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
                      (paste)="onEditorContentChange($event)"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="selectedPartNog=='2'" id="container-part-2-nog" class="container-part-nog">
            <div class="row-part-nog">
              <div id="container-part-2-1-nog" class="containter-element-nog">
                <div class="title-element-nog">2.1. Lettre de mission</div>
                <div class="body-element-nog">
                  <div class="container-input-title-nog">
                    <div class="title-bloc-nog">Date de mise à jour</div> 
                    <div class="input-bloc-nog">
                      <input type="date" [(ngModel)]="nogPartie2.dateMiseAJour" class="input-date-nog">
                    </div>
                  </div>
                  <div class="container-input-title-nog">
                    <div class="title-bloc-nog">Montant des honoraires pour la mission</div> 
                    <div class="input-bloc-nog">
                      <input type="number" [(ngModel)]="nogPartie2.montantHonoraire" class="input-number-nog">
                    </div> 
                  </div>
                </div>
              </div>
            </div>

            <div class="row-part-nog">
              <div id="container-part-2-2-nog" class="containter-element-nog">
                <div class="title-element-nog">2.2. Type de la mission</div>
                <div class="body-element-nog">
                  <div class="container-input-title-nog">
                    <div class="input-bloc-nog">
                      <select [(ngModel)]="nogPartie2.typeMission" (change)="onTypeMissionChange()" class="select-type-mission">
                        <option value="">Sélectionner un type de mission</option>
                        <option *ngFor="let type of getDistinctTypeMissions()" [value]="type">{{ type }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div id="container-part-2-3-nog" class="containter-element-nog">
                <div class="title-element-nog">2.3. Nature de la mission</div>
                <div class="body-element-nog">
                  <div class="container-input-title-nog">
                    <div class="input-bloc-nog">
                      <select [(ngModel)]="nogPartie2.natureMission" class="select-nature-mission">
                        <option value="">Sélectionner une nature de mission</option>
                        <option *ngFor="let nature of getNatureMissionsByType()" [value]="nature">{{ nature }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row-part-nog">
              <div id="container-part-2-4-nog" class="containter-element-nog">
                <div class="title-element-nog">2.4. Planning d'intervention</div>
                <div class="body-element-nog">
                  <div id="part-top-planning-inter-nog">
                    <div id="part-left-planning-inter-nog">
                      <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Consultations d'autres professionnels à prévoir</div> 
                        <div class="input-bloc-nog">
                          <input type="text" [(ngModel)]="nogPartie2.consultationPro" class="input-text-nog">
                        </div> 
                      </div>
                      <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Interim</div> 
                        <div class="input-bloc-nog">
                          <select [(ngModel)]="nogPartie2.interim" class="select-interim">
                            <option value="">Sélectionner une interim</option>
                            <option value="Anuelle">Anuelle</option>
                            <option value="Trimestrielle">Trimestrielle</option>
                            <option value="Mensuelle">Mensuelle</option>
                          </select>
                        </div> 
                      </div>
                    </div>
                    <div id="part-right-planning-inter-nog">
                      <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Final</div> 
                        <div class="input-bloc-nog">
                          <input type="text" [(ngModel)]="nogPartie2.final" class="input-text-nog">
                        </div> 
                      </div>
                      <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Délai à respecter</div> 
                        <div class="input-bloc-nog">
                          <input type="text" [(ngModel)]="nogPartie2.delaiRespecter" class="input-text-nog">
                        </div> 
                      </div>
                    </div>
                  </div>
                  <div id="part-bottom-planning-inter-nog">
                    <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Planning</div> 
                        <div class="input-bloc-nog">
                          <table class="table-nog">
                            <thead>
                              <tr>
                                <th>Fonction</th>
                                <th>Nom</th>
                                <ng-container *ngFor="let column of nogPartie2.planning[0].listeLib">
                                  <th>{{ replaceNameLibelleListeLib(column) }}</th>
                                </ng-container>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr *ngFor="let row of nogPartie2.planning; let i = index; trackBy: trackByIndex">
                                <td>
                                  <input *ngIf="row.isEditing" type="text" [(ngModel)]="row.fonction" class="input-table-nog">
                                  <span *ngIf="!row.isEditing">{{ row.fonction }}</span>
                                </td>
                                <td>
                                  <input *ngIf="row.isEditing" type="text" [(ngModel)]="row.nom" class="input-table-nog">
                                  <span *ngIf="!row.isEditing">{{ row.nom }}</span>
                                </td>
                                <ng-container *ngFor="let value of row.listeValue; let j = index; trackBy: trackByValueIndex">
                                  <td>
                                    <input *ngIf="row.isEditing" type="text" [(ngModel)]="row.listeValue[j]" class="input-table-nog">
                                    <span *ngIf="!row.isEditing">{{ mathCeil(value) }}</span>
                                  </td>
                                </ng-container>
                                 <td>
                                  <div class="action-tableau">
                                    <i *ngIf="!row.isEditing" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditPlanning(i)"></i>
                                    <i *ngIf="row.isEditing" class="fa-solid fa-check action-validate" (click)="toggleEditPlanning(i)"></i>
                                    <i class="fa-solid fa-trash action-delete" (click)="deletePlanning(i)"></i>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row-part-nog">
              <div id="container-part-2-5-nog" class="containter-element-nog">
                <div class="title-element-nog">2.5. Equipe d'intervention</div>
                <div class="body-element-nog">
                  <table class="table-nog">
                    <thead>
                      <tr>
                        <th>Fonction</th>
                        <th>Nom</th>
                        <th>Actif</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Responsable mission</td>
                        <td>
                          <input *ngIf="nogPartie2.equipeInter[0].isEditingRespMission" type="text" [(ngModel)]="nogPartie2.equipeInter[0].respMission" class="input-table-nog">
                          <span *ngIf="!nogPartie2.equipeInter[0].isEditingRespMission">{{ nogPartie2.equipeInter[0].respMission }}</span>
                        </td>
                        <td>
                          <input *ngIf="nogPartie2.equipeInter[0].isEditingRespMission" type="text" [(ngModel)]="nogPartie2.equipeInter[0].respMissionStatut" class="input-table-nog">
                          <span *ngIf="!nogPartie2.equipeInter[0].isEditingRespMission">{{ nogPartie2.equipeInter[0].respMissionStatut }}</span>
                        </td>
                        <td>
                          <div class="action-tableau">
                            <i *ngIf="!nogPartie2.equipeInter[0].isEditingRespMission" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditRespMission()"></i>
                            <i *ngIf="nogPartie2.equipeInter[0].isEditingRespMission" class="fa-solid fa-check action-validate" (click)="toggleEditRespMission()"></i>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>DMCM</td>
                        <td>
                          <input *ngIf="nogPartie2.equipeInter[0].isEditingDmcm" type="text" [(ngModel)]="nogPartie2.equipeInter[0].dmcm" class="input-table-nog">
                          <span *ngIf="!nogPartie2.equipeInter[0].isEditingDmcm">{{ nogPartie2.equipeInter[0].dmcm }}</span>
                        </td>
                        <td>
                          <input *ngIf="nogPartie2.equipeInter[0].isEditingDmcm" type="text" [(ngModel)]="nogPartie2.equipeInter[0].dmcmStatut" class="input-table-nog">
                          <span *ngIf="!nogPartie2.equipeInter[0].isEditingDmcm">{{ nogPartie2.equipeInter[0].dmcmStatut }}</span>
                        </td>
                        <td>
                          <div class="action-tableau">
                            <i *ngIf="!nogPartie2.equipeInter[0].isEditingDmcm" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditDmcm()"></i>
                            <i *ngIf="nogPartie2.equipeInter[0].isEditingDmcm" class="fa-solid fa-check action-validate" (click)="toggleEditDmcm()"></i>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>Factureur</td>
                        <td>
                          <input *ngIf="nogPartie2.equipeInter[0].isEditingFactureur" type="text" [(ngModel)]="nogPartie2.equipeInter[0].factureur" class="input-table-nog">
                          <span *ngIf="!nogPartie2.equipeInter[0].isEditingFactureur">{{ nogPartie2.equipeInter[0].factureur }}</span>
                        </td>
                        <td>
                          <input *ngIf="nogPartie2.equipeInter[0].isEditingFactureur" type="text" [(ngModel)]="nogPartie2.equipeInter[0].factureurStatut" class="input-table-nog">
                          <span *ngIf="!nogPartie2.equipeInter[0].isEditingFactureur">{{ nogPartie2.equipeInter[0].factureurStatut }}</span>
                        </td>
                        <td>
                          <div class="action-tableau">
                            <i *ngIf="!nogPartie2.equipeInter[0].isEditingFactureur" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditFactureur()"></i>
                            <i *ngIf="nogPartie2.equipeInter[0].isEditingFactureur" class="fa-solid fa-check action-validate" (click)="toggleEditFactureur()"></i>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div id="container-part-2-6-nog" class="containter-element-nog">
                <div class="title-element-nog">2.6. Précision sur les travaux à réaliser en interim</div>
                <div class="body-element-nog">
                  <div id="editeur-texte-precision-travaux">
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
                      #editorContentPrecisionTravaux
                      (input)="onEditorContentChangePrecisionTravaux($event)"
                      (keyup)="onEditorContentChangePrecisionTravaux($event)"
                      (paste)="onEditorContentChangePrecisionTravaux($event)"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="selectedPartNog=='3'" id="container-part-3-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='4'" id="container-part-4-nog" class="container-part-nog">
          
          </div>
          <div *ngIf="selectedPartNog=='5'" id="container-part-5-nog" class="container-part-nog">
            <div id="part-top-diligence">
              <div id="container-add-diligence">
                <div class="multiselect-diligence">
                  <div class="multiselect-label">Ajouter des diligences :</div>
                  <div class="multiselect-wrapper">
                    <div class="multiselect-dropdown" (click)="toggleDiligenceDropdown()">
                      <span *ngIf="selectedDiligences.length === 0" class="placeholder">Sélectionner des diligences...</span>
                      <span *ngIf="selectedDiligences.length > 0" class="selected-count">{{ selectedDiligences.length }} diligence(s) sélectionnée(s)</span>
                      <i class="fa-solid" [class.fa-chevron-down]="!showDiligenceDropdown" [class.fa-chevron-up]="showDiligenceDropdown"></i>
                    </div>
                    <div class="multiselect-options" *ngIf="showDiligenceDropdown">
                      <div class="multiselect-option" *ngFor="let diligence of tabDiligenceImport" (click)="toggleDiligenceSelection(diligence)">
                        <input type="checkbox" [checked]="isDiligenceSelected(diligence)" (click)="$event.stopPropagation()">
                        <label>{{ diligence.diligence }} - {{ diligence.titre }}</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="part-bottom-diligence">
              <div id="container-liste-diligence">
                <ng-container *ngFor="let diligence of nogPartie5.diligence">
                  <div class="container-diligence">
                    <div class="row-title-diligence" style="cursor: pointer;">
                      <div class="title-diligence">{{ diligence.groupe }} - {{ diligence.libelleGroupe }}</div>
                      <div class="icon-collapse-diligence"><i class="fa-solid fa-chevron-down"></i></div>
                    </div>
                    <div class="row-table-diligence">
                      <table class="table-diligence">
                        <thead>
                          <tr>
                            <th>Diligence</th>
                            <th>Titre</th>
                            <th>Activation</th>
                            <th>Objectif</th>
                            <th>Contrôle</th>
                          </tr>
                        </thead>
                        <tbody>

                          <ng-container *ngFor="let rowDiligence of diligence.tabDiligence">
                            <tr>
                              <td>{{ rowDiligence.diligence }}</td>
                              <td>{{ rowDiligence.titre }}</td>
                              <td>
                                <label class="toggle-switch">
                                  <input
                                    type="checkbox"
                                    [(ngModel)]="rowDiligence.activation"
                                    class="toggle-checkbox">
                                  <span class="toggle-slider"></span>
                                </label>
                              </td>
                              <td>{{ rowDiligence.objectif }}</td>
                              <td>{{ rowDiligence.controle }}</td>
                            </tr>
                          </ng-container>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ng-container>
              </div>
            </div>
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

    <!-- Pop-up d'aperçu PDF -->
    <div *ngIf="showApercuPopup" class="apercu-overlay" (click)="closeApercuPopup()">
      <div class="apercu-popup" (click)="$event.stopPropagation()">
        <div class="apercu-header">
          <h3>Aperçu du document NOG</h3>
          <button class="download-pdf" (click)="exportToPdf()">
            <i class="fa-solid fa-file-arrow-down"></i> Télecharger PDF
          </button>
          <button class="apercu-close" (click)="closeApercuPopup()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="apercu-pdf-nog" class="apercu-content">
          <div data-module-type="title" class="titre-nog-apercu"><h3>1. Présentation de la société</h3></div>
          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>1.1. Coordonnées</h4></div>
          <div data-module-type="table" class="contenu-nog-apercu">


            <table class="table-nog preview-table">
              <tbody>
                <tr>
                  <td>Nom</td>
                  <td>{{ nogPartie1.coordonnees.DOS_NOM }}</td>
                </tr>
                <tr>
                  <td>Adresse</td>
                  <td>{{ nogPartie1.coordonnees.DOS_ADRESSE }} {{ nogPartie1.coordonnees.DOS_CP }} {{ nogPartie1.coordonnees.DOS_VILLE }}</td>
                </tr>
                <tr>
                  <td>Siret</td>
                  <td>{{ nogPartie1.coordonnees.DOS_SIRET }}</td>
                </tr>
                <tr>
                  <td>APE</td>
                  <td>{{ nogPartie1.coordonnees.NAF_LIBELLE }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>1.2. Contacts</h4></div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th>Prénom</th>
                  <th>Nom</th>
                  <th>Fonction</th>
                  <th>Télephone</th>
                  <th>Adresse mail</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let contact of nogPartie1.contacts; let i = index">
                  <tr>
                    <td>{{ contact.prenom }}</td>
                    <td>{{ contact.nom }}</td>
                    <td>{{ contact.libelle }}</td>
                    <td>{{ contact.telephone }}</td>
                    <td>{{ contact.mail }}</td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>1.3. Associés</h4></div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th>Nom de l'associé</th>
                  <th>Nombre de titres détenus</th>
                  <th>Montant du capital détenu</th>
                  <th>% de détention</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let associe of nogPartie1.associes; let i = index">
                  <tr>
                    <td>{{ associe.nom }}</td>
                    <td>{{ formatNumber(associe.nbPart) }}</td>
                    <td>{{ formatNumber(associe.partCapital) }}</td>
                    <td>{{ formatNumber(associe.pourcPart) }}</td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>1.4. Chiffres significatifs</h4></div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th></th>
                  <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                    <th>{{ formatDate(cs.datePeriode) }} ({{ cs.dureeExercice }} mois)</th>
                  </ng-container>
                  <th>Variation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Effectif</td>
                  <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                    <td>{{ cs.effectif }}</td>
                  </ng-container>
                  <td>{{ calculateVariation('effectif') }}</td>
                </tr>
                <tr>
                  <td>Capitaux propres</td>
                  <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                    <td>{{ cs.capitauxPropres }}</td>
                  </ng-container>
                  <td>{{ calculateVariation('capitauxPropres') }}</td>
                </tr>
                <tr>
                  <td>Total bilan</td>
                  <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                    <td>{{ cs.bilanNet }}</td>
                  </ng-container>
                  <td>{{ calculateVariation('bilanNet') }}</td>
                </tr>
                <tr>
                  <td>Chiffres d'affaires</td>
                  <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                    <td>{{ cs.ca }}</td>
                  </ng-container>
                  <td>{{ calculateVariation('ca') }}</td>
                </tr>
                <tr>
                  <td>Résultat net (ou avant impôt)</td>
                  <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                    <td>{{ cs.beneficePerte }}</td>
                  </ng-container>
                  <td>{{ calculateVariation('beneficePerte') }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>1.5. Activité exercée et historique</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu"><p>{{ nogPartie1.activiteExHisto }}</p></div>

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
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    div#btn-apercu-pdf {
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

    /* Styles pour le pop-up d'aperçu */
    .apercu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      opacity: 0;
      animation: fadeInOverlay 0.3s ease forwards;
    }

    @keyframes fadeInOverlay {
      to { opacity: 1; }
    }

    .apercu-popup {
      position: fixed;
      top: 8vh;
      right: 0;
      height: 92vh;
      width: 60vw;
      background: white;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
      z-index: 2001;
      transform: translateX(100%);
      animation: slideInFromRight 0.3s ease forwards;
      display: flex;
      flex-direction: column;
    }

    @keyframes slideInFromRight {
      to { transform: translateX(0); }
    }

    .apercu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5vh 1vw;
      border-bottom: 1px solid var(--gray-200);
      background: var(--primary-color);
      color: white;
    }

    .apercu-header h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
    
    .export-pdf-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: var(--font-size-md);
    }
    
    .export-pdf-btn:hover:not(:disabled) {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    .export-pdf-btn:disabled {
      background: var(--gray-400);
      cursor: not-allowed;
      transform: none;
    }

    .apercu-close {
      background: none;
      border: none;
      color: white;
      font-size: var(--font-size-lg);
      cursor: pointer;
      padding: 0.5vh 0.5vw;
      border-radius: 0.5vw;
      transition: background-color 0.2s;
    }

    .apercu-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .apercu-content {
      flex: 1;
      padding: 3vh 4vw;
      overflow-y: auto;
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
      height: 4vh;
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
      width: 7vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(2),
    div#container-part-1-2-nog .table-nog td:nth-child(2){
      width: 7vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(3),
    div#container-part-1-2-nog .table-nog td:nth-child(3){
      width: 8vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(4),
    div#container-part-1-2-nog .table-nog td:nth-child(4){
      width: 8vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(5),
    div#container-part-1-2-nog .table-nog td:nth-child(5){
      width: 12vw;
      white-space: nowrap;
    }

    div#container-part-1-2-nog .table-nog th:nth-child(6),
    div#container-part-1-2-nog .table-nog td:nth-child(6){
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

    .titre-nog-apercu {
      font-size: 16px;
      color: var(--primary-color);
      font-weight: 600;
      margin-bottom: 10px;
    }

    .sous-titre-nog-apercu {
        font-size: 14px;
        color: var(--primary-color);
        margin-left: 15px;
        margin-bottom: 10px;
    }

    .contenu-nog-apercu {
        font-size: 14px !important;
        margin-bottom: 20px;
    }

    .contenu-nog-apercu .colonne-chiffres-sign-nog div {
      width: 11vw !important;
    }

    .download-pdf {
      background: var(--primary-light);
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
      margin-left: auto;
      margin-right: 5vw;
    }

    div#container-part-2-1-nog .body-element-nog {
      display: flex;
      width: 100%;
      justify-content: space-between;
    }

    div#container-part-2-1-nog {
      width: 100%;
    }

    .container-input-title-nog {
      width: 32vw;
    }

    .input-bloc-nog {
      width: 100%;
    }

    .input-bloc-nog input {
      width: 65%;
    }

    input.input-date-nog {
      padding: 0.6vh 0.3vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      font-size: var(--font-size-md);
    }

    input.input-number-nog {
      padding: 0.6vh 0.3vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      font-size: var(--font-size-md);
      text-align: right;
    }

    div#container-part-2-1-nog .body-element-nog {
      padding: 2vh 1vw;
    }

    div#container-part-2-nog .row-part-nog {
      height: fit-content;
    }

    div#container-part-2-4-nog {
      height: 47vh;
      width: 100%;
    }

    input.input-text-nog {
      padding: 0.6vh 0.3vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      font-size: var(--font-size-md);
    }

    div#container-part-2-4-nog .body-element-nog {
      padding: 2vh 1vw;
      display: flex;
      gap: 2vh;
      flex-direction: column;
    }

    div#part-left-planning-inter-nog,
    div#part-right-planning-inter-nog {
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      height: 100%;
      width: 32vw;
    }

    .title-bloc-nog {
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    div#part-top-planning-inter-nog {
      display: flex;
      height: 12vh;
      justify-content: space-between;
    }

    div#part-bottom-planning-inter-nog .container-input-title-nog {
      width: 100%;
    }

    div#part-bottom-planning-inter-nog .container-input-title-nog .input-bloc-nog {
      height: 22vh;
      overflow: auto;
    }

    table.table-nog thead {
      position: sticky;
      top: 0;
    }

    div#part-bottom-planning-inter-nog .table-nog th:nth-child(1),
    div#part-bottom-planning-inter-nog .table-nog td:nth-child(1) {
      width: 9vw;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    div#part-bottom-planning-inter-nog .table-nog th:nth-child(2),
    div#part-bottom-planning-inter-nog .table-nog td:nth-child(2) {
      width: 13vw;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    div#container-part-2-5-nog {
      width: 30vw;
    }

    div#container-part-2-6-nog {
        width: 46vw;
    }

    div#container-part-2-5-nog .body-element-nog {
        height: 20vh;
        padding: 1vh 1vw;
    }

    div#container-part-2-6-nog .body-element-nog {
        height: 20vh;
    }

    div#editeur-texte-precision-travaux {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    div#container-part-2-2-nog .body-element-nog,
    div#container-part-2-3-nog .body-element-nog{
      padding: 2vh 1vw;
      font-size: var(--font-size-md);
    }

    .select-type-mission,
    .select-nature-mission{
      width: 100%;
      padding: 0.5vh 0.5vw;
      font-size: var(--font-size-md);
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
    }

    .select-interim {
      width: 65%;
      padding: 0.5vh 0.5vw;
      font-size: var(--font-size-md);
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
    }

    .select-type-mission:focus,
    .select-nature-mission:focus,
    .select-interim:focus {
      outline: none;
      border-color: #007bff;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }

    .toggle-switch .toggle-checkbox {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.4s;
      border-radius: 24px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }

    .toggle-checkbox:checked + .toggle-slider {
      background-color: #4CAF50;
    }

    .toggle-checkbox:checked + .toggle-slider:before {
      transform: translateX(26px);
    }

    .toggle-checkbox:focus + .toggle-slider {
      box-shadow: 0 0 1px #4CAF50;
    }

    .multiselect-diligence {
      padding: 2vh 2vw;
    }

    .multiselect-label {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin-bottom: 1vh;
    }

    .multiselect-wrapper {
      position: relative;
      width: 100%;
    }

    .multiselect-dropdown {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1vh 1vw;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      font-size: var(--font-size-md);
    }

    .multiselect-dropdown:hover {
      border-color: #007bff;
    }

    .multiselect-dropdown .placeholder {
      color: #999;
    }

    .multiselect-dropdown .selected-count {
      color: #333;
    }

    .multiselect-options {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 300px;
      overflow-y: auto;
      background-color: white;
      border: 1px solid #ccc;
      border-top: none;
      border-radius: 0 0 4px 4px;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .multiselect-option {
      display: flex;
      align-items: center;
      padding: 1vh 1vw;
      cursor: pointer;
      font-size: var(--font-size-md);
    }

    .multiselect-option:hover {
      background-color: #f0f0f0;
    }

    .multiselect-option input[type="checkbox"] {
      margin-right: 0.5vw;
      cursor: pointer;
    }

    .multiselect-option label {
      cursor: pointer;
      user-select: none;
    }

    div#container-part-2-2-nog,
    div#container-part-2-3-nog {
      width: 34vw;
    }

    .row-title-diligence {
      display: flex;
      width: 100%;
      justify-content: space-between;
      padding: 1vh 1vw;
    }

    .row-table-diligence {
      width: 100%;
      padding: 1vh 1vw;
      display: none;
    }

    table.table-diligence {
      width: 100%;
    }

    div#part-bottom-diligence {
      padding: 2vh 2vw;
    }

    table.table-diligence th, table.table-diligence td {
      padding: 0.4vh 0.2vw;
      font-size: var(--font-size-md);
      text-align: left;
    }

    table.table-diligence th {
      font-weight: normal;
      color: white;
      background-color: var(--primary-light);
    }

    table.table-diligence tbody tr:nth-child(even) {
      background-color: var(--gray-100);
    }

    div#container-liste-diligence {
      display: flex;
      flex-direction: column;
      gap: 1vh;
    }

    .container-diligence {
      background-color: white;
      border-radius: 0.5vw;
    }

    table.table-diligence th:nth-child(1),
    table.table-diligence td:nth-child(1) {
      width: 3.5vw;
    }

    table.table-diligence th:nth-child(2),
    table.table-diligence td:nth-child(2) {
      width: 10vw;
    }

    table.table-diligence th:nth-child(3),
    table.table-diligence td:nth-child(3) {
      width: 4vw;
      text-align: center;
    }

    table.table-diligence th:nth-child(4),
    table.table-diligence td:nth-child(4) {
      width: 27vw;
    }

    table.table-diligence th:nth-child(5),
    table.table-diligence td:nth-child(5) {
      width: 27vw;
    }

    .row-table-diligence {
      border-top: 0.1vh solid var(--gray-200);
    }

    .title-diligence {
      font-size: var(--font-size-lg);
    }

    .icon-collapse-diligence i {
      font-size: 0.8vw;
    }

    table.table-nog input {
      width: 100% !important;
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
  isEquipeInterLoaded = false;
  isPlanningsLoaded = false;
  isTypeMissionNaureLoaded = false;

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
  objTypeNatureMission: any[] = [];
  
  // Variables pour les sélections
  selectedDossier: Dossier | null = null;
  selectedDossierDisplay: string = '';
  selectedMission: string = '';
  selectedMillesime: string = '';

  selectedPartNog: string = '1';
  showApercuPopup: boolean = false;
  
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

  nogPartie2: NogPartie2 = {
    dateMiseAJour: '',
    montantHonoraire: 0,
    typeMission: '',
    natureMission: '',
    consultationPro: '',
    interim: '',
    final: '',
    delaiRespecter: '',
    planning: [],
    equipeInter: [],
    precisionTravaux: ''
  };

  nogPartie5: NogPartie5 = {
    diligence: [
      {
        groupe: 'A',
        libelleGroupe: 'Préparation et finalisation de la mission',
        tabDiligence: [
          {
            diligence: 'A001-O',
            titre: 'Notes d\'entretien et faits marquants',
            activation: true,
            objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
            controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
          },
          {
            diligence: 'A001-O',
            titre: 'Notes d\'entretien et faits marquants',
            activation: true,
            objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
            controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
          }
        ]
      },
      {
        groupe: 'B',
        libelleGroupe: 'Trésorerie / Financement',
        tabDiligence: [
          {
            diligence: 'B001-O',
            titre: 'Notes d\'entretien et faits marquants',
            activation: true,
            objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
            controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
          },
          {
            diligence: 'B001-O',
            titre: 'Notes d\'entretien et faits marquants',
            activation: true,
            objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
            controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
          }
        ]
      },
      {
        groupe: 'C',
        libelleGroupe: 'Fournisseurs - Achats et charges externes',
        tabDiligence: [
          {
            diligence: 'C001-O',
            titre: 'Notes d\'entretien et faits marquants',
            activation: true,
            objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
            controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
          },
          {
            diligence: 'C001-O',
            titre: 'Notes d\'entretien et faits marquants',
            activation: true,
            objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
            controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
          }
        ]
      }
    ]
  }

  selectedDiligences: TabDiligence[] = [];
  showDiligenceDropdown = false;

  tabDiligenceImport: TabDiligence[] = [
      {
        diligence: 'A021-O',
        titre: 'Planification de la mission',
        activation: true,
        objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
        controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
      },
      {
        diligence: 'B002-O',
        titre: 'Personnes détenant la signature',
        activation: true,
        objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
        controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
      },
      {
        diligence: 'B003-O',
        titre: 'Etats de rapprochement bancaires',
        activation: true,
        objectif: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions',
        controle: 'Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions. Tableau : Date, Interlocuteur, Synthèse de l\'entretien, Suites données, décisions'
      }
    ];

  private searchSubject = new Subject<string>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private pdfService: PdfService
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
    this.loadTypeMissionNaureNog();
    this.loadPlannings();
    this.loadEquipeInter();
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

  loadTypeMissionNaureNog(): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getTypeMissionNaureNog`)
    .subscribe(response => {
      for (let mission of response.data) {
        if (mission.CodeMission == this.selectedMission) {
          this.nogPartie2.typeMission = mission.TypeMission;
          this.nogPartie2.natureMission = mission.NatureMission;
        }
      }

      this.objTypeNatureMission = response.data;
      this.isTypeMissionNaureLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('response.data',response.data);
    });
  }

  loadPlannings(): void {
    this.http.get<Planning[]>(`${environment.apiUrlMyVision}/dossierDetail/getPlanningNogMyJourney/${this.selectedDossier?.DOS_PGI}&${this.selectedMission}&${this.selectedMillesime}`)
    .subscribe(response => {
      this.nogPartie2.planning = this.transformDataEquipeInter(response);
      this.isPlanningsLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 2',this.nogPartie2);
    });
  }

  loadEquipeInter(): void {
    this.http.get<EquipeInter>(`${environment.apiUrlMyVision}/dossierDetail/getEquipeInterNogMyJourney/${this.selectedDossier?.DOS_PGI}&${this.selectedMission}&${this.selectedMillesime}`)
    .subscribe(response => {
      let obj = Object(response);
      obj.isEditingRespMission = false;
      obj.isEditingDmcm = false;
      obj.isEditingFactureur = false;

      let tab : EquipeInter[] = [];
      tab.push(obj); 
      this.nogPartie2.equipeInter = tab;
      this.isEquipeInterLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 2',this.nogPartie2);
    });
  }

  checkIdAllDataLoaded(): void {
    if(this.isCoordonneesLoaded && this.isContactsLoaded && this.isChiffresSignificatifsLoaded && this.isAssociesLoaded && this.isEquipeInterLoaded && this.isPlanningsLoaded && this.isTypeMissionNaureLoaded) {
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

  toggleEditRespMission(): void {
    this.nogPartie2.equipeInter[0].isEditingRespMission = !this.nogPartie2.equipeInter[0].isEditingRespMission;
  }

  toggleEditDmcm(): void {
    this.nogPartie2.equipeInter[0].isEditingDmcm = !this.nogPartie2.equipeInter[0].isEditingDmcm;
  }

  toggleEditFactureur(): void {
    this.nogPartie2.equipeInter[0].isEditingFactureur = !this.nogPartie2.equipeInter[0].isEditingFactureur;
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
      partCapital: 0,
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

    const difference = val0 - val1;
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
    const newContent = target.textContent || '';
    
    this.nogPartie1.activiteExHisto = newContent;
  }

  onEditorContentChangePrecisionTravaux(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.textContent || '';
    
    this.nogPartie2.precisionTravaux = newContent;
  }

  ngAfterViewInit(): void {
    // Initialiser le contenu de l'éditeur après le rendu
    const editorElement = document.querySelector('.editor-content') as HTMLElement;
    if (editorElement && this.nogPartie1.activiteExHisto) {
      editorElement.textContent = this.nogPartie1.activiteExHisto;
    }

    setTimeout(() => {
      this.initializeDiligenceCollapse();
    }, 0);
  }

  initializeDiligenceCollapse(): void {
    const container = document.querySelector('#container-part-5-nog');
    if (!container) return;

    const rowTables = container.querySelectorAll('.row-table-diligence');
    rowTables.forEach(rowTable => {
      (rowTable as HTMLElement).style.display = 'none';
    });

    const rowTitles = container.querySelectorAll('.row-title-diligence');
    rowTitles.forEach(rowTitle => {
      rowTitle.addEventListener('click', this.toggleDiligence.bind(this));
    });
  }

  toggleDiligence(event: Event): void {
    const rowTitle = event.currentTarget as HTMLElement;
    const container = rowTitle.closest('.container-diligence');
    if (!container) return;

    const rowTable = container.querySelector('.row-table-diligence') as HTMLElement;
    const icon = rowTitle.querySelector('.icon-collapse-diligence i');

    if (!rowTable) return;

    if (rowTable.style.display === 'none') {
      rowTable.style.display = 'block';
      if (icon) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
      }
    } else {
      rowTable.style.display = 'none';
      if (icon) {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
      }
    }
  }

  getDistinctTypeMissions(): string[] {
    const types = this.objTypeNatureMission.map(item => item.TypeMission);
    return [...new Set(types)].filter(type => type);
  }

  getNatureMissionsByType(): string[] {
    if (!this.nogPartie2.typeMission) {
      return [];
    }
    return this.objTypeNatureMission
      .filter(item => item.TypeMission === this.nogPartie2.typeMission)
      .map(item => item.NatureMission)
      .filter(nature => nature);
  }

  onTypeMissionChange(): void {
    this.nogPartie2.natureMission = '';
  }

  toggleDiligenceDropdown(): void {
    this.showDiligenceDropdown = !this.showDiligenceDropdown;
  }

  isDiligenceSelected(diligence: TabDiligence): boolean {
    return this.selectedDiligences.some(d => d.diligence === diligence.diligence);
  }

  toggleDiligenceSelection(diligence: TabDiligence): void {
    const index = this.selectedDiligences.findIndex(d => d.diligence === diligence.diligence);

    if (index > -1) {
      this.selectedDiligences.splice(index, 1);
      this.removeDiligenceFromNog(diligence);
    } else {
      this.selectedDiligences.push(diligence);
      this.addDiligenceToNog(diligence);
    }
  }

  addDiligenceToNog(diligence: TabDiligence): void {
    const groupe = diligence.diligence.charAt(0);
    let groupeObj = this.nogPartie5.diligence.find(d => d.groupe === groupe);

    if (!groupeObj) {
      groupeObj = {
        groupe: groupe,
        libelleGroupe: `Groupe ${groupe}`,
        tabDiligence: []
      };
      this.nogPartie5.diligence.push(groupeObj);
    }

    if (!groupeObj.tabDiligence.some(d => d.diligence === diligence.diligence)) {
      groupeObj.tabDiligence.push({ ...diligence });
    }
  }

  removeDiligenceFromNog(diligence: TabDiligence): void {
    const groupe = diligence.diligence.charAt(0);
    const groupeObj = this.nogPartie5.diligence.find(d => d.groupe === groupe);

    if (groupeObj) {
      const index = groupeObj.tabDiligence.findIndex(d => d.diligence === diligence.diligence);
      if (index > -1) {
        groupeObj.tabDiligence.splice(index, 1);
      }

      if (groupeObj.tabDiligence.length === 0) {
        const groupeIndex = this.nogPartie5.diligence.findIndex(d => d.groupe === groupe);
        if (groupeIndex > -1) {
          this.nogPartie5.diligence.splice(groupeIndex, 1);
        }
      }
    }
  }

  toggleEditPlanning(index: number): void {
    this.nogPartie2.planning[index].isEditing = !this.nogPartie2.planning[index].isEditing;
  }

  deletePlanning(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne de planning ?')) {
      this.nogPartie2.planning.splice(index, 1);
    }
  }

  trackByIndex(index: number, item: Planning): number {
    return item.id !== undefined ? item.id : index;
  }

  trackByValueIndex(index: number): number {
    return index;
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

    if (value === '5') {
      setTimeout(() => {
        this.initializeDiligenceCollapse();
      }, 0);
    }
  }

  openApercuPopup(): void {
    this.showApercuPopup = true;
  }

  closeApercuPopup(): void {
    this.showApercuPopup = false;
  }

  async exportToPdf(): Promise<void> {   
    try {
      const filename = `nog-document-${new Date().toISOString().split('T')[0]}.pdf`;
      await this.pdfService.exportToPdf('apercu-pdf-nog', filename);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF');
    }
  }

  transformDataEquipeInter(obj: any[]): Planning[] {
    return obj.map((item, index) => {
        const listeLib = Object.keys(item).filter(key => key !== 'nom' && key !== 'fonction');
        const listeValue = listeLib.map(lib => item[lib]);
        return {
            id: Date.now() + index,
            nom: item.nom,
            fonction: item.fonction,
            listeLib,
            listeValue,
            isEditing: false
        };
    });
  }

  replaceNameLibelleListeLib(value: string): string {
    let str = '';
    let mois =value.split('-')[0];
    let annee = value.split('-')[1];
    if(parseInt(mois) < 10) {
      mois = '0' + mois;
    }
    return mois+'/'+annee.substring(2,4);
  }

  mathCeil(value: any): number {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : Math.ceil(num);
  }
}