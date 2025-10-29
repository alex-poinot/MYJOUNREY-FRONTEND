import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PdfService } from '../../services/pdf.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { environment } from '../../environments/environment';
import { debounceTime, distinctUntilChanged, switchMap, of, Subject } from 'rxjs';
import iziToast from 'izitoast';

interface Dossier {
  DOS_PGI: string;
  DOS_NOM: string;
  MD_MISSION: string;
  MD_MILLESIME: string;
  LIBELLE_MISSIONS: string;
  CODE_AFFAIRE: string;
  PROFIL: string;
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
  dateLastUpdateCoordonnees?: string;
  dateLastUpdateContacts?: string;
  dateLastUpdateAssocies?: string;
  dateLastUpdateCS?: string;
  dateLastUpdateActiviteExHisto?: string;
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
  dateLastUpdateLettreMission?: string;
  dateLastUpdateTypeMission?: string;
  dateLastUpdateNatureMission?: string;
  dateLastUpdatePlanning?: string;
  dateLastUpdateEquipeInter?: string;
  dateLastUpdatePrecisionTravaux?: string;
}

interface NogPartie3 {
  tabLogicielGT: Logiciel[];
  tabLogicielClient: Logiciel[];
  orgaServiceAdmin: string;
  syntheseEntretienDir: string;
  eInvoicing: string;
  eReportingPaiement: string;
  eReportingTransaction: string;
  businessDev: string[];
  mailEnvoi: string;
  signatureMandat: string;
  commentaireFE: string;
  casGestion: string;
  isFEValidate: boolean;
  dateLastUpdateLogiciel?: string;
  dateLastUpdateOrgaServiceAdmin?: string;
  dateLastUpdateFE?: string;
  dateLastUpdateSyntheseEntretien?: string;
}

interface NogPartie4 {
  checkboxVigilance: string;
  appreciationRisqueVigilence: string;
  aspectsComptables: string;
  aspectsFiscaux: string;
  aspectsSociaux: string;
  aspectsJuridiques: string;
  comptesAnnuels: string;
  seuil: number;
  dateLastUpdateVigilance?: string;
  dateLastUpdatePrincipeComp?: string;
  dateLastUpdateSeuil?: string;
}

interface NogPartie5 {
  diligence: Diligence[];
  diligenceAdd: TabDiligence[];
  diligenceLab: TabDiligence[];
  dateLastUpdateDiligence?: string;
  dateLastUpdateDiligenceLab?: string;
}

interface NogPartie6 {
  checkboxEtage1: string;
  checkboxEtage2: string;
  libelleAutreEtage1?: string;
  libelleAutreEtage2?: string;
  commGeneral: string;
  dateLastUpdateRestitutionClient?: string;
}

interface NogPartie7 {
  checkboxFormInit: boolean;
  libelleFormInit: string;
  checkboxFormAnn: boolean;
  libelleFormAnn: string;
  checkboxConflictCheck: boolean;
  libelleConflictCheck: string;
  dateLastUpdateDeontologie?: string;
}

interface NogPartieAnnexes {
  tabFiles: File[];
  dateLastUpdateAnnexe?: string;
  validationCollab: boolean;
  validationAssocie: boolean;
}

interface Logiciel {
  type: string;
  logiciel: string;
  montant?: number;
  isEditing: boolean;
}

interface Planning {
  id?: number;
  nom: string;
  fonction: string;
  totalCollab: number,
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
  cycle: string;
  diligence: string;
  titre: string;
  activation: boolean;
  objectif: string;
}

@Component({
  selector: 'app-nog-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  template: `
    <div *ngIf="!isDossierMissionMillesimeSelected && isCollabHasMissions" id="container-select-dossier">
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

      <!-- Bouton de validation ou Input fichier -->
      <div class="form-group" *ngIf="selectedDossier && selectedMission && selectedMillesime">
        <!-- Bouton de validation si la mission commence par 21 ou 22 ET millésime >= année actuelle -->
        <button
          *ngIf="shouldShowValidateButton()"
          class="validate-btn"
          (click)="validateSelection()"
          [disabled]="!canValidate()">
          Valider la sélection
        </button>

        <!-- Input fichier pour les autres cas -->
        <div *ngIf="!shouldShowValidateButton()" class="file-upload-container">
          <label for="nog-file-upload" class="file-upload-label">
            <i class="fa-solid fa-file-arrow-up"></i>
            Importer un fichier NOG
          </label>
          <input
            type="file"
            id="nog-file-upload"
            (change)="onFileSelect($event)"
            accept=".pdf,.doc,.docx"
            class="file-upload-input">
          <div *ngIf="selectedFileNog" class="file-info">
            <div class="row-info-file">
              <span class="file-name">{{ selectedFileNog.name }}</span>
              <div class="file-actions">
                <button *ngIf="selectedFileNog.type === 'application/pdf'"
                        class="preview-file"
                        (click)="previewFile(selectedFileNog)">
                  <i class="fas fa-eye"></i>
                </button>

                <button class="download-file"
                        (click)="downloadFile(selectedFileNog)">
                  <i class="fas fa-download"></i>
                </button>

                <button *ngIf="isProfilAssocie"
                        class="remove-file"
                        (click)="removeFileNog(selectedFileNogId.toString())">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div class="container-date-modal">
              <div class="libelle-date-modal">Date de signature : </div>
              <input type="date" class="input-date-modal" 
                [(ngModel)]="selectedFileNogDate"
                (change)="changeDateFichier($event, selectedFileNogId.toString())"/>
            </div>
          </div>
          <div *ngIf="selectedFileNog == null"
            class="no-file-modal">
              Aucun fichier
          </div>
        </div>

        
      </div>

      <!-- Affichage de la sélection -->
      <div class="selection-summary" *ngIf="selectedDossier && selectedMission && selectedMillesime">
        <h3>Sélection actuelle :</h3>
        <p><strong>Dossier :</strong> {{ selectedDossier.DOS_PGI }} - {{ selectedDossier.DOS_NOM }}</p>
        <p><strong>Mission :</strong> {{ selectedMission }} - {{ getSelectedMissionLabel() }}</p>
        <p><strong>Millésime :</strong> {{ selectedMillesime }}</p>
      </div>
    </div>

    <div *ngIf="!isCollabHasMissions" id="container-no-mission">
      Vous n'avez accès à aucune mission.
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
          <div id="container-save-nog">
            <div class="date-last-save-nog" [style.display]="isSavingNog ? 'none' : 'block'">{{ dateLastUpdateNog }}</div>
            <div class="load-save-nog" [style.display]="isSavingNog ? 'block' : 'none'"><i class="fa-solid fa-spinner-scale fa-spin-pulse" aria-hidden="true"></i></div>
            <i class="fa-regular fa-floppy-disk" aria-hidden="true"></i>
          </div>
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
              <div class="text-element-menu-nog">Annexes et finalisation</div>
            </div>
          </div>
        </div>
        <div id="part-bottom-right-page-nog">
          <div *ngIf="this.nogPartieAnnexes.validationAssocie == true" id="read-only-nog">Ce formulaire à été validé par un associé, il est donc disponible en lecture seule.</div>
          <div *ngIf="selectedPartNog=='1'" id="container-part-1-nog" class="container-part-nog">
            <div class="row-part-nog">
              <div id="container-part-1-1-nog" class="containter-element-nog">
                <div class="title-element-nog">1.1. Coordonnées<i title="Dernière mise à jour : {{nogPartie1.dateLastUpdateCoordonnees}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="liste-btn-absolute">
                  <button class="btn-reload-data" [disabled]="isReloadingCoordonnees" (click)="reloadCoordonnee()"><i class="fa-solid fa-rotate-reverse"></i></button>
                </div>
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
                    <div class="text-coordonnees-nog"> {{ nogPartie1.coordonnees.DOS_ADRESSE }} </div>
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
                    <div class="text-coordonnees-nog">({{ nogPartie1.coordonnees.NAF_ID}}) {{ nogPartie1.coordonnees.NAF_LIBELLE }} </div>
                  </div>
                </div>
              </div>

              <div id="container-part-1-2-nog" class="containter-element-nog">
                <div class="title-element-nog">1.2. Contacts<i title="Dernière mise à jour : {{nogPartie1.dateLastUpdateContacts}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="liste-btn-absolute">
                  <button class="btn-reload-data" [disabled]="isReloadingContacts" (click)="reloadContact()"><i class="fa-solid fa-rotate-reverse"></i></button>
                  <button class="btn-add-row" (click)="addContact()"><i class="fa-solid fa-plus"></i> Ajouter un contact</button>
                </div>
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
                <div class="title-element-nog">1.3. Associés<i title="Dernière mise à jour : {{nogPartie1.dateLastUpdateAssocies}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="liste-btn-absolute">
                  <button class="btn-reload-data" [disabled]="isReloadingAssocies" (click)="reloadAssocie()"><i class="fa-solid fa-rotate-reverse"></i></button>
                  <button class="btn-add-row" (click)="addAssocie()"><i class="fa-solid fa-plus"></i> Ajouter un associé</button>
                </div>
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
                <div class="title-element-nog">1.4. Chiffres significatifs<i title="Dernière mise à jour : {{nogPartie1.dateLastUpdateCS}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="liste-btn-absolute">
                  <button class="btn-reload-data" [disabled]="isReloadingCS" (click)="reloadCS()"><i class="fa-solid fa-rotate-reverse"></i></button>
                </div>
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

                    <ng-container *ngIf="nogPartie1.chiffresSignificatifs.length != 0">
                      <ng-container *ngFor="let cs of nogPartie1.chiffresSignificatifs; let i = index">
                        <div class="colonne-chiffres-sign-nog">
                          <div class="titre-colonne-chiffres-sign-nog"><input type="text" [(ngModel)]="cs.datePeriode" (ngModelChange)="setChangeIntoCS()" class="input-date-cs"> (<input type="number" [(ngModel)]="cs.dureeExercice" (ngModelChange)="setChangeIntoCS()" class="input-nb-mois-cs input-chiffres-sign-nog"> mois) </div>
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
                <div class="title-element-nog">1.5. Activité exercée et historique<i title="Dernière mise à jour : {{nogPartie1.dateLastUpdateActiviteExHisto}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div class="legende-partie-nog">Présenter l’activité et les éléments importants de l’historique de la société</div>
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
                      id="editorContent"
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
                <div class="title-element-nog">2.1. Lettre de mission<i title="Dernière mise à jour : {{nogPartie2.dateLastUpdateLettreMission}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div class="container-input-title-nog">
                    <div class="title-bloc-nog">Date de mise à jour</div> 
                    <div class="input-bloc-nog">
                      <input type="date" [(ngModel)]="nogPartie2.dateMiseAJour" (ngModelChange)="setChangeIntoLettreMission()" class="input-date-nog">
                    </div>
                  </div>
                  <div class="container-input-title-nog">
                    <div class="title-bloc-nog">Montant des honoraires pour la mission</div> 
                    <div class="input-bloc-nog">
                      <input type="number" [(ngModel)]="nogPartie2.montantHonoraire" (ngModelChange)="setChangeIntoLettreMission()" class="input-number-nog">
                    </div> 
                  </div>
                </div>
              </div>
            </div>

            <div class="row-part-nog">
              <div id="container-part-2-2-nog" class="containter-element-nog">
                <div class="title-element-nog">2.2. Type de la mission<i title="Dernière mise à jour : {{nogPartie2.dateLastUpdateTypeMission}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
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
                <div class="title-element-nog">2.3. Nature de la mission<i title="Dernière mise à jour : {{nogPartie2.dateLastUpdateNatureMission}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div class="container-input-title-nog">
                    <div class="input-bloc-nog">
                      <select [(ngModel)]="nogPartie2.natureMission" (ngModelChange)="setChangeIntoNatureMission()" class="select-nature-mission">
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
                <div class="title-element-nog">2.4. Planning d'intervention<i title="Dernière mise à jour : {{nogPartie2.dateLastUpdatePlanning}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div id="part-top-planning-inter-nog">
                    <div id="part-left-planning-inter-nog">
                      <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Consultations d'autres professionnels à prévoir</div> 
                        <div class="input-bloc-nog">
                          <input type="text" [(ngModel)]="nogPartie2.consultationPro" (ngModelChange)="setChangeIntoPlanning()" class="input-text-nog">
                        </div> 
                      </div>
                      <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Interim</div> 
                        <div class="input-bloc-nog">
                          <select [(ngModel)]="nogPartie2.interim" (ngModelChange)="setChangeIntoPlanning()" class="select-interim">
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
                          <input type="text" [(ngModel)]="nogPartie2.final" (ngModelChange)="setChangeIntoPlanning()" class="input-text-nog">
                        </div> 
                      </div>
                      <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Délai à respecter</div> 
                        <div class="input-bloc-nog">
                          <input type="text" [(ngModel)]="nogPartie2.delaiRespecter" (ngModelChange)="setChangeIntoPlanning()" class="input-text-nog">
                        </div> 
                      </div>
                    </div>
                  </div>
                  <div id="part-bottom-planning-inter-nog">
                    <div class="container-input-title-nog">
                        <div class="title-bloc-nog">Planning</div>
                        <div class="liste-btn-absolute"> 
                          <button class="btn-reload-data" [disabled]="isReloadingPlanning" (click)="reloadPlanning()"><i class="fa-solid fa-rotate-reverse"></i></button>
                          <button class="btn-add-row" (click)="addPlanning()"><i class="fa-solid fa-plus"></i> Ajouter un planning</button>
                        </div>
                        <div class="input-bloc-nog">
                          <table class="table-nog">
                            <thead>
                              <tr>
                                <th>Fonction</th>
                                <th>Nom</th>
                                <th>Total</th>
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
                                <td>
                                  <input *ngIf="row.isEditing" type="number" [(ngModel)]="row.totalCollab" class="input-table-nog">
                                  <span *ngIf="!row.isEditing">{{ mathCeil(row.totalCollab) }}</span>
                                </td>
                                <ng-container *ngFor="let value of row.listeValue; let j = index; trackBy: trackByValueIndex">
                                  <td>
                                    <input *ngIf="row.isEditing" type="number" [(ngModel)]="row.listeValue[j]" class="input-table-nog">
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
                <div class="title-element-nog">2.5. Equipe d'intervention<i title="Dernière mise à jour : {{nogPartie2.dateLastUpdateEquipeInter}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="liste-btn-absolute">
                  <button class="btn-reload-data" [disabled]="isReloadingEquipeInter" (click)="reloadEquipeInter()"><i class="fa-solid fa-rotate-reverse"></i></button>
                </div>
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
                <div class="title-element-nog">2.6. Précision sur les travaux à réaliser en interim<i title="Dernière mise à jour : {{nogPartie2.dateLastUpdatePrecisionTravaux}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
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
                      id="editorContentPrecisionTravaux"
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
            <div class="row-part-nog">
              <div id="container-part-3-1-nog" class="containter-element-nog">
                <div class="title-element-nog">3.1. Logiciels utilisés<i title="Dernière mise à jour : {{nogPartie3.dateLastUpdateLogiciel}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div id="container-tab-logiciel-gt">
                    <div class="titre-tab-logiciel">Outils environnement GT</div>
                    <div class="liste-btn-absolute">
                      <button class="btn-reload-data" [disabled]="isReloadingLogiciel" (click)="reloadLogiciel()"><i class="fa-solid fa-rotate-reverse"></i></button>
                      <button class="btn-add-row" (click)="addLogicielGT()"><i class="fa-solid fa-plus"></i> Ajouter un logiciel</button>
                    </div>
                    <div class="container-table-logiciel-nog">
                      <table class="table-nog">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Outil</th>
                            <th>Coût</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let row of nogPartie3.tabLogicielGT; let i = index;">
                            <td>
                              <input *ngIf="row.isEditing" type="text" [(ngModel)]="row.type" class="input-table-nog">
                              <span *ngIf="!row.isEditing">{{ row.type }}</span>
                            </td>
                            <td>
                              <input *ngIf="row.isEditing" type="text" [(ngModel)]="row.logiciel" class="input-table-nog">
                              <span *ngIf="!row.isEditing">{{ row.logiciel }}</span>
                            </td>
                            <td>
                              <input *ngIf="row.isEditing" type="number" [(ngModel)]="row.montant" class="input-table-nog">
                              <span *ngIf="!row.isEditing">{{ formatNumber(row.montant) }}</span>
                            </td>
                            <td>
                              <div class="action-tableau">
                                <i *ngIf="!row.isEditing" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditLogicielGT(i)"></i>
                                <i *ngIf="row.isEditing" class="fa-solid fa-check action-validate" (click)="toggleEditLogicielGT(i)"></i>
                                <i class="fa-solid fa-trash action-delete" (click)="deleteLogicielGT(i)"></i>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div id="container-tab-logiciel-client">
                    <div class="titre-tab-logiciel">Outils envrionnement client</div>
                    <div class="liste-btn-absolute">
                      <button class="btn-add-row" (click)="addLogicielClient()"><i class="fa-solid fa-plus"></i> Ajouter un logiciel</button>
                    </div>
                    <div class="container-table-logiciel-nog">
                      <table class="table-nog">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Outil</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let row of nogPartie3.tabLogicielClient; let i = index;">
                            <td>
                              <input *ngIf="row.isEditing" type="text" [(ngModel)]="row.type" class="input-table-nog">
                              <span *ngIf="!row.isEditing">{{ row.type }}</span>
                            </td>
                            <td>
                              <input *ngIf="row.isEditing" type="text" [(ngModel)]="row.logiciel" class="input-table-nog">
                              <span *ngIf="!row.isEditing">{{ row.logiciel }}</span>
                            </td>
                            <td>
                              <div class="action-tableau">
                                <i *ngIf="!row.isEditing" class="fa-solid fa-pen-to-square action-edit" (click)="toggleEditLogicielClient(i)"></i>
                                <i *ngIf="row.isEditing" class="fa-solid fa-check action-validate" (click)="toggleEditLogicielClient(i)"></i>
                                <i class="fa-solid fa-trash action-delete" (click)="deleteLogicielClient(i)"></i>
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
            <div class="row-part-nog">
              <div id="container-part-3-2-nog" class="containter-element-nog">
                <div class="title-element-nog">3.2. Organisation du service administratif<i title="Dernière mise à jour : {{nogPartie3.dateLastUpdateOrgaServiceAdmin}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div id="editeur-organisation-service-admin">
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
                      id="editorContentOrgaServiceAdmin"
                      #editorContentOrgaServiceAdmin
                      (input)="onEditorContentChangeOrgaServiceAdmin($event)"
                      (keyup)="onEditorContentChangeOrgaServiceAdmin($event)"
                      (paste)="onEditorContentChangeOrgaServiceAdmin($event)"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row-part-nog row-fe-nog">
              <div id="container-part-3-3-nog" class="containter-element-nog">
                <div class="title-element-nog">3.3. Facturation électronique<i title="Dernière mise à jour : {{nogPartie3.dateLastUpdateFE}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="liste-btn-absolute">
                  <button class="btn-reload-data" [disabled]="isReloadingFE" (click)="reloadFE()"><i class="fa-solid fa-rotate-reverse"></i></button>
                </div>
                <div *ngIf="this.nogPartie3.isFEValidate" class="body-element-nog">
                  <div class="container-fe-nog">
                    <div class="container-table-obligation-mail-fe-nog">
                      <div class="container-table-obligation-fe-nog">
                        <div class="titre-tab-fe">Obligation FE</div>
                        <table class="table-nog">
                          <thead>
                            <tr>
                              <th>E-Invoicing</th>
                              <th>E-Reporting transaction</th>
                              <th>E-Reporting paiement</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{{ this.nogPartie3.eInvoicing }}</td>
                              <td>{{ this.nogPartie3.eReportingTransaction }}</td>
                              <td>{{ this.nogPartie3.eReportingPaiement }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div class="container-mail-mandat-fe">
                        <div class="element-fe-title-value">
                          <div class="title-fe">Cas de gestion :</div>
                          <div class="value-fe">{{ this.nogPartie3.casGestion }}</div>
                        </div>
                        <div class="element-fe-title-value">
                          <div class="title-fe">Mail envoyé au client :</div>
                          <div class="value-fe">{{ this.nogPartie3.mailEnvoi }}</div>
                        </div>
                        <div class="element-fe-title-value">
                          <div class="title-fe">Mandat signé :</div>
                          <div class="value-fe">{{ this.nogPartie3.signatureMandat }}</div>
                        </div>
                      </div>
                    </div>
                    <div class="container-table-fe-nog">
                      <div class="titre-tab-fe">Commentaire FE</div>
                      <div id="editeur-commentaire-fe">
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
                          id="editorContentCommentaireFE"
                          #editorContentCommentaireFE
                          (input)="onEditorContentChangeCommentaireFE($event)"
                          (keyup)="onEditorContentChangeCommentaireFE($event)"
                          (paste)="onEditorContentChangeCommentaireFE($event)"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div *ngIf="!this.nogPartie3.isFEValidate" class="body-element-nog">
                  Merci de bien vouloir remplir la facturation électronique dans MyVision.
                </div>
              </div>
            </div>
            <div class="row-part-nog">
              <div id="container-part-3-4-nog" class="containter-element-nog">
                <div class="title-element-nog">3.4. Synthèse de l'entretien avec la direction (faits marquants)<i title="Dernière mise à jour : {{nogPartie3.dateLastUpdateSyntheseEntretien}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div id="editeur-synthese-entretient-dir">
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
                      id="editorContentSyntheseEntretienDir"
                      #editorContentSyntheseEntretienDir
                      (input)="onEditorContentChangeSyntheseEntretienDir($event)"
                      (keyup)="onEditorContentChangeSyntheseEntretienDir($event)"
                      (paste)="onEditorContentChangeSyntheseEntretienDir($event)"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="selectedPartNog=='4'" id="container-part-4-nog" class="container-part-nog">
            <div class="row-part-nog">
              <div id="container-part-4-1-nog" class="containter-element-nog">
                <div class="title-element-nog">4.1. Appréciation des risques et du niveau de vigilance à appliquer<i title="Dernière mise à jour : {{nogPartie4.dateLastUpdateVigilance}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div class="legende-partie-nog">En application de la norme anti-blanchiment, le niveau de vigilance retenu à la suite de l’acceptation de la mission (nouveau client) ou de la synthèse de l’exercice précédent. Si dans les évènements marquants de l’exercice il a été observé des opérations atypiques ou complexes ou si l’entreprise a réalisé des montages fiscaux, sociaux ou juridiques complexes, il conviendra de revoir le cas échéant le niveau de vigilance</div>
                  <div id="container-checkbox-vigilance">
                    <div class="container-element-appreciation-risque-vigilance">
                      <div class="container-checkbox-appreciation-risque-vigilance">
                        <input type="checkbox" class="checkbox-appreciation-risque-vigilance" [checked]="nogPartie4.checkboxVigilance == 'Normal'" (change)="updateCheckboxVigilance('Normal')"/>
                      </div>
                      <div class="libelle-appreciation-risque-vigilance">Vigilance normale</div>
                    </div>
                    <div class="container-element-appreciation-risque-vigilance">
                      <div class="container-checkbox-appreciation-risque-vigilance">
                        <input type="checkbox" class="checkbox-appreciation-risque-vigilance" [checked]="nogPartie4.checkboxVigilance == 'Renforcee'" (change)="updateCheckboxVigilance('Renforcee')"/>
                      </div>
                      <div class="libelle-appreciation-risque-vigilance">Vigilance renforcée</div>
                    </div>
                  </div>
                  <div id="container-text-appreciation-risque-vigilance">
                    <div *ngIf="nogPartie4.checkboxVigilance == 'Normal'" class="texte-appreciation-risque-vigilance">
                      <p>En cas de vigilance normale :</p>
                      <p>Les diligences accomplies dans le cadre des missions normées correspondent normalement à un niveau de vigilance standard, cependant, l’équipe affectée à la mission effectue un examen renforcé de toute opération particulièrement complexe ou d’un montant inhabituellement élevé ou ne paraissant pas avoir de justification économique ou d’objet licite.</p>
                      <p>Dans ce cas, elle se renseigne auprès du client sur :</p>
                      <ul>
                        <li>l’origine et la destination des fonds</li>
                        <li>ainsi que sur l’objet de l’opération et l’identité de la personne qui en bénéficie.</li>
                      </ul>
                    </div>
                    <div *ngIf="nogPartie4.checkboxVigilance == 'Renforcee'" class="texte-appreciation-risque-vigilance">
                      <p>En cas de vigilance renforcée, compléter les contrôles à effectuer en s’appuyant entre autres sur « l’ARPEC » </p>
                      <a href="https://grantthorntonfrance.sharepoint.com/sites/EC-ExpertiseConseil/Normes_pro_EC/Forms/AllItems.aspx?id=%2Fsites%2FEC%2DExpertiseConseil%2FNormes%5Fpro%5FEC%2FB1%20Proc%C3%A9dures%20Lutte%20anti%20Blanchiment%2FAnalyse%5Fdes%5Frisques%5Fde%5Fla%5Fprofession%5Fd%5Fexpert%2Dcomptable%5F%2D%5FARPEC%20%285%29%2Epdf&parent=%2Fsites%2FEC%2DExpertiseConseil%2FNormes%5Fpro%5FEC%2FB1%20Proc%C3%A9dures%20Lutte%20anti%20Blanchiment" target="blank_">Lien de la documentation ARPEC sur la DWP</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row-part-nog row-part-4-2">
              <div id="container-part-4-2-nog" class="containter-element-nog">
                <div class="title-element-nog">4.2. Principes comptables, régime fiscal ou social particuliers <i title="Dernière mise à jour : {{nogPartie4.dateLastUpdatePrincipeComp}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div class="container-principe-comp">
                    <div class="container-editeur-principe-comp">
                      <div class="row-title-principe-comp" style="cursor: pointer;">
                        <div class="title-principe-comp">Aspects comptables</div>
                        <div class="icon-collapse-principe-comp"><i class="fa-solid fa-chevron-down"></i></div>
                      </div>
                      <div class="container-content-principe-comp">
                        <div id="editeur-texte-aspects-comptables">
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
                            id="editorContentAspectsComptables"
                            #editorContentAspectsComptables
                            (input)="onEditorContentChangeAspectsComptables($event)"
                            (keyup)="onEditorContentChangeAspectsComptables($event)"
                            (paste)="onEditorContentChangeAspectsComptables($event)"></div>
                        </div>
                      </div>
                    </div>
                    <div class="container-editeur-principe-comp">
                      <div class="row-title-principe-comp" style="cursor: pointer;">
                        <div class="title-principe-comp">Aspects fiscaux</div>
                        <div class="icon-collapse-principe-comp"><i class="fa-solid fa-chevron-down"></i></div>
                      </div>
                      <div class="container-content-principe-comp">
                        <div id="editeur-texte-aspects-fiscaux">
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
                            id="editorContentAspectsFiscaux"
                            #editorContentAspectsFiscaux
                            (input)="onEditorContentChangeAspectsFiscaux($event)"
                            (keyup)="onEditorContentChangeAspectsFiscaux($event)"
                            (paste)="onEditorContentChangeAspectsFiscaux($event)"></div>
                        </div>
                      </div>
                    </div>
                    <div class="container-editeur-principe-comp">
                      <div class="row-title-principe-comp" style="cursor: pointer;">
                        <div class="title-principe-comp">Aspects sociaux</div>
                        <div class="icon-collapse-principe-comp"><i class="fa-solid fa-chevron-down"></i></div>
                      </div>
                      <div class="container-content-principe-comp">
                        <div id="editeur-texte-aspects-sociaux">
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
                            id="editorContentAspectsSociaux"
                            #editorContentAspectsSociaux
                            (input)="onEditorContentChangeAspectsSociaux($event)"
                            (keyup)="onEditorContentChangeAspectsSociaux($event)"
                            (paste)="onEditorContentChangeAspectsSociaux($event)"></div>
                        </div>
                      </div>
                    </div>
                    <div class="container-editeur-principe-comp">
                      <div class="row-title-principe-comp" style="cursor: pointer;">
                        <div class="title-principe-comp">Aspects juridiques</div>
                        <div class="icon-collapse-principe-comp"><i class="fa-solid fa-chevron-down"></i></div>
                      </div>
                      <div class="container-content-principe-comp">
                        <div id="editeur-texte-aspects-juridiques">
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
                            id="editorContentAspectsJuridiques"
                            #editorContentAspectsJuridiques
                            (input)="onEditorContentChangeAspectsJuridiques($event)"
                            (keyup)="onEditorContentChangeAspectsJuridiques($event)"
                            (paste)="onEditorContentChangeAspectsJuridiques($event)"></div>
                        </div>
                      </div>
                    </div>
                    <div class="container-editeur-principe-comp">
                      <div class="row-title-principe-comp" style="cursor: pointer;">
                        <div class="title-principe-comp">Comptes annuels</div>
                        <div class="icon-collapse-principe-comp"><i class="fa-solid fa-chevron-down"></i></div>
                      </div>
                      <div class="container-content-principe-comp">
                        <div id="editeur-texte-comptes-annuels">
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
                            id="editorContentComptesAnnuels"
                            #editorContentComptesAnnuels
                            (input)="onEditorContentChangeComptesAnnuels($event)"
                            (keyup)="onEditorContentChangeComptesAnnuels($event)"
                            (paste)="onEditorContentChangeComptesAnnuels($event)"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row-part-nog row-part-4-3">
              <div id="container-part-4-3-nog" class="containter-element-nog">
                <div class="title-element-nog">4.3. Seuil de signification<i title="Dernière mise à jour : {{nogPartie4.dateLastUpdateSeuil}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
                <div class="body-element-nog">
                  <div class="text-fixe-4-3">Selon la norme de présentation « l’expert-comptable prend en considération le caractère significatif, ce qui peut le conduire à simplifier certaines opérations d'inventaire »</div>
                  <div class="container-seuil-4-3">
                    <div class="title-seuil">Seuil de signification retenu pour les opérations d’inventaire</div>
                    <div class="container-input-seuil">
                      <input type="number" class="input-number" [(ngModel)]="nogPartie4.seuil" (ngModelChange)="setChangeIntoSeuil()"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="selectedPartNog=='5'" id="container-part-5-nog" class="container-part-nog">
            <div class="title-element-nog">Diligences<i title="Dernière mise à jour : {{nogPartie5.dateLastUpdateDiligence}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
            <div id="part-top-diligence">
              <div id="container-add-diligence">
                <div class="multiselect-diligence">
                  <div class="multiselect-label">Ajouter des diligences de la biliothèque :</div>
                  <div class="liste-btn-absolute">
                    <button class="btn-add-row" (click)="addDiligenceManuelle()"><i class="fa-solid fa-plus"></i> Créer une diligence</button>
                  </div>
                  <div class="multiselect-wrapper">
                    <div class="multiselect-dropdown" (click)="toggleDiligenceDropdown()">
                      <span *ngIf="selectedDiligences.length === 0" class="placeholder">Sélectionner des diligences complémentaires...</span>
                      <span *ngIf="selectedDiligences.length > 0" class="selected-count">{{ selectedDiligences.length }} diligence(s) sélectionnée(s)</span>
                      <i class="fa-solid" [class.fa-chevron-down]="!showDiligenceDropdown" [class.fa-chevron-up]="showDiligenceDropdown"></i>
                    </div>
                    <div class="multiselect-options" *ngIf="showDiligenceDropdown">
                      <div class="multiselect-option" *ngFor="let diligence of nogPartie5.diligenceAdd" (click)="toggleDiligenceSelection(diligence)">
                        <input type="checkbox" [checked]="isDiligenceSelected(diligence)" (click)="$event.stopPropagation()">
                        <label>({{ diligence.cycle }} - {{ getCycleNameDiligence(diligence.cycle) }}) {{ diligence.diligence }} - {{ diligence.titre }}</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="legende-partie-nog">Les diligences sélectionnées de la bibliothèque s'ajoutent en fin de cycle.</div>
            <div id="part-bottom-diligence">
              <div id="container-liste-diligence">
                <ng-container *ngFor="let diligence of nogPartie5.diligence">
                  <div class="container-diligence">
                    <div class="row-title-diligence" style="cursor: pointer;">
                      <div class="title-diligence">{{ diligence.groupe }} - {{ diligence.libelleGroupe }}</div>
                      <div class="switch-activation-groupe-diligence">
                        <label class="toggle-switch">
                          <input
                            type="checkbox"
                            [checked]="isGroupeActivated(diligence)"
                            (click)="toggleGroupeActivation(diligence, $event)"
                            class="toggle-checkbox">
                          <span class="toggle-slider"></span>
                        </label>
                      </div>
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
                          </tr>
                        </thead>
                        <tbody>

                          <ng-container *ngFor="let rowDiligence of diligence.tabDiligence">
                            <tr>
                              <td>{{ rowDiligence.diligence }}</td>
                              <td>{{ rowDiligence.titre }}</td>
                              <td>
                                <label class="toggle-switch" [class.toggle-switch-orange]="isManualDiligence(rowDiligence.diligence)">
                                  <input
                                    type="checkbox"
                                    [(ngModel)]="rowDiligence.activation"
                                    (ngModelChange)="onDiligenceActivationChange(); setChangeIntoDiligance()"
                                    class="toggle-checkbox">
                                  <span class="toggle-slider"></span>
                                </label>
                              </td>
                              <td [innerHTML]="rowDiligence.objectif"></td>
                            </tr>
                          </ng-container>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ng-container>
              </div>
            </div>
            <div *ngIf="nogPartie4.checkboxVigilance == 'Renforcee'" id="part-bottom-diligence-lab">
              <div class="title-element-nog">Diligences LAB<i title="Dernière mise à jour : {{nogPartie5.dateLastUpdateDiligenceLab}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
              <div class="liste-btn-absolute">
                <button class="btn-add-row" (click)="addDiligenceLabManuelle()"><i class="fa-solid fa-plus"></i> Créer une diligence LAB</button>
              </div>
              <table class="table-diligence">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>Cycle libelle</th>
                    <th>Code</th>
                    <th>Libelle</th>
                    <th>Activation</th>
                    <th>Objectif</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="nogPartie5.diligenceLab.length == 0" class="row-no-data">
                    <td colspan="100%">Aucune diligence LAB ajoutée</td>
                  </tr>
                  <tr *ngFor="let diligence of nogPartie5.diligenceLab">
                    <td>{{ diligence.cycle }}</td>
                    <td>{{ getCycleNameDiligence(diligence.cycle) }}</td>
                    <td>{{ diligence.diligence }}</td>
                    <td>{{ diligence.titre }}</td>
                    <td>
                      <label class="toggle-switch toggle-switch-orange">
                        <input
                          type="checkbox"
                          [(ngModel)]="diligence.activation"
                          (ngModelChange)="setChangeIntoDiliganceLab()"
                          class="toggle-checkbox">
                        <span class="toggle-slider"></span>
                      </label>
                    </td>
                    <td [innerHTML]="diligence.objectif"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div *ngIf="selectedPartNog=='6'" id="container-part-6-nog" class="container-part-nog">
            <div class="title-element-nog">Restitution client<i title="Dernière mise à jour : {{nogPartie6.dateLastUpdateRestitutionClient}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
            <div id="container-liste-checkbox-rest-client">
              <div class="container-element-rest-client">
                <div class="container-checkbox-rest-client">
                  <input type="checkbox" class="checkbox-rest-client" [checked]="nogPartie6.checkboxEtage1 == 'PPT'" (change)="updateCheckboxRestClient('PPT')"/>
                </div>
                <div class="libelle-rest-client">Présentation PPT</div>
              </div>
              <div class="container-element-rest-client">
                <div class="container-checkbox-rest-client">
                  <input type="checkbox" class="checkbox-rest-client" [checked]="nogPartie6.checkboxEtage1 == 'OutilReport'" (change)="updateCheckboxRestClient('OutilReport')"/>
                </div>
                <div class="libelle-rest-client">Présentation via un outil de reporting</div>
              </div>
              <div *ngIf="nogPartie6.checkboxEtage1 == 'OutilReport'" id="container-element-rest-client-etage-2">
                <div class="container-element-rest-client">
                  <div class="container-checkbox-rest-client">
                    <input type="checkbox" class="checkbox-rest-client" [checked]="nogPartie6.checkboxEtage2 == 'Emasphere'" (change)="updateCheckboxRestClientOutil('Emasphere')"/>
                  </div>
                  <div class="libelle-rest-client">Emasphère</div>
                </div>
                <div class="container-element-rest-client">
                  <div class="container-checkbox-rest-client">
                    <input type="checkbox" class="checkbox-rest-client" [checked]="nogPartie6.checkboxEtage2 == 'PowerBI'" (change)="updateCheckboxRestClientOutil('PowerBI')"/>
                  </div>
                  <div class="libelle-rest-client">PowerBI</div>
                </div>
                <div class="container-element-rest-client">
                  <div class="container-checkbox-rest-client">
                    <input type="checkbox" class="checkbox-rest-client" [checked]="nogPartie6.checkboxEtage2 == 'Autre'" (change)="updateCheckboxRestClientOutil('Autre')"/>
                  </div>
                  <div class="libelle-rest-client">Autre</div>
                </div>
              </div>
              <div *ngIf="nogPartie6.checkboxEtage2 == 'Autre' && nogPartie6.checkboxEtage1 == 'OutilReport'" id="container-autre-etage-2">
                <div class="container-element-deontologie">
                  <div class="libelle-deontologie">Autre : </div>
                  <input type="text" [(ngModel)]="nogPartie6.libelleAutreEtage2" (ngModelChange)="setChangeIntoRestitutionClient()" class="input-text"/>
                </div>
              </div>
              <div class="container-element-rest-client">
                <div class="container-checkbox-rest-client">
                  <input type="checkbox" class="checkbox-rest-client" [checked]="nogPartie6.checkboxEtage1 == 'Autre'" (change)="updateCheckboxRestClient('Autre')"/>
                </div>
                <div class="libelle-rest-client">Autre</div>
              </div>
              <div *ngIf="nogPartie6.checkboxEtage1 == 'Autre'" id="container-autre-etage-1">
                <div class="container-element-deontologie">
                  <div class="libelle-deontologie">Autre : </div>
                  <input type="text" [(ngModel)]="nogPartie6.libelleAutreEtage1" (ngModelChange)="setChangeIntoRestitutionClient()" class="input-text"/>
                </div>
              </div>
              <div id="container-commentaire-general">
                <div class="container-element-deontologie-comm-general">
                  <div class="libelle-deontologie">Commentaire général : </div>
                  <div id="editeur-texte-comm-general">
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
                      id="editorContentCommGeneral"
                      #editorContentCommGeneral
                      (input)="onEditorContentChangeCommGeneral($event)"
                      (keyup)="onEditorContentChangeCommGeneral($event)"
                      (paste)="onEditorContentChangeCommGeneral($event)"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="selectedPartNog=='7'" id="container-part-7-nog" class="container-part-nog">
            <div class="title-element-nog">Déontologie<i title="Dernière mise à jour : {{nogPartie7.dateLastUpdateDeontologie}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
            <div id="container-liste-checkbox-deontologie">
              <div class="container-element-deontologie">
                <div class="container-checkbox-deontologie">
                  <input type="checkbox" class="checkbox-deontologie" [(ngModel)]="nogPartie7.checkboxFormInit" (change)="updateCheckboxDeontologie('checkboxFormInit')"/>
                </div>
                <div class="libelle-deontologie">{{ nogPartie7.libelleFormInit }}</div>
              </div>
              <div class="container-element-deontologie">
                <div class="container-checkbox-deontologie">
                  <input type="checkbox" class="checkbox-deontologie" [(ngModel)]="nogPartie7.checkboxFormAnn" (change)="updateCheckboxDeontologie('checkboxFormAnn')"/>
                </div>
                <div class="libelle-deontologie">{{ nogPartie7.libelleFormAnn }}</div>
              </div>
              <div class="container-element-deontologie">
                <div class="container-checkbox-deontologie">
                  <input type="checkbox" class="checkbox-deontologie" [(ngModel)]="nogPartie7.checkboxConflictCheck" (change)="updateCheckboxDeontologie('checkboxConflictCheck')"/>
                </div>
                <div class="libelle-deontologie">{{ nogPartie7.libelleConflictCheck }}</div>
              </div>
            </div>
          </div>
          <div *ngIf="selectedPartNog=='annexes'" id="container-part-annexes-nog" class="container-part-nog">
            <div class="title-element-nog">Annexes<i title="Dernière mise à jour : {{nogPartieAnnexes.dateLastUpdateAnnexe}}" class="fa-solid fa-circle-info icon-date-last-modif"></i></div>
            <div class="body-element-nog">
              <div class="legende-partie-nog">Joindre les notes ou études d’avocats fiscaux, juridiques et sociaux, rescrits fiscaux, les garanties fiscales obtenues mais également toute note technique rédigée au client ainsi que la dernière note de synthèse.</div>
              <div class="container-annexes">
                <div class="section-upload-annexes">
                  <label for="file-input-annexes" class="btn-upload-annexes">
                    <i class="fa-solid fa-file-pdf"></i> Ajouter un ou plusieurs PDF
                  </label>
                  <input
                    id="file-input-annexes"
                    type="file"
                    accept=".pdf"
                    multiple
                    (change)="onFilesSelected($event)"
                    style="display: none;">
                </div>
                <div class="liste-annexes" *ngIf="nogPartieAnnexes.tabFiles.length > 0">
                  <div
                    class="item-annexe"
                    *ngFor="let file of nogPartieAnnexes.tabFiles; let i = index"
                    draggable="true"
                    (dragstart)="onDragStart($event, i)"
                    (dragover)="onDragOver($event)"
                    (drop)="onDrop($event, i)"
                    (dragend)="onDragEnd($event)"
                    [class.dragging]="draggedIndex === i">
                    <div class="drag-handle">
                      <i class="fa-solid fa-grip-vertical"></i>
                    </div>
                    <div class="info-annexe">
                      <i class="fa-solid fa-file-pdf icon-pdf"></i>
                      <span class="nom-fichier">{{ file.name }}</span>
                      <span class="taille-fichier">({{ formatFileSize(file.size) }})</span>
                    </div>
                    <button class="btn-supprimer-annexe" (click)="removeFile(i)" title="Supprimer">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="empty-state-annexes" *ngIf="nogPartieAnnexes.tabFiles.length === 0">
                  <i class="fa-solid fa-folder-open"></i>
                  <p>Aucun fichier ajouté</p>
                </div>
              </div>
              <div id="container-validation-finalisation">
                <div class="container-validation">
                  <div class="libelle-validation">Validation collaborateur :</div>
                  <div class="btn-validation"
                    (click)="validateCollab()"
                    [class.selected]="nogPartieAnnexes.validationCollab">
                      <i class="fa-regular fa-check"></i>
                  </div>
                </div>
                <div class="container-validation">
                  <div class="libelle-validation">Validation associé :</div>
                  <div class="btn-validation btn-validation-associe"
                    (click)="validateAssocie()"
                    [class.btn-validation-disabled]="!nogPartieAnnexes.validationCollab"
                    [class.selected]="nogPartieAnnexes.validationAssocie">
                      <i class="fa-regular fa-check"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Ajout Diligence Manuelle -->
    <div *ngIf="showAddDiligenceModal" class="apercu-overlay" (click)="closeAddDiligenceModal()">
      <div class="diligence-modal" (click)="$event.stopPropagation()">
        <div class="diligence-modal-header">
          <h3>Créer une diligence manuellement</h3>
          <button class="apercu-close" (click)="closeAddDiligenceModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="diligence-modal-content">
          <div class="form-group">
            <label for="diligence-cycle">Cycle</label>
            <select id="diligence-cycle" [(ngModel)]="newDiligence.cycle">
              <option value="">Sélectionner un cycle</option>
              <option value="A">A - {{ getCycleNameDiligence('A') }}</option>
              <option value="B">B - {{ getCycleNameDiligence('B') }}</option>
              <option value="C">C - {{ getCycleNameDiligence('C') }}</option>
              <option value="D">D - {{ getCycleNameDiligence('D') }}</option>
              <option value="E">E - {{ getCycleNameDiligence('E') }}</option>
              <option value="F">F - {{ getCycleNameDiligence('F') }}</option>
              <option value="G">G - {{ getCycleNameDiligence('G') }}</option>
              <option value="H">H - {{ getCycleNameDiligence('H') }}</option>
              <option value="I">I - {{ getCycleNameDiligence('I') }}</option>
              <option value="J">J - {{ getCycleNameDiligence('J') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="diligence-code">Code diligence *</label>
            <input id="diligence-code" type="text" [(ngModel)]="newDiligence.diligence" placeholder="Code ou identifiant de la diligence">
          </div>
          <div class="form-group">
            <label for="diligence-titre">Titre diligence *</label>
            <input id="diligence-titre" type="text" [(ngModel)]="newDiligence.titre" placeholder="Titre de la diligence">
          </div>
          <div class="form-group">
            <label for="diligence-objectif">Objectif</label>
            <textarea id="diligence-objectif" [(ngModel)]="newDiligence.objectif" placeholder="Objectif de la diligence" rows="4"></textarea>
          </div>
        </div>
        <div class="diligence-modal-footer">
          <button class="btn-cancel" (click)="closeAddDiligenceModal()">Annuler</button>
          <button class="btn-validate" (click)="validateNewDiligence()">Valider</button>
        </div>
      </div>
    </div>

    <!-- Modal Ajout Diligence LAB Manuelle -->
    <div *ngIf="showAddDiligenceLabModal" class="apercu-overlay" (click)="closeAddDiligenceLabModal()">
      <div class="diligence-modal" (click)="$event.stopPropagation()">
        <div class="diligence-modal-header">
          <h3>Créer une diligence manuellement LAB</h3>
          <button class="apercu-close" (click)="closeAddDiligenceLabModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="diligence-modal-content">
          <div class="form-group">
            <label for="diligence-cycle">Cycle</label>
            <select id="diligence-cycle" [(ngModel)]="newDiligenceLab.cycle">
              <option value="">Sélectionner un cycle</option>
              <option value="A">A - {{ getCycleNameDiligence('A') }}</option>
              <option value="B">B - {{ getCycleNameDiligence('B') }}</option>
              <option value="C">C - {{ getCycleNameDiligence('C') }}</option>
              <option value="D">D - {{ getCycleNameDiligence('D') }}</option>
              <option value="E">E - {{ getCycleNameDiligence('E') }}</option>
              <option value="F">F - {{ getCycleNameDiligence('F') }}</option>
              <option value="G">G - {{ getCycleNameDiligence('G') }}</option>
              <option value="H">H - {{ getCycleNameDiligence('H') }}</option>
              <option value="I">I - {{ getCycleNameDiligence('I') }}</option>
              <option value="J">J - {{ getCycleNameDiligence('J') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="diligence-lab-code">Code diligence *</label>
            <input id="diligence-lab-code" type="text" [(ngModel)]="newDiligenceLab.diligence" placeholder="Code ou identifiant de la diligence">
          </div>
          <div class="form-group">
            <label for="diligence-lab-titre">Titre diligence *</label>
            <input id="diligence-lab-titre" type="text" [(ngModel)]="newDiligenceLab.titre" placeholder="Titre de la diligence">
          </div>
          <div class="form-group">
            <label for="diligence-lab-objectif">Objectif</label>
            <textarea id="diligence-lab-objectif" [(ngModel)]="newDiligenceLab.objectif" placeholder="Objectif de la diligence" rows="4"></textarea>
          </div>
        </div>
        <div class="diligence-modal-footer">
          <button class="btn-cancel" (click)="closeAddDiligenceLabModal()">Annuler</button>
          <button class="btn-validate" (click)="validateNewDiligenceLab()">Valider</button>
        </div>
      </div>
    </div>

    <!-- Pop-up d'aperçu PDF -->
    <div *ngIf="showApercuPopup" class="apercu-overlay" (click)="closeApercuPopup()">
      <div class="apercu-popup" (click)="$event.stopPropagation()">
        <div class="apercu-header">
          <h3>Aperçu du document NOG</h3>
          <button class="download-pdf btn-disabled" title="Fonctionnalité à venir">
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
                  <td>{{ nogPartie1.coordonnees.DOS_ADRESSE }}</td>
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
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie1.activiteExHisto"></div>

          <div data-module-type="title" class="titre-nog-apercu"><h3>2. Présentation de la mission</h3></div>
          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>2.1. Lettre de mission</h4></div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <tbody>
                <tr>
                  <td>Date de mise à jour</td>
                  <td>{{ formatDate(nogPartie2.dateMiseAJour) }}</td>
                </tr>
                <tr>
                  <td>Montant des honoraires pour la mission</td>
                  <td>{{ formatNumber(nogPartie2.montantHonoraire) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>2.2. Type de la mission</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p>{{ nogPartie2.typeMission }}</p>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>2.3. Nature de la mission</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p>{{ nogPartie2.natureMission }}</p>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>2.4. Planning d'intervention</h4></div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <tbody>
                <tr>
                  <td>Consultations d'autres professionnels à prévoir</td>
                  <td>{{ nogPartie2.consultationPro }}</td>
                </tr>
                <tr>
                  <td>Interim</td>
                  <td>{{ nogPartie2.interim }}</td>
                </tr>
                <tr>
                  <td>Final</td>
                  <td>{{ nogPartie2.final }}</td>
                </tr>
                <tr>
                  <td>Délai à respecter</td>
                  <td>{{ nogPartie2.delaiRespecter }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th>Fonction</th>
                  <th>Nom</th>
                  <th>Total</th>
                  <ng-container *ngFor="let column of nogPartie2.planning[0]?.listeLib">
                    <th>{{ replaceNameLibelleListeLib(column) }}</th>
                  </ng-container>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of nogPartie2.planning">
                  <td>{{ row.fonction }}</td>
                  <td>{{ row.nom }}</td>
                  <td>{{ mathCeil(row.totalCollab) }}</td>
                  <ng-container *ngFor="let value of row.listeValue">
                    <td>{{ mathCeil(value) }}</td>
                  </ng-container>
                </tr>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>2.5. Equipe d'intervention</h4></div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th>Fonction</th>
                  <th>Nom</th>
                  <th>Actif</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Responsable mission</td>
                  <td>{{ nogPartie2.equipeInter[0].respMission }}</td>
                  <td>{{ nogPartie2.equipeInter[0].respMissionStatut }}</td>
                </tr>
                <tr>
                  <td>DMCM</td>
                  <td>{{ nogPartie2.equipeInter[0].dmcm }}</td>
                  <td>{{ nogPartie2.equipeInter[0].dmcmStatut }}</td>
                </tr>
                <tr>
                  <td>Factureur</td>
                  <td>{{ nogPartie2.equipeInter[0].factureur }}</td>
                  <td>{{ nogPartie2.equipeInter[0].factureurStatut }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>2.6. Précision sur les travaux à réaliser en interim</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie2.precisionTravaux"></div>

          <div data-module-type="title" class="titre-nog-apercu"><h3>3. Connaissance du client et de son environnement</h3></div>
          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>3.1. Logiciels utilisés</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Outils environnement GT</strong></p>
          </div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Outil</th>
                  <th>Coût</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let logiciel of nogPartie3.tabLogicielGT">
                  <td>{{ logiciel.type }}</td>
                  <td>{{ logiciel.logiciel }}</td>
                  <td>{{ formatNumber(logiciel.montant) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Outils environnement client</strong></p>
          </div>
          <div data-module-type="table" class="contenu-nog-apercu">
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Outil</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let logiciel of nogPartie3.tabLogicielClient">
                  <td>{{ logiciel.type }}</td>
                  <td>{{ logiciel.logiciel }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>3.2. Organisation du service administratif</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie3.orgaServiceAdmin"></div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>3.3. Facturation électronique</h4></div>
          <div *ngIf="nogPartie3.isFEValidate" data-module-type="table" class="contenu-nog-apercu">
            <p><strong>Obligation FE</strong></p>
            <table class="table-nog preview-table">
              <thead>
                <tr>
                  <th>E-Invoicing</th>
                  <th>E-Reporting transaction</th>
                  <th>E-Reporting paiement</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ nogPartie3.eInvoicing }}</td>
                  <td>{{ nogPartie3.eReportingTransaction }}</td>
                  <td>{{ nogPartie3.eReportingPaiement }}</td>
                </tr>
              </tbody>
            </table>
            <br>
            <table class="table-nog preview-table">
              <tbody>
                <tr>
                  <td><strong>Cas de gestion</strong></td>
                  <td>{{ nogPartie3.casGestion }}</td>
                </tr>
                <tr>
                  <td><strong>Mail envoyé au client</strong></td>
                  <td>{{ nogPartie3.mailEnvoi }}</td>
                </tr>
                <tr>
                  <td><strong>Mandat signé</strong></td>
                  <td>{{ nogPartie3.signatureMandat }}</td>
                </tr>
              </tbody>
            </table>
            <br>
            <p><strong>Commentaire FE</strong></p>
            <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie3.commentaireFE"></div>
          </div>
          <div *ngIf="!nogPartie3.isFEValidate" data-module-type="text" class="contenu-nog-apercu">
            <p>Merci de bien vouloir remplir la facturation électronique dans MyVision.</p>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>3.4. Synthèse de l'entretien avec la direction (faits marquants)</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie3.syntheseEntretienDir"></div>

          <div data-module-type="title" class="titre-nog-apercu"><h3>4. Principes à mettre en œuvre lors de l'exécution de la mission</h3></div>
          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>4.1. Appréciation des risques et du niveau de vigilance à appliquer</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><em>En application de la norme anti-blanchiment, le niveau de vigilance retenu à la suite de l'acceptation de la mission (nouveau client) ou de la synthèse de l'exercice précédent. Si dans les évènements marquants de l'exercice il a été observé des opérations atypiques ou complexes ou si l'entreprise a réalisé des montages fiscaux, sociaux ou juridiques complexes, il conviendra de revoir le cas échéant le niveau de vigilance</em></p>
            <p><strong>Niveau de vigilance : {{ nogPartie4.checkboxVigilance == 'Normal' ? 'Vigilance normale' : 'Vigilance renforcée' }}</strong></p>
          </div>
          <div *ngIf="nogPartie4.checkboxVigilance == 'Normal'" data-module-type="text" class="contenu-nog-apercu">
            <p>En cas de vigilance normale :</p>
            <p>Les diligences accomplies dans le cadre des missions normées correspondent normalement à un niveau de vigilance standard, cependant, l'équipe affectée à la mission effectue un examen renforcé de toute opération particulièrement complexe ou d'un montant inhabituellement élevé ou ne paraissant pas avoir de justification économique ou d'objet licite.</p>
            <p>Dans ce cas, elle se renseigne auprès du client sur :</p>
            <ul>
              <li>l'origine et la destination des fonds</li>
              <li>ainsi que sur l'objet de l'opération et l'identité de la personne qui en bénéficie.</li>
            </ul>
          </div>
          <div *ngIf="nogPartie4.checkboxVigilance == 'Renforcee'" data-module-type="text" class="contenu-nog-apercu">
            <p>En cas de vigilance renforcée, compléter les contrôles à effectuer en s'appuyant entre autres sur « l'ARPEC »</p>
          </div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>4.2. Principes comptables, régime fiscal ou social particuliers</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Aspects comptables</strong></p>
          </div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie4.aspectsComptables"></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Aspects fiscaux</strong></p>
          </div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie4.aspectsFiscaux"></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Aspects sociaux</strong></p>
          </div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie4.aspectsSociaux"></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Aspects juridiques</strong></p>
          </div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie4.aspectsJuridiques"></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Comptes annuels</strong></p>
          </div>
          <div data-module-type="text" class="contenu-nog-apercu" [innerHTML]="nogPartie4.comptesAnnuels"></div>

          <div data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>4.3. Seuil de signification</h4></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p>Selon la norme de présentation « l'expert-comptable prend en considération le caractère significatif, ce qui peut le conduire à simplifier certaines opérations d'inventaire »</p>
            <p><strong>Seuil de signification retenu pour les opérations d'inventaire : {{ formatNumber(nogPartie4.seuil) }}</strong></p>
          </div>

          <div data-module-type="title" class="titre-nog-apercu"><h3>5. Diligences</h3></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <ng-container *ngFor="let diligence of nogPartie5.diligence">
              <div *ngIf="isGroupeActivated(diligence)" class="groupe-diligence-preview">
                <p><strong>{{ diligence.groupe }} - {{ diligence.libelleGroupe }}</strong></p>
                <table class="table-diligence preview-table">
                  <thead>
                    <tr>
                      <th>Code diligence</th>
                      <th>Libelle diligence</th>
                      <th>Objectif</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let rowDiligence of diligence.tabDiligence">
                      <ng-container *ngIf="rowDiligence.activation">
                        <td>{{ rowDiligence.diligence }}</td>
                        <td>{{ rowDiligence.titre }}</td>
                        <td [innerHTML]="rowDiligence.objectif"></td>
                      </ng-container>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>
          </div>

          <div *ngIf="nogPartie4.checkboxVigilance == 'Renforcee' && nogPartie5.diligenceLab.length > 0" data-module-type="subtitle" class="sous-titre-nog-apercu"><h4>Diligences LAB</h4></div>
          <div *ngIf="nogPartie4.checkboxVigilance == 'Renforcee' && nogPartie5.diligenceLab.length > 0" data-module-type="table" class="contenu-nog-apercu">
            <table class="table-diligence preview-table">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Cycle libelle</th>
                  <th>Code diligence</th>
                  <th>Libelle diligence</th>
                  <th>Objectif</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let diligence of nogPartie5.diligenceLab">
                  <ng-container *ngIf="diligence.activation">
                    <td>{{ diligence.cycle }}</td>
                    <td>{{ getCycleNameDiligence(diligence.cycle) }}</td>
                    <td>{{ diligence.diligence }}</td>
                    <td>{{ diligence.titre }}</td>
                    <td [innerHTML]="diligence.objectif"></td>
                  </ng-container>
                </tr>
              </tbody>
            </table>
          </div>

          <div data-module-type="title" class="titre-nog-apercu"><h3>6. Restitution client</h3></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <p *ngIf="nogPartie6.checkboxEtage1 == 'PPT'"><strong>Type de restitution :</strong> Présentation PPT</p>
            <p *ngIf="nogPartie6.checkboxEtage1 == 'OutilReport'">
              <strong>Type de restitution :</strong> Présentation via un outil de reporting
              <span *ngIf="nogPartie6.checkboxEtage2 == 'Emasphere'"> - Emasphère</span>
              <span *ngIf="nogPartie6.checkboxEtage2 == 'PowerBI'"> - PowerBI</span>
              <span *ngIf="nogPartie6.checkboxEtage2 == 'Autre'"> - {{ nogPartie6.libelleAutreEtage2 }}</span>
            </p>
            <p *ngIf="nogPartie6.checkboxEtage1 == 'Autre'"><strong>Type de restitution :</strong> {{ nogPartie6.libelleAutreEtage1 }}</p>
          </div>
          <div *ngIf="nogPartie6.commGeneral" data-module-type="text" class="contenu-nog-apercu">
            <p><strong>Commentaire général :</strong></p>
            <div [innerHTML]="nogPartie6.commGeneral"></div>
          </div>

          <div data-module-type="title" class="titre-nog-apercu"><h3>7. Déontologie</h3></div>
          <div data-module-type="text" class="contenu-nog-apercu">
            <div class="checkbox-preview-item">
              <i class="fa-solid" [class.fa-square-check]="nogPartie7.checkboxFormInit" [class.fa-square]="!nogPartie7.checkboxFormInit"></i>
              <span>{{ nogPartie7.libelleFormInit }}</span>
            </div>
            <div class="checkbox-preview-item">
              <i class="fa-solid" [class.fa-square-check]="nogPartie7.checkboxFormAnn" [class.fa-square]="!nogPartie7.checkboxFormAnn"></i>
              <span>{{ nogPartie7.libelleFormAnn }}</span>
            </div>
            <div class="checkbox-preview-item">
              <i class="fa-solid" [class.fa-square-check]="nogPartie7.checkboxConflictCheck" [class.fa-square]="!nogPartie7.checkboxConflictCheck"></i>
              <span>{{ nogPartie7.libelleConflictCheck }}</span>
            </div>
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

    .file-upload-container {
      display: flex;
      flex-direction: column;
      gap: 1vh;
    }

    .file-upload-label {
      background: var(--secondary-color);
      color: white;
      border: none;
      padding: 1.5vh 2vw;
      border-radius: 0.5vw;
      font-size: var(--font-size-lg);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5vw;
    }

    .file-upload-label:hover {
      background: #4fb3ab;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .file-upload-input {
      display: none;
    }

    .selected-file-name {
      background: var(--gray-50);
      border: 0.1vh solid var(--gray-200);
      border-radius: 0.5vw;
      padding: 1vh 1vw;
      font-size: var(--font-size-md);
      color: var(--gray-700);
      display: flex;
      align-items: center;
      gap: 0.5vw;
    }

    .selected-file-name i {
      color: var(--secondary-color);
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

    /* Modal Ajout Diligence */
    .diligence-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 50vw;
      max-width: 600px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      z-index: 2001;
      display: flex;
      flex-direction: column;
      max-height: 80vh;
    }

    .diligence-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5vh 1.5vw;
      border-bottom: 1px solid var(--gray-200);
      background: var(--primary-color);
      color: white;
      border-radius: 8px 8px 0 0;
    }

    .diligence-modal-header h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    .diligence-modal-content {
      flex: 1;
      padding: 2vh 1.5vw;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5vh;
    }

    .container-annexes {
      padding: 2vh 2vw;
    }

    .section-upload-annexes {
      margin-bottom: 2vh;
    }

    .btn-upload-annexes {
      display: inline-block;
      padding: 1vh 2vw;
      background-color: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--font-size-md);
      transition: background-color 0.3s;
    }

    .btn-upload-annexes:hover {
      background-color: #0056b3;
    }

    .btn-upload-annexes i {
      margin-right: 0.5vw;
    }

    .liste-annexes {
      display: flex;
      flex-direction: column;
      gap: 1vh;
    }

    .item-annexe {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1vh 1vw;
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      cursor: move;
      transition: all 0.2s;
    }

    .item-annexe:hover {
      background-color: #e9ecef;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .item-annexe.dragging {
      opacity: 0.5;
    }

    .drag-handle {
      display: flex;
      align-items: center;
      color: #6c757d;
      cursor: grab;
      margin-right: 1vw;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .drag-handle i {
      font-size: 1rem;
    }

    .info-annexe {
      display: flex;
      align-items: center;
      gap: 1vw;
    }

    .icon-pdf {
      color: #dc3545;
      font-size: 1.5rem;
    }

    .nom-fichier {
      font-size: var(--font-size-md);
      font-weight: 500;
    }

    .taille-fichier {
      font-size: var(--font-size-sm);
      color: #6c757d;
    }

    .btn-supprimer-annexe {
      padding: 0.5vh 1vw;
      background-color: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--font-size-md);
      transition: background-color 0.3s;
    }

    .btn-supprimer-annexe:hover {
      background-color: #c82333;
    }

    .empty-state-annexes {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4vh 2vw;
      color: #6c757d;
    }

    .empty-state-annexes i {
      font-size: 3rem;
      margin-bottom: 1vh;
    }

    .empty-state-annexes p {
      font-size: var(--font-size-md);
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5vh;
    }

    .form-group label {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--gray-700);
    }

    .form-group input,
    .form-group textarea {
      padding: 0.8vh 0.8vw;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: var(--font-size-md);
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-group select {
      padding: 0.8vh 0.8vw;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: var(--font-size-md);
      font-family: inherit;
      transition: border-color 0.2s;
      background-color: white;
      cursor: pointer;
    }

    .form-group select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .diligence-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1vw;
      padding: 1.5vh 1.5vw;
      border-top: 1px solid var(--gray-200);
    }

    .btn-cancel,
    .btn-validate {
      padding: 0.8vh 1.5vw;
      border-radius: 4px;
      font-size: var(--font-size-md);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-cancel {
      background: var(--gray-200);
      color: var(--gray-700);
    }

    .btn-cancel:hover {
      background: var(--gray-300);
    }

    .btn-validate {
      background: var(--primary-color);
      color: white;
    }

    .btn-validate:hover {
      background: var(--primary-dark);
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
      max-width: 22vw;
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
      z-index: 101;
      width: fit-content;
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
      padding: 0.5vh 0.5vw;
      background-color: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.3vw;
      cursor: pointer;
      font-size: var(--font-size-sm);
      transition: all 0.2s;
      width: fit-content;
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

    .checkbox-preview-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .checkbox-preview-item i {
      font-size: 16px;
      color: var(--primary-color);
    }

    .groupe-diligence-preview {
      margin-bottom: 20px;
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

    table:not(.preview-table).table-nog thead {
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
      width: 2.6vw;
      height: 1.25vw;
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
      border-radius: 1.25vw;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 0.94vw;
      width: 0.94vw;
      left: 0.16vw;
      bottom: 0.16vw;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }

    .toggle-checkbox:checked + .toggle-slider {
      background-color: #4CAF50;
    }

    .toggle-checkbox:checked + .toggle-slider:before {
      transform: translateX(1.35vw);
    }

    .toggle-checkbox:focus + .toggle-slider {
      box-shadow: 0 0 0.05vw #4CAF50;
    }

    .toggle-switch-orange .toggle-checkbox:checked + .toggle-slider {
      background-color: #FF9800;
    }

    .toggle-switch-orange .toggle-checkbox:focus + .toggle-slider {
      box-shadow: 0 0 0.05vw #FF9800;
    }

    .multiselect-diligence {
      padding: 2vh 2vw;
      position: relative;
    }

    .multiselect-label {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin-bottom: 1vh;
    }

    .multiselect-wrapper {
      position: relative;
      width: 85%;
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
      position: sticky;
      top: 0;
      z-index: 100;
      background-color: white;
      border-radius: 0.5vw;
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
      padding: 0vh 2vw;
      max-height: 69vh;
      overflow: auto;
      position: relative;
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
      position: relative;
      height: 100%;
    }

    .container-diligence {
      background-color: white;
      border-radius: 0.5vw;
    }

    #part-bottom-diligence table.table-diligence th:nth-child(1),
    #part-bottom-diligence table.table-diligence td:nth-child(1) {
      width: 3.5vw;
    }

    #part-bottom-diligence table.table-diligence th:nth-child(2),
    #part-bottom-diligence table.table-diligence td:nth-child(2) {
      width: 10vw;
    }

    #part-bottom-diligence table.table-diligence th:nth-child(3),
    #part-bottom-diligence table.table-diligence td:nth-child(3) {
      width: 4vw;
      text-align: center;
    }

    #part-bottom-diligence table.table-diligence th:nth-child(4),
    #part-bottom-diligence table.table-diligence td:nth-child(4) {
      width: 27vw;
    }

    #part-bottom-diligence table.table-diligence th:nth-child(5),
    #part-bottom-diligence table.table-diligence td:nth-child(5) {
      width: 27vw;
    }

    #part-bottom-diligence-lab table.table-diligence th:nth-child(1),
    #part-bottom-diligence-lab table.table-diligence td:nth-child(1) {
      width: 3.5vw;
    }

    #part-bottom-diligence-lab table.table-diligence th:nth-child(2),
    #part-bottom-diligence-lab table.table-diligence td:nth-child(2) {
      width: 10vw;
    }

    #part-bottom-diligence-lab table.table-diligence th:nth-child(3),
    #part-bottom-diligence-lab table.table-diligence td:nth-child(3) {
      width: 3vw;
    }

    #part-bottom-diligence-lab table.table-diligence th:nth-child(4),
    #part-bottom-diligence-lab table.table-diligence td:nth-child(4) {
      width: 10vw;
    }

    #part-bottom-diligence-lab table.table-diligence th:nth-child(5),
    #part-bottom-diligence-lab table.table-diligence td:nth-child(5) {
      width: 4vw;
      text-align: center;
    }

    #part-bottom-diligence-lab table.table-diligence th:nth-child(6),
    #part-bottom-diligence-lab table.table-diligence td:nth-child(6) {
      width: 22vw;
    }

    .row-table-diligence {
      border-top: 0.1vh solid var(--gray-200);
    }

    .title-diligence {
      font-size: var(--font-size-lg);
      width: 30vw;
    }

    .icon-collapse-diligence i {
      font-size: 0.8vw;
    }

    table.table-nog input {
      width: 100% !important;
    }

    .container-input-title-nog {
      position: relative;
    }

    div#part-bottom-planning-inter-nog .title-bloc-nog {
      height: 3.5vh;
      display: flex;
      align-items: flex-end;
    }

    div#container-add-diligence .btn-add-row {
      right: 2vw;
    }

    div#part-bottom-diligence-lab {
      margin-top: 2vh;
      position: relative;
    }

    div#container-part-5-nog {
      gap: 0 !important;
    }

    div#part-bottom-diligence-lab .btn-add-row {
      width: 12.5vw;
      top: 2vh;
    }

    tr.row-no-data td {
      color: var(--gray-500);
      text-align: center !important;
    }

    div#part-bottom-diligence-lab .table-diligence {
      background-color: white;
    }

    .container-element-deontologie {
      display: flex;
      gap: 0.5vw;
      align-items: center;
    }

    .libelle-deontologie {
      font-size: var(--font-size-md);
    }

    div#container-liste-checkbox-deontologie {
      display: flex;
      flex-direction: column;
      gap: 1vh;
    }

    div#container-liste-checkbox-rest-client {
      display: flex;
      flex-direction: column;
      gap: 1vh;
    }

    .container-element-rest-client {
      display: flex;
      align-items: center;
      gap: 0.5vw;
    }

    .libelle-rest-client {
      font-size: var(--font-size-md);
    }

    div#container-element-rest-client-etage-2 {
      padding-left: 2vw;
      padding-bottom: 1vh;
    }

    div#container-autre-etage-1 {
      padding-left: 3vw;
      display: flex;
      flex-direction: column;
      gap: 0.5vh;
    }

    div#container-autre-etage-1 .libelle-deontologie {
      width: 8vw;
    }

    div#container-autre-etage-1 .input-text {
      width: 20vw;
    }

    div#container-commentaire-general {
      margin-top: 2vh;
    }

    div#container-commentaire-general .input-text {
      width: 20vw;
    }

    div#container-part-3-1-nog {
      width: 100%;
    }

    div#container-part-3-1-nog .body-element-nog {
      display: flex;
      justify-content: space-between;
      padding: 1vh 1vw;
    }

    div#container-tab-logiciel-gt {
      width: 36vw;
      position: relative;
    }

    div#container-tab-logiciel-client {
      width: 30vw;
      position: relative;
    }

    .titre-tab-logiciel {
      font-size: var(--font-size-lg);
      height: 3.8vh;
      padding-top: 1vh;
      font-weight: 600;
    }

    .container-table-logiciel-nog {
      position: relative;
      height: 22vh;
      overflow-y: auto;
    }

    .container-table-logiciel-nog .table-nog thead {
      position: sticky;
      top: 0;
    }

    div#container-part-3-nog .row-part-nog {
      height: 31vh;
    }

    div#container-tab-logiciel-gt .table-nog th:nth-child(1), 
    div#container-tab-logiciel-gt .table-nog td:nth-child(1) {
      width: 12vw;
    }

    div#container-tab-logiciel-gt .table-nog th:nth-child(2), 
    div#container-tab-logiciel-gt .table-nog td:nth-child(2) {
      width: 10vw;
    }

    div#container-tab-logiciel-gt .table-nog th:nth-child(3), 
    div#container-tab-logiciel-gt .table-nog td:nth-child(3) {
      width: 8vw;
      text-align: right;
    }

    div#container-tab-logiciel-gt .table-nog th:nth-child(4), 
    div#container-tab-logiciel-gt .table-nog td:nth-child(4) {
      width: 4vw;
    }

    div#container-tab-logiciel-client .table-nog th:nth-child(1), 
    div#container-tab-logiciel-client .table-nog td:nth-child(1) {
      width: 12vw;
    }

    div#container-tab-logiciel-client .table-nog th:nth-child(2), 
    div#container-tab-logiciel-client .table-nog td:nth-child(2) {
      width: 10vw;
    }

    div#container-tab-logiciel-client .table-nog th:nth-child(3), 
    div#container-tab-logiciel-client .table-nog td:nth-child(3) {
      width: 4vw;
    }

    div#container-part-3-2-nog {
      width: 100%;
    }

    div#container-part-3-4-nog {
      width: 100%;
    }

    div#container-part-4-1-nog {
      width: 100%;
    }

    div#container-part-4-nog .row-part-nog {
      height: 40vh;
    }

    div#container-checkbox-vigilance {
      display: flex;
      background-color: var(--gray-100);
      gap: 3vw;
      padding: 1vh 0;
    }

    .container-element-appreciation-risque-vigilance {
      display: flex;
      gap: 0.5vw;
    }

    .libelle-appreciation-risque-vigilance {
      font-size: var(--font-size-md);
    }

    div#editeur-organisation-service-admin {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    div#editeur-synthese-entretient-dir {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    div#editeur-appreciation-risque-vigilance {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .input-date-cs {
      width: 8vw !important;
      padding: 0.3vh 0.3vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.3vw;
      font-size: var(--font-size-md);
    }

    .input-nb-mois-cs {
      width: 3vw !important;
    }

    .texte-appreciation-risque-vigilance {
      font-size: var(--font-size-md);
      padding: 1vh 1vw;
    }

    div#container-autre-etage-2 {
      padding-left: 5vw;
    }

    .row-part-nog.row-fe-nog {
      height: 61vh !important;
    }

    div#container-part-3-3-nog .body-element-nog {
      display: flex;
      gap: 1vw;
      font-size: var(--font-size-md);
    }

    .element-fe-title-value {
      display: flex;
      font-size: var(--font-size-md);
    }

    .title-fe {
      font-weight: 600;
      width: 10vw;
    }

    .container-impact-fe, .container-mail-mandat-fe {
      display: flex;
      flex-direction: column;
      gap: 1vh;
      padding: 1vh 1vw;
    }

    div#container-part-3-3-nog {
      width: 100%;
    }

    .container-principe-comp {
      display: flex;
      flex-direction: column;
      gap: 1vh;
      position: relative;
      max-height: 50vh;
      overflow-y: auto;
    }

    div#container-part-4-2-nog {
      width: 100%;
    }

    .container-editeur-principe-comp {
      background-color: #fff;
      border-radius: .5vw;
    }

    .row-title-principe-comp {
      display: flex;
      width: 100%;
      justify-content: space-between;
      padding: 1vh 1vw;
      position: sticky;
      top: 0;
      z-index: 100;
      background-color: #fff;
      border-radius: .5vw;
      font-size: var(--font-size-lg);
    }

    .container-content-principe-comp {
      height: 20vh;
    }

    div#editeur-texte-aspects-comptables,
    div#editeur-texte-aspects-fiscaux,
    div#editeur-texte-aspects-sociaux,
    div#editeur-texte-aspects-juridiques,
    div#editeur-texte-comptes-annuels {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    div#container-part-4-2-nog .body-element-nog {
      background-color: var(--gray-100);
    }

    div#container-part-4-2-nog .toolbar-editor {
      background-color: white;
    }

    div#container-part-4-3-nog {
      width: 100%;
    }

    div#container-part-4-3-nog .body-element-nog {
      padding: 1vh 1vw;
      display: flex;
      flex-direction: column;
      gap: 2vh;
    }

    .row-part-nog.row-part-4-3 {
      height: 14vh !important;
    }

    .text-fixe-4-3 {
      font-size: var(--font-size-md);
    }

    .container-seuil-4-3 {
      display: flex;
      gap: 0.5vw;
      font-size: var(--font-size-md);
      align-items: center;
    }

    .title-seuil {
      font-weight: 600;
    }

    .info-annexe {
      width: 91%;
    }

    .row-part-nog.row-part-4-2 {
      max-height: 55vh !important;
      height: auto !important;
    }

    i.fa-solid.fa-circle-info.icon-date-last-modif {
      margin-left: 1vw;
    }

    div#container-no-mission {
      width: 100%;
      height: 92vh;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: var(--font-size-lg);
    }

    div#container-validation-finalisation {
      display: flex;
      align-items: center;
      padding: 3vh 1vw 1vh 1vw;
      justify-content: center;
      background-color: var(--gray-100);
      gap: 5vw;
    }

    .container-validation {
        display: flex;
        align-items: center;
        gap: 0.5vw;
        font-size: var(--font-size-lg);
    }

    .btn-validation {
        border: 0.1vh solid #00c300;
        padding: 0.3vh 1vw;
        background-color: #00880017;
        border-radius: 1vw;
        color: #00c300;
        cursor: pointer;
    }

    .btn-validation:hover {
        background-color: #00c300;
        color: white;
    }

    .btn-validation.selected {
        background-color: #00c300;
        color: white;
    }

    .legende-partie-nog {
      font-size: var(--font-size-md);
      font-style: italic;
      padding: 1vh 1vh;
      color: var(--gray-500);
    }

    .liste-btn-absolute {
      position: absolute;
      top: 0.6vh;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: flex-end;
      gap: 0.5vw;
    }

    .btn-reload-data {
      padding: 0.5vh 0.5vw;
      background-color: white;
      color: var(--primary-color);
      border: none;
      border-radius: 0.3vw;
      cursor: pointer;
      transition: all 0.2s;
      width: fit-content;
      font-size: var(--font-size-sm);
      border: 0.1vh solid var(--primary-color);
    }

    .btn-reload-data:hover:not(:disabled) {
      background-color: var(--primary-color);
      color: white;
    }

    .btn-reload-data:disabled {
      background-color: #f5f5f5;
      color: #999;
      border-color: #ddd;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-disabled {
      cursor: not-allowed;
    }

    .btn-validation.btn-validation-disabled {
      border-color: var(--gray-400) !important;
      color: var(--gray-400) !important;
      background-color: #ededed !important;
      cursor: not-allowed;
    }

    .container-fe-nog {
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 0.5vh 1vw;
    }

    .container-table-obligation-mail-fe-nog {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .container-table-obligation-fe-nog {
      width: 30vw;
    }

    .container-mail-mandat-fe {
      width: 25vw;
    }

    .titre-tab-fe {
      font-size: var(--font-size-lg);
      font-weight: 600;
      padding: 0.5vh 0vw;
    }

    .container-table-fe-nog {
      margin-top: 2vh;
    }

    div#read-only-nog {
      width: 85vw;
      height: 100%;
      position: fixed;
      top: 14vh;
      right: 0.3vw;
      z-index: 100;
      cursor: not-allowed;
      background-color: #80808047;
      font-size: var(--font-size-lg);
      text-align: center;
      color: red;
    }

    div#part-bottom-right-page-nog {
      position: relative;
    }

    .btn-validation-associe {
      z-index: 101;
    }

    i.fa-solid.fa-circle-info.icon-date-last-modif {
      z-index: 102;
      position: relative;
    }

    div#container-bouton-pdf {
      display: flex;
      align-items: center;
      gap: 1vw;
    }

    div#container-save-nog {
      display: flex;
      align-items: center;
      background-color: #ffffff63;
      padding: 1vh 1vw;
      border-radius: 0.5vw;
      transition: all 0.2s ease;
      font-size: var(--font-size-md);
      gap: 0.3vw;
      color: white;
    }

    #container-save-nog i.fa-regular.fa-floppy-disk {
      font-size: 1vw;
    }

    .date-last-save-nog {
      font-size: var(--font-size-md);
    }

    .load-save-nog {
      font-size: 0.7vw;
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

    .file-info {
      display: flex;
      padding: 0.5vh 0.5vw;
      background: var(--gray-100);
      border-radius: 0.5vw;
      flex-direction: column;
      width: 100%;
    }

    .file-info {
      display: flex;
      gap: 0.5vh;
      margin-top: 0.5vh;
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }

    .row-info-file {
      display: flex;
      align-items: center;
      justify-content: space-between;
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

    div#editeur-texte-comm-general {
      height: 24vh;
      display: flex;
      flex-direction: column;
      background-color: white;
      margin-top: 0.5vh;
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

    div#editeur-commentaire-fe {
      height: 34vh;
      display: flex;
      flex-direction: column;
    }

    div#editorContentCommentaireFE {
      background-color: var(--gray-100);
    }
  `]
})
export class NogEditorComponent implements OnInit, OnDestroy, AfterViewInit {

  isDossierMissionMillesimeSelected = false;
  isAllDataNogLoaded = false;
  isCoordonneesLoaded = false;
  isContactsLoaded = false;
  isChiffresSignificatifsLoaded = false;
  isAssociesLoaded = false;
  isEquipeInterLoaded = false;
  isPlanningsLoaded = false;
  isTypeMissionNatureLoaded = false;
  isDiligencesDefaultLoaded = false;
  isDiligencesBibliothequeLoaded = false;
  isMontantLogicielLoaded = false;
  isModuleFELoaded = false;
  isListeBDFELoaded = false;

  isValeurUniqueLoaded = false;
  isDiligenceLabLoaded = false;
  isDiligenceAddLoaded = false;
  isFichiersAnnexeLoaded = false;
  isFELoaded = false;

  isNogCanBeValidate = false;

  isReloadingCoordonnees = false;
  isReloadingContacts = false;
  isReloadingAssocies = false;
  isReloadingCS = false;
  isReloadingPlanning = false;
  isReloadingEquipeInter = false;
  isReloadingLogiciel = false;
  isReloadingFE = false;

  private debounceTimers: { [key: string]: any } = {};

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
  listeLibPlanningSauv: string[] = [];
  listeBdFE: any[] = [];
  
  // Variables pour les sélections
  selectedDossier: Dossier | null = null;
  selectedDossierDisplay: string = '';
  selectedMission: string = '';
  selectedMillesime: string = '';
  selectedCodeAffaire: string = '';

  selectedPartNog: string = '1';
  showApercuPopup: boolean = false;
  showAddDiligenceModal: boolean = false;
  showAddDiligenceLabModal: boolean = false;

  isProfilAssocie: boolean = false;

  isCollabHasMissions: boolean = true;

  dateLastUpdateNog: string = '';
  isSavingNog: boolean = false;

  selectedFileNog: File | null = null;
  selectedFileNogId: number = 0;
  selectedProfilId: number = 0;
  selectedFileNogDate: string = '';

  newDiligence: TabDiligence = {
    cycle: '',
    diligence: '',
    titre: '',
    objectif: '',
    activation: true
  };

  newDiligenceLab: TabDiligence = {
    cycle: '',
    diligence: '',
    titre: '',
    objectif: '',
    activation: true
  };

  diligenceAddMan: TabDiligence[] = [];
  diligenceBib: TabDiligence[] = [];
  
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
      DOS_ADRESSE: ''
    },
    contacts: [],
    associes: [],
    chiffresSignificatifs: [
      {
        dosPgi: '',
        datePeriode: '',
        dureeExercice: '',
        effectif: 0,
        capitauxPropres: 0,
        bilanNet: 0,
        ca: 0,
        beneficePerte: 0
      },
      {
        dosPgi: '',
        datePeriode: '',
        dureeExercice: '',
        effectif: 0,
        capitauxPropres: 0,
        bilanNet: 0,
        ca: 0,
        beneficePerte: 0
      }
    ],
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

  nogPartie3: NogPartie3 = {
    tabLogicielGT: [],
    tabLogicielClient: [],
    orgaServiceAdmin: '',
    syntheseEntretienDir: '',
    eInvoicing: '',
    eReportingPaiement: '',
    eReportingTransaction: '',
    businessDev: ['','','','','','','','','',''],
    mailEnvoi: '',
    signatureMandat: '',
    commentaireFE: '',
    casGestion: '',
    isFEValidate: false
  }

  nogPartie4: NogPartie4 = {
    checkboxVigilance: 'Normal',
    appreciationRisqueVigilence: '',
    aspectsComptables: '',
    aspectsFiscaux: '',
    aspectsSociaux: '',
    aspectsJuridiques: '',
    comptesAnnuels: '',
    seuil: 0
  }

  nogPartie5: NogPartie5 = {
    diligence: [],
    diligenceAdd: [],
    diligenceLab: []
  }

  nogPartie6: NogPartie6 = {
    checkboxEtage1: '',
    checkboxEtage2: '',
    commGeneral: ''
  }

  nogPartie7: NogPartie7 = {
    checkboxFormInit: false,
    libelleFormInit: 'L\'associé responsable de la mission s\'est assuré que l\'ensemble des collaborateurs présents sur la mission a bien suivi la formation initiale sur les règles du code éthique de GT et d\'indépendance',
    checkboxFormAnn: false,
    libelleFormAnn: 'L\'associé responsable de la mission s\'est assuré que l\'ensemble des collaborateurs a bien suivi la formation annuelle sur les règles du code éthique de GT et d\'indépendance',
    checkboxConflictCheck: false,
    libelleConflictCheck: 'L\'associé responsable de la mission s\'est assuré que lui et les collaborateurs n\'étaient pas en situation de conflit d\'intérêt sur la mission'
  }

  nogPartieAnnexes: NogPartieAnnexes = {
    tabFiles: [],
    validationCollab: false,
    validationAssocie: false
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.type === 'application/pdf') {
          this.nogPartieAnnexes.tabFiles.push(file);
        }
      }
      input.value = '';
      this.setChangeIntoAnnexe();
    }
  }

  removeFile(index: number): void {
    this.nogPartieAnnexes.tabFiles.splice(index, 1);
    this.setChangeIntoAnnexe();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  draggedIndex: number | null = null;

  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', index.toString());
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
      const draggedFile = this.nogPartieAnnexes.tabFiles[this.draggedIndex];
      this.nogPartieAnnexes.tabFiles.splice(this.draggedIndex, 1);
      this.nogPartieAnnexes.tabFiles.splice(dropIndex, 0, draggedFile);
      this.setChangeIntoAnnexe();
    }
  }

  onDragEnd(event: DragEvent): void {
    this.draggedIndex = null;
  }

  selectedDiligences: TabDiligence[] = [];
  showDiligenceDropdown = false;

  private searchSubject = new Subject<string>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private pdfService: PdfService,
    private route: ActivatedRoute
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
        // Gérer les paramètres URL
        this.route.queryParams.subscribe(params => {
          const dossier = params['dossier'];
          const mission = params['mission'];
          const millesime = params['millesime'];

          if (dossier && mission && millesime) {
            this.waitForDataAndValidate(dossier, mission, millesime);
          }
        });
      }
    });

    // Écouter les changements d'impersonation
    this.authService.impersonatedEmail$.subscribe(() => {
      this.userEmail = this.authService.getEffectiveUserEmail();
      if(this.userEmail) {
        this.dossiersLoaded = false
        this.isLoadingAllDossiers = false;
        this.loadAllDossiers();
      }
    });
  }

  ngOnDestroy(): void {
    Object.keys(this.debounceTimers).forEach(key => {
      if (this.debounceTimers[key]) {
        clearTimeout(this.debounceTimers[key]);
      }
    });
  }

  private debounceLog(key: string, logFn: () => void, delay: number = 3000): void {
    if (this.debounceTimers[key]) {
      clearTimeout(this.debounceTimers[key]);
    }
    this.debounceTimers[key] = setTimeout(() => {
      logFn();
      delete this.debounceTimers[key];
    }, delay);
  }

  setChangeIntoContact(): void {
    this.isSavingNog = true;
    this.debounceLog('contact', () => {
      console.log('Modification dans Contact (partie 1.2):', this.nogPartie1.contacts);
      this.insertNogContacts();
      this.nogPartie1.dateLastUpdateContacts = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Contacts',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoAssocie(): void {
    this.isSavingNog = true;
    this.debounceLog('associe', () => {
      console.log('Modification dans Associés (partie 1.3):', this.nogPartie1.associes);
      this.insertNogAssocies();
      this.nogPartie1.dateLastUpdateAssocies = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Associes',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoCS(): void {
    this.isSavingNog = true;
    this.debounceLog('cs', () => {
      console.log('Modification dans Chiffres Significatifs (partie 1.4):', this.nogPartie1.chiffresSignificatifs);
      this.insertNogCS();
      this.nogPartie1.dateLastUpdateCS = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Chiffres significatifs',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoActiviteHisto(): void {
    this.isSavingNog = true;
    this.debounceLog('activiteHisto', () => {
      console.log('Modification dans Activité Historique (partie 1.5):', this.nogPartie1.activiteExHisto);
      this.insertNogModuleTexte('MyNogVU_PRESDOSSIER_ActiviteExHisto', 'MyNogVU_PRESDOSSIER_DateLastModifActiviteExHisto', this.nogPartie1.activiteExHisto);
      this.nogPartie1.dateLastUpdateActiviteExHisto = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Activite historique',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoLettreMission(): void {
    this.isSavingNog = true;
    this.debounceLog('lettreMission', () => {
      console.log('Modification dans Lettre de Mission (partie 2.1):', {
        dateMiseAJour: this.nogPartie2.dateMiseAJour,
        montantHonoraire: this.nogPartie2.montantHonoraire
      });
      this.insertNogValue('MyNogVU_PRESMISSION_DateMAJLM', 'MyNogVU_PRESMISSION_DateLastModifLettreMission', this.nogPartie2.dateMiseAJour);
      this.insertNogValue('MyNogVU_PRESMISSION_MontantHonoraires', 'MyNogVU_PRESMISSION_DateLastModifLettreMission', this.nogPartie2.montantHonoraire.toString());
      this.nogPartie2.dateLastUpdateLettreMission = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Lettre mission',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoTypeMission(): void {
    this.isSavingNog = true;
    this.debounceLog('typeMission', () => {
      console.log('Modification dans Type de Mission (partie 2.2):', this.nogPartie2.typeMission);
      this.insertNogValue('MyNogVU_PRESMISSION_TypeMission', 'MyNogVU_PRESMISSION_DateLastModifTypeMission', this.nogPartie2.typeMission);
      this.nogPartie2.dateLastUpdateTypeMission = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Type mission',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoNatureMission(): void {
    this.isSavingNog = true;
    this.debounceLog('natureMission', () => {
      console.log('Modification dans Nature de Mission (partie 2.3):', this.nogPartie2.natureMission);
      this.insertNogValue('MyNogVU_PRESMISSION_NatureMission', 'MyNogVU_PRESMISSION_DateLastModifNatureMission', this.nogPartie2.natureMission);
      this.nogPartie2.dateLastUpdateNatureMission = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Nature mission',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoPlanning(): void {
    this.isSavingNog = true;
    this.debounceLog('planning', () => {
      console.log('Modification dans Planning (partie 2.4):', this.nogPartie2.planning);
      this.insertNogValue('MyNogVU_PRESMISSION_ConsultAutresPro', 'MyNogVU_PRESMISSION_DateLastModifPlanning', this.nogPartie2.consultationPro);
      this.insertNogValue('MyNogVU_PRESMISSION_Interim', 'MyNogVU_PRESMISSION_DateLastModifPlanning', this.nogPartie2.interim);
      this.insertNogValue('MyNogVU_PRESMISSION_Final', 'MyNogVU_PRESMISSION_DateLastModifPlanning', this.nogPartie2.final);
      this.insertNogValue('MyNogVU_PRESMISSION_DelaiARespecter', 'MyNogVU_PRESMISSION_DateLastModifPlanning', this.nogPartie2.delaiRespecter);
      this.insertNogPlanning();
      this.nogPartie2.dateLastUpdatePlanning = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Contact',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoEquipeInter(): void {
    this.isSavingNog = true;
    this.debounceLog('equipeInter', () => {
      console.log('Modification dans Équipe Intervention (partie 2.5):', this.nogPartie2.equipeInter);
      this.insertNogEquipeInter();
      this.nogPartie2.dateLastUpdateEquipeInter = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Equipe intervention',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoPrecisionTravaux(): void {
    this.isSavingNog = true;
    this.debounceLog('precisionTravaux', () => {
      console.log('Modification dans Précision des Travaux (partie 2.6):', this.nogPartie2.precisionTravaux);
      this.insertNogModuleTexte('MyNogVU_PRESMISSION_PrecisionTravaux', 'MyNogVU_PRESMISSION_DateLastModifPrecisionTravaux', this.nogPartie2.precisionTravaux);
      this.nogPartie2.dateLastUpdatePrecisionTravaux = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Precision travaux',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoLogiciel(): void {
    this.isSavingNog = true;
    this.debounceLog('logiciel', () => {
      console.log('Modification dans Logiciels (partie 3.1):', {
        tabLogicielGT: this.nogPartie3.tabLogicielGT,
        tabLogicielClient: this.nogPartie3.tabLogicielClient
      });
      this.insertNogLogiciel();
      this.nogPartie3.dateLastUpdateLogiciel = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Logiciel',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoOrgaServiceAdmin(): void {
    this.isSavingNog = true;
    this.debounceLog('orgaServiceAdmin', () => {
      console.log('Modification dans Organisation Service Admin (partie 3.2):', this.nogPartie3.orgaServiceAdmin);
      this.insertNogModuleTexte('MyNogVU_ORGAADMINCOMPTA_OrgaServiceAdmin', 'MyNogVU_ORGAADMINCOMPTA_DateLastModifOrgaServiceAdmin', this.nogPartie3.orgaServiceAdmin);
      this.nogPartie3.dateLastUpdateOrgaServiceAdmin = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Organisation service admin',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoSyntheseEntretien(): void {
    this.isSavingNog = true;
    this.debounceLog('syntheseEntretien', () => {
      console.log('Modification dans Synthèse Entretien (partie 3.4):', this.nogPartie3.syntheseEntretienDir);
      this.insertNogModuleTexte('MyNogVU_ORGAADMINCOMPTA_SyntheseEntretien', 'MyNogVU_ORGAADMINCOMPTA_DateLastModifSyntheseEntretien', this.nogPartie3.syntheseEntretienDir);
      this.nogPartie3.dateLastUpdateSyntheseEntretien = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Synthese entretien',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoVigilance(): void {
    this.isSavingNog = true;
    this.debounceLog('vigilance', () => {
      console.log('Modification dans Vigilance (partie 4.1):', {
        checkboxVigilance: this.nogPartie4.checkboxVigilance,
        appreciationRisqueVigilence: this.nogPartie4.appreciationRisqueVigilence
      });
      this.insertNogVigilance();
      this.nogPartie4.dateLastUpdateVigilance = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Vigilance',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoPrincipeComp(): void {
    this.isSavingNog = true;
    this.debounceLog('principeComp', () => {
      console.log('Modification dans Principes Comptables (partie 4.2):', {
        aspectsComptables: this.nogPartie4.aspectsComptables,
        aspectsFiscaux: this.nogPartie4.aspectsFiscaux,
        aspectsSociaux: this.nogPartie4.aspectsSociaux,
        aspectsJuridiques: this.nogPartie4.aspectsJuridiques,
        comptesAnnuels: this.nogPartie4.comptesAnnuels
      });
      this.insertNogModuleTexte('MyNogVU_ZONERISQUE_AspectsComptables', 'MyNogVU_ZONERISQUE_DateLastModifPrincipeComp', this.nogPartie4.aspectsComptables);
      this.insertNogModuleTexte('MyNogVU_ZONERISQUE_AspectsFiscaux', 'MyNogVU_ZONERISQUE_DateLastModifPrincipeComp', this.nogPartie4.aspectsFiscaux);
      this.insertNogModuleTexte('MyNogVU_ZONERISQUE_AspectsSociaux', 'MyNogVU_ZONERISQUE_DateLastModifPrincipeComp', this.nogPartie4.aspectsSociaux);
      this.insertNogModuleTexte('MyNogVU_ZONERISQUE_AspectsJuridiques', 'MyNogVU_ZONERISQUE_DateLastModifPrincipeComp', this.nogPartie4.aspectsJuridiques);
      this.insertNogModuleTexte('MyNogVU_ZONERISQUE_ComptesAnnuels', 'MyNogVU_ZONERISQUE_DateLastModifPrincipeComp', this.nogPartie4.comptesAnnuels);
      this.nogPartie4.dateLastUpdatePrincipeComp = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Principes comptables',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoSeuil(): void {
    this.isSavingNog = true;
    this.debounceLog('seuil', () => {
      console.log('Modification dans Seuil (partie 4.3):', this.nogPartie4.seuil);
      this.insertNogValue('MyNogVU_ZONERISQUE_Seuil', 'MyNogVU_ZONERISQUE_DateLastModifSeuil', this.nogPartie4.seuil.toString());
      this.nogPartie4.dateLastUpdateSeuil = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Seuil',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoDiligance(): void {
    this.isSavingNog = true;
    this.debounceLog('diligance', () => {
      console.log('Modification dans Diligences (partie 5):', this.nogPartie5.diligence);
      this.insertNogDiligence();
      this.insertNogDiligenceAdd();
      this.nogPartie5.dateLastUpdateDiligence = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Diligence',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoDiliganceLab(): void {
    this.isSavingNog = true;
    this.debounceLog('diliganceLab', () => {
      console.log('Modification dans Diligences LAB (partie 5):', this.nogPartie5.diligenceLab);
      this.insertNogDiligenceLab();
      this.nogPartie5.dateLastUpdateDiligenceLab = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Diligence lab',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoRestitutionClient(): void {
    this.isSavingNog = true;
    this.debounceLog('restitutionClient', () => {
      console.log('Modification dans Restitution Client (partie 6):', {
        checkboxEtage1: this.nogPartie6.checkboxEtage1,
        checkboxEtage2: this.nogPartie6.checkboxEtage2,
        libelleAutreEtage1: this.nogPartie6.libelleAutreEtage1,
        libelleAutreEtage2: this.nogPartie6.libelleAutreEtage2,
        commGeneral: this.nogPartie6.commGeneral
      });

      this.insertNogValue('MyNogVU_RESTCLIENT_ChoixRestClient', 'MyNogVU_RESTCLIENT_DateLastModifRestClient', this.nogPartie6.checkboxEtage1);
      this.insertNogValue('MyNogVU_RESTCLIENT_ChoixOutil', 'MyNogVU_RESTCLIENT_DateLastModifRestClient', this.nogPartie6.checkboxEtage2);
      this.insertNogValue('MyNogVU_RESTCLIENT_LibelleAutreOutil', 'MyNogVU_RESTCLIENT_DateLastModifRestClient', this.nogPartie6.libelleAutreEtage2 ?? '');
      this.insertNogValue('MyNogVU_RESTCLIENT_LibelleAutreRestClient', 'MyNogVU_RESTCLIENT_DateLastModifRestClient', this.nogPartie6.libelleAutreEtage1 ?? '');
      this.insertNogModuleTexte('MyNogVU_RESTCLIENT_CommGeneral', 'MyNogVU_RESTCLIENT_DateLastModifRestClient', this.nogPartie6.commGeneral);
      this.nogPartie6.dateLastUpdateRestitutionClient = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Restitution client',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoFE(): void {
    this.isSavingNog = true;
    this.debounceLog('fe', () => {
      console.log('Modification dans FE (partie 3):', {
        commentaireFE: this.nogPartie3.commentaireFE
      });

      this.insertNogModuleTexte('MyNogVU_ORGAADMINCOMPTA_CommentaireFE', 'MyNogVU_ORGAADMINCOMPTA_DateLastModifFE', this.nogPartie3.commentaireFE);
      this.nogPartie3.dateLastUpdateFE = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'FE',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoDeontologie(): void {
    this.isSavingNog = true;
    this.debounceLog('deontologie', () => {
      console.log('Modification dans Déontologie (partie 7):', {
        checkboxFormInit: this.nogPartie7.checkboxFormInit,
        libelleFormInit: this.nogPartie7.libelleFormInit,
        checkboxFormAnn: this.nogPartie7.checkboxFormAnn,
        libelleFormAnn: this.nogPartie7.libelleFormAnn,
        checkboxConflictCheck: this.nogPartie7.checkboxConflictCheck,
        libelleConflictCheck: this.nogPartie7.libelleConflictCheck
      });
      this.insertNogValue('MyNogVU_DEONTOLOGIE_Coche1', 'MyNogVU_DEONTOLOGIE_DateLastModifCoche', this.nogPartie7.checkboxFormInit ? 'Oui' : 'Non');
      this.insertNogValue('MyNogVU_DEONTOLOGIE_Coche2', 'MyNogVU_DEONTOLOGIE_DateLastModifCoche', this.nogPartie7.checkboxFormAnn ? 'Oui' : 'Non');
      this.insertNogValue('MyNogVU_DEONTOLOGIE_Coche3', 'MyNogVU_DEONTOLOGIE_DateLastModifCoche', this.nogPartie7.checkboxConflictCheck ? 'Oui' : 'Non');
      this.nogPartie7.dateLastUpdateDeontologie = this.getDateNow();
      this.checkConditionValidation();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Deontologie',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  setChangeIntoAnnexe(): void {
    this.isSavingNog = true;
    this.debounceLog('annexe', () => {
      console.log('Modification dans Annexes:', this.nogPartieAnnexes.tabFiles);
      this.insertNogFileAnnexe();
      this.nogPartieAnnexes.dateLastUpdateAnnexe = this.getDateNow();
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Fichiers annexes',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
      setTimeout(() => {
        this.isSavingNog = false;
      }, 2000);
    });
  }

  selectDossier(dossier: Dossier): void {
    this.selectedDossier = dossier;
    this.selectedDossierDisplay = `${dossier.DOS_PGI.trim()} - ${dossier.DOS_NOM.trim()}`;
    this.showDossierDropdown = false;
    this.filteredDossiers = [];
    
    // Réinitialiser les sélections suivantes
    this.selectedMission = '';
    this.selectedMillesime = '';
    this.isProfilAssocie = false;
    this.selectedProfilId = 0;
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

  getCodeAffaireSelected(): string {
    if (!this.selectedDossier) return '';
    
    const listeMission = this.allMissionsData.filter(
      item => item.DOS_PGI === this.selectedDossier!.DOS_PGI &&
        item.MD_MISSION === this.selectedMission &&
        item.MD_MILLESIME === this.selectedMillesime
    );

    let codeAffaire = '';

    listeMission.forEach(item => {
      if(item.DOS_PGI === this.selectedDossier!.DOS_PGI &&
        item.MD_MISSION === this.selectedMission &&
        item.MD_MILLESIME === this.selectedMillesime) {
          codeAffaire = item.CODE_AFFAIRE;
          this.isProfilAssocie = item.PROFIL == '1';
          this.selectedProfilId = parseInt(item.PROFIL);
          console.log('CODE_AFFAIRE', item.CODE_AFFAIRE);
        }      
    });
    
    return codeAffaire;
  }

  onMissionChange(): void {
    // Réinitialiser le millésime
    this.selectedMillesime = '';
    this.isProfilAssocie = false;
    this.selectedProfilId = 0;
    
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
    this.selectedCodeAffaire = this.getCodeAffaireSelected();

    this.getModuleFiles(this.selectedCodeAffaire, this.selectedProfilId.toString());
  }

  canValidate(): boolean {
    return !!(this.selectedDossier && this.selectedMission && this.selectedMillesime);
  }

  shouldShowValidateButton(): boolean {
    if (!this.selectedMission || !this.selectedMillesime) {
      return false;
    }

    const missionStartsWith21Or22 = this.selectedMission.startsWith('21') || this.selectedMission.startsWith('22');

    if (!missionStartsWith21Or22) {
      return false;
    }

    const currentYear = new Date().getFullYear();
    const millesimeYear = parseInt(this.selectedMillesime, 10);

    return millesimeYear >= currentYear;
  }

  selectedFileName: string = '';

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFileName = file.name;
      this.selectedFileNog = file;

      this.sendModuleFile('NOG', this.usrMailCollab, file, this.selectedCodeAffaire, 'Mission');
      this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'encours');
    }
  }

  loadNogDataFromFile(nogData: any): void {
    this.isDossierMissionMillesimeSelected = true;
    this.isAllDataNogLoaded = false;

    setTimeout(() => {
      if (nogData.partie1) this.nogPartie1 = nogData.partie1;
      if (nogData.partie2) this.nogPartie2 = nogData.partie2;
      if (nogData.partie3) this.nogPartie3 = nogData.partie3;
      if (nogData.partie4) this.nogPartie4 = nogData.partie4;
      if (nogData.partie5) this.nogPartie5 = nogData.partie5;
      if (nogData.partieAnnexes) this.nogPartieAnnexes = nogData.partieAnnexes;

      this.isAllDataNogLoaded = true;
    }, 500);
  }

  validateSelection(): void {
    if (!this.canValidate()) return;
    
    console.log('Sélection validée:', {
      dossier: this.selectedDossier,
      mission: this.selectedMission,
      millesime: this.selectedMillesime
    });

    this.selectedCodeAffaire = this.getCodeAffaireSelected();
    console.log('CODE_AFFAIRE RETURN',this.selectedCodeAffaire);

    this.isDossierMissionMillesimeSelected = true;

    this.verifNogLoad().then(verifNog => {
      if(verifNog.length == 0) {
        this.loadCoordonnees();
        this.loadContacts();
        this.loadChiffresSignificatifs();
        this.loadAssocies();
        this.loadTypeMissionNatureNog();
        this.loadPlannings();
        this.loadEquipeInter();
        this.loadDiligencesDefault();
        this.loadDiligencesBibliotheque();
        this.loadMontantLogiciel();
        this.loadModuleFE();

        this.insertNogVigilance();

        this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'editing');

        this.dateLastUpdateNog = this.getDateNow();

        this.setLog({
          email : this.usrMailCollab,
          dosPgi: this.selectedDossier?.DOS_PGI,
          modif: 'Initialisation formulaire',
          typeModif: 'NOG',
          module: 'NOG',
          champ: '',
          valeur: this.selectedCodeAffaire,
          periode: '',
          mailPriseProfil: this.userEmail
        });
      } else {
        this.loadContactMJNog();
        this.loadAssocieMJNog();
        this.loadPlanningMJNog();
        this.loadEquipeInterMJNog();
        this.loadLogicielMJNog();
        this.loadDiligenceMJNog();
        this.loadDiligenceLabMJNog();
        this.loadDiligencesBibliothequeMJNog();
        this.loadValeurUniqueNog();
        this.loadFichiersAnnexeMJNog();
      }
    }).catch(error => {
      console.error('Erreur lors de la vérification du NOG:', error);
    });
  }

  getSelectedMissionLabel(): string {
    const mission = this.availableMissions.find(m => m.MD_MISSION === this.selectedMission);
    return mission ? mission.LIBELLE_MISSIONS : '';
  }

  private async waitForDataAndValidate(dosPgi: string, mission: string, millesime: string): Promise<void> {
    let verif = false;
    this.loadAllDossiers().then(() => {
      this.allMissionsData.forEach(element => {
        if(element.DOS_PGI == dosPgi && element.MD_MISSION == mission && element.MD_MILLESIME == millesime) {
            this.selectedDossier = element;
            this.selectedDossierDisplay = dosPgi;
            this.selectedMission = mission;
            this.selectedMillesime = millesime;
            this.isProfilAssocie = element.PROFIL == '1';
            this.selectedProfilId = parseInt(element.PROFIL);
            this.validateSelection();
            verif = true;
        }
      });
      if(!verif) {
        iziToast.error({
          timeout: 3000,
          icon: 'fa-regular fa-triangle-exclamation', 
          title: 'Vous n\'avez pas accès à cette mission.', 
          close: false, 
          position: 'bottomCenter', 
          transitionIn: 'flipInX',
          transitionOut: 'flipOutX'
        });
      }
    });
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

  setLog(obj: any) {
    console.log('Envoi du log:', this.usrMailCollab);

    this.http.post(`${environment.apiUrl}/logs/setLog`, obj)
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
      this.isProfilAssocie = false;
      this.selectedProfilId = 0;
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
        if(response.count == 0) {
          this.isCollabHasMissions = false;
        } else {
          this.isCollabHasMissions = true;
        }
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

  verifNogLoad(): Promise<any[]> {
    console.log('CODE AFFAIRE VERIF',this.selectedCodeAffaire);
    return new Promise((resolve, reject) => {
      this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/verifNogLoad/${this.selectedCodeAffaire}`)
      .subscribe({
        next: (response) => resolve(response.data),
        error: (error) => reject(error)
      });
    });
  }

  loadCoordonnees(): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getCoordonneesNog/${this.selectedDossier?.DOS_PGI}`)
    .subscribe({
      next: (response) => {
        this.nogPartie1.coordonnees.DOS_PGI = response.data[0].DOS_PGI;
        this.nogPartie1.coordonnees.DOS_NOM = response.data[0].DOS_NOM;
        this.nogPartie1.coordonnees.DOS_SIRET = response.data[0].DOS_SIRET;
        this.nogPartie1.coordonnees.DOS_ADRESSE = response.data[0].DOS_ADRESSE + ' ' + response.data[0].DOS_CP + ' ' + response.data[0].DOS_VILLE;
        this.nogPartie1.coordonnees.NAF_LIBELLE = response.data[0].NAF_LIBELLE;
        this.nogPartie1.coordonnees.NAF_ID = response.data[0].NAF_ID;
        this.nogPartie1.dateLastUpdateCoordonnees = this.getDateNow();
        this.isCoordonneesLoaded = true;
        this.checkIdAllDataLoaded();
        console.log('NOG PARTIE 1',this.nogPartie1);
        this.insertNogCoordonnees();
      },
      error: () => {
      }
    });
  }

  loadContacts(): void {
    this.http.get<Contacts[]>(`${environment.apiUrlMyVision}/dossierDetail/getContactDossierForMyJourney/${this.selectedDossier?.DOS_PGI}`)
    .subscribe({
      next: (response) => {
        this.nogPartie1.contacts = response;
        this.nogPartie1.dateLastUpdateContacts = this.getDateNow();
        this.isContactsLoaded = true;
        this.checkIdAllDataLoaded();
        console.log('NOG PARTIE 1',this.nogPartie1);
        this.insertNogContacts();
      },
      error: () => {
      }
    });
  }

  loadChiffresSignificatifs(): void {
    this.http.get<ChiffresSignificatifs[]>(`${environment.apiUrlMyVision}/dossierDetail/getChiffresSignificatifsNogMyJourney/${this.selectedDossier?.DOS_PGI}`)
    .subscribe({
      next: (response) => {
        if(response.length == 0) {
          this.nogPartie1.chiffresSignificatifs[0].dosPgi = this.selectedDossier?.DOS_PGI ?? '';
          this.nogPartie1.chiffresSignificatifs[1].dosPgi = this.selectedDossier?.DOS_PGI ?? '';
        } else {
          let index = 0;
          response.forEach(element => {
            this.nogPartie1.chiffresSignificatifs[index].dosPgi = element.dosPgi;
            this.nogPartie1.chiffresSignificatifs[index].datePeriode = this.formatDate(element.datePeriode);
            this.nogPartie1.chiffresSignificatifs[index].dureeExercice = element.dureeExercice;
            this.nogPartie1.chiffresSignificatifs[index].effectif = element.effectif;
            this.nogPartie1.chiffresSignificatifs[index].capitauxPropres = element.capitauxPropres;
            this.nogPartie1.chiffresSignificatifs[index].bilanNet = element.bilanNet;
            this.nogPartie1.chiffresSignificatifs[index].ca = element.ca;
            this.nogPartie1.chiffresSignificatifs[index].beneficePerte = element.beneficePerte;
            index++;
          });
          // this.nogPartie1.chiffresSignificatifs = response;
        }
        this.nogPartie1.dateLastUpdateCS = this.getDateNow();
        this.isChiffresSignificatifsLoaded = true;
        this.checkIdAllDataLoaded();
        console.log('NOG PARTIE 1',this.nogPartie1);
        this.insertNogCS();
      },
      error: () => {
      }
    });
  }

  loadAssocies(): void {
    this.http.get<Associes[]>(`${environment.apiUrlMyVision}/dossierDetail/getAssocieNogMyJourney/${this.selectedDossier?.DOS_PGI}`)
    .subscribe(response => {
      this.nogPartie1.associes = response;
      this.nogPartie1.dateLastUpdateAssocies = this.getDateNow();
      this.isAssociesLoaded = true;
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 1',this.nogPartie1);
      this.insertNogAssocies();
    });
  }

  loadTypeMissionNatureNog(): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getTypeMissionNatureNog`)
    .subscribe(response => {
      for (let mission of response.data) {
        if (this.selectedMission.startsWith(mission.CodeMission)) {
          this.nogPartie2.typeMission = mission.TypeMission;
          this.nogPartie2.natureMission = mission.NatureMission;
        }
      }

      this.objTypeNatureMission = response.data;
      this.isTypeMissionNatureLoaded = true;
      this.nogPartie2.dateLastUpdateTypeMission = this.getDateNow();
      this.nogPartie2.dateLastUpdateNatureMission = this.getDateNow();
      this.checkIdAllDataLoaded();
      console.log('response.data',response.data);
      this.insertNogTypeMission();
      this.insertNogNatureMission();
    });
  }

  loadPlannings(): void {
    this.http.get<Planning[]>(`${environment.apiUrlMyVision}/dossierDetail/getPlanningNogMyJourney/${this.selectedDossier?.DOS_PGI}&${this.selectedMission}&${this.selectedMillesime}`)
    .subscribe({
      next: (response) => {
        let data = this.transformDataPlanning(response);
        if(response[0].nom != null){
          this.nogPartie2.planning = data;
        }
        this.isPlanningsLoaded = true;
        this.nogPartie2.dateLastUpdatePlanning = this.getDateNow();
        this.listeLibPlanningSauv = data[0].listeLib;
        this.checkIdAllDataLoaded();
        console.log('NOG PARTIE 2',this.nogPartie2);
        this.insertNogPlanning();
      },
      error: () => {
      }
    });
  }

  loadEquipeInter(): void {
    this.http.get<EquipeInter>(`${environment.apiUrlMyVision}/dossierDetail/getEquipeInterNogMyJourney/${this.selectedDossier?.DOS_PGI}&${this.selectedMission}&${this.selectedMillesime}`)
    .subscribe({
      next: (response) => {
        let obj = Object(response);
        obj.isEditingRespMission = false;
        obj.isEditingDmcm = false;
        obj.isEditingFactureur = false;

        let tab : EquipeInter[] = [];
        tab.push(obj);
        this.nogPartie2.equipeInter = tab;
        this.isEquipeInterLoaded = true;
        this.nogPartie2.dateLastUpdateEquipeInter = this.getDateNow();
        this.checkIdAllDataLoaded();
        console.log('NOG PARTIE 2',this.nogPartie2);
        this.insertNogEquipeInter();
      },
      error: () => {
      }
    });
  }

  loadModuleFE(): void {
    this.http.get<any>(`${environment.apiUrlMyVision}/dossierDetail/getModuleFENog/${this.selectedDossier?.DOS_PGI}`)
    .subscribe({
      next: (response) => {
        if(response.nonValide == 'nonValide') {
          this.nogPartie3.isFEValidate = false;
        } else {
          this.nogPartie3.eInvoicing = response.eInvoicing;
          this.nogPartie3.eReportingPaiement = response.eReportingPaiement;
          this.nogPartie3.eReportingTransaction = response.eReportingTransaction;
          this.nogPartie3.casGestion = response.casGestion;
          this.nogPartie3.mailEnvoi = response.envoiMail;
          this.nogPartie3.signatureMandat = response.signatureMandat;
          // this.nogPartie3.businessDev = [response.bd1, response.bd2, response.bd3, response.bd4, response.bd5,
          //   response.bd6, response.bd7, response.bd8, response.bd9, response.bd10
          // ];
          this.nogPartie3.isFEValidate = true;
        }
        this.isModuleFELoaded = true;
        this.nogPartie3.dateLastUpdateFE = this.getDateNow();
        this.checkIdAllDataLoaded();
        console.log('response',response);
        this.insertNogFE();
        this.checkConditionValidation();
      },
      error: () => {
      }
    });
  }

  loadDiligencesDefault(): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getListeDiligenceDefault`)
    .subscribe(response => {
      let data = this.transformDataDiligence(response.data);
      this.isDiligencesDefaultLoaded = true;
      this.nogPartie5.dateLastUpdateDiligence = this.getDateNow();
      this.checkIdAllDataLoaded();
      this.nogPartie5.diligence = data;
      console.log('this.nogPartie5',this.nogPartie5);
      this.insertNogDiligence();
    });
  }

  loadDiligencesBibliotheque(): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getListeDiligenceBibliotheque`)
    .subscribe(response => {
      let data = this.transformDataDiligenceBibliotheque(response.data);
      this.isDiligencesBibliothequeLoaded = true;
      this.checkIdAllDataLoaded();
      this.nogPartie5.diligenceAdd = data;
    });
  }

  loadMontantLogiciel(): void {
    this.http.get<any[]>(`${environment.apiUrlMyVision}/dossierDetail/getMontantLogicielNogMyJourney/${this.selectedDossier?.DOS_PGI}&${this.selectedMission}&${this.selectedMillesime}`)
    .subscribe(response => {
      this.nogPartie3.tabLogicielGT = [];
      response.forEach(element => {
        this.nogPartie3.tabLogicielGT.push(
          {
            type: element.type,
            logiciel: element.logiciel,
            montant: element.cout,
            isEditing: false
          }
        )
      });
      this.isMontantLogicielLoaded = true;
      this.nogPartie3.dateLastUpdateLogiciel = this.getDateNow();
      this.checkIdAllDataLoaded();
      console.log('NOG PARTIE 3',this.nogPartie3);
      this.insertNogLogiciel();
    });
  }

  checkIdAllDataLoaded(): void {
    if(this.isCoordonneesLoaded && this.isContactsLoaded && this.isChiffresSignificatifsLoaded && this.isAssociesLoaded
      && this.isEquipeInterLoaded && this.isPlanningsLoaded && this.isTypeMissionNatureLoaded
      && this.isMontantLogicielLoaded && this.isModuleFELoaded
      && this.isDiligencesDefaultLoaded && this.isDiligencesBibliothequeLoaded) {
      this.isAllDataNogLoaded = true;
      setTimeout(() => {
        this.initializeSelectedDiligences();
      }, 100);
    }
  }

  checkIdAllDataMJLoaded(): void {
    if(this.isValeurUniqueLoaded && this.isTypeMissionNatureLoaded && this.isPlanningsLoaded && this.isEquipeInterLoaded && this.isContactsLoaded
      && this.isAssociesLoaded && this.isMontantLogicielLoaded && this.isDiligencesDefaultLoaded && this.isDiligenceLabLoaded && this.isDiligenceAddLoaded
      && this.isDiligencesBibliothequeLoaded && this.isFichiersAnnexeLoaded
    ) {
      this.isAllDataNogLoaded = true;
      setTimeout(() => {
        this.loadContentIntoEditors();
        this.initializeSelectedDiligences();
      }, 100);
    }
  }

  initializeSelectedDiligences(): void {
    this.selectedDiligences = [];

    if (!this.nogPartie5.diligenceAdd || !this.nogPartie5.diligence) {
      return;
    }

    this.nogPartie5.diligenceAdd.forEach(diligenceAdd => {
      const existsInDiligence = this.nogPartie5.diligence.some(groupe =>
        groupe.tabDiligence.some(dil => dil.diligence === diligenceAdd.diligence)
      );

      if (existsInDiligence) {
        this.selectedDiligences.push(diligenceAdd);
      }
    });
  }

  checkConditionValidation(): void {
    if(this.nogPartie3.isFEValidate && this.nogPartie7.checkboxFormInit && this.nogPartie7.checkboxFormAnn && this.nogPartie7.checkboxConflictCheck) {
      this.isNogCanBeValidate = true;
    } else {
      this.isNogCanBeValidate = false;
    }
  }

  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return '';

    // Rounding to 2 decimal places
    const roundedValue = Math.round(value * 100) / 100;

    // Split integer and decimal parts
    let parts = roundedValue.toString().split('.');

    // Format integer part with thousand separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // Combine the parts back with a comma separator for the decimal part
    let formattedValue = parts.join(',');

    // Ensure two decimals: add zeros if necessary
    if (parts.length > 1 && parts[1].length < 2) {
      formattedValue += '0';
    } else if (parts.length === 1) {
      // If there is no decimal part, add ",00"
      formattedValue += ',00';
    }

    return formattedValue;
  }

  formatDate(value: string): string {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  }

  toggleEditContact(index: number): void {
    this.nogPartie1.contacts[index].isEditing = !this.nogPartie1.contacts[index].isEditing;
    if (!this.nogPartie1.contacts[index].isEditing) {
      this.setChangeIntoContact();
    }
  }

  toggleEditRespMission(): void {
    this.nogPartie2.equipeInter[0].isEditingRespMission = !this.nogPartie2.equipeInter[0].isEditingRespMission;
    if (!this.nogPartie2.equipeInter[0].isEditingRespMission) {
      this.setChangeIntoEquipeInter();
    }
  }

  toggleEditDmcm(): void {
    this.nogPartie2.equipeInter[0].isEditingDmcm = !this.nogPartie2.equipeInter[0].isEditingDmcm;
    if (!this.nogPartie2.equipeInter[0].isEditingDmcm) {
      this.setChangeIntoEquipeInter();
    }
  }

  toggleEditFactureur(): void {
    this.nogPartie2.equipeInter[0].isEditingFactureur = !this.nogPartie2.equipeInter[0].isEditingFactureur;
    if (!this.nogPartie2.equipeInter[0].isEditingFactureur) {
      this.setChangeIntoEquipeInter();
    }
  }

  toggleEditLogicielGT(index: number): void {
    this.nogPartie3.tabLogicielGT[index].isEditing = !this.nogPartie3.tabLogicielGT[index].isEditing;
    if (!this.nogPartie3.tabLogicielGT[index].isEditing) {
      this.setChangeIntoLogiciel();
    }
  }

  toggleEditLogicielClient(index: number): void {
    this.nogPartie3.tabLogicielClient[index].isEditing = !this.nogPartie3.tabLogicielClient[index].isEditing;
    if (!this.nogPartie3.tabLogicielClient[index].isEditing) {
      this.setChangeIntoLogiciel();
    }
  }

  deleteContact(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
      this.nogPartie1.contacts.splice(index, 1);
      this.setChangeIntoContact();
    }
  }

  deleteLogicielGT(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce logiciel ?')) {
      this.nogPartie3.tabLogicielGT.splice(index, 1);
      this.setChangeIntoLogiciel();
    }
  }

  deleteLogicielClient(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce logiciel ?')) {
      this.nogPartie3.tabLogicielClient.splice(index, 1);
      this.setChangeIntoLogiciel();
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
    this.setChangeIntoContact();
  }

  addPlanning(): void {
    this.nogPartie2.planning.push({
      nom: '',
      fonction: '',
      totalCollab: 0,
      listeLib: this.listeLibPlanningSauv,
      listeValue: Array(this.listeLibPlanningSauv.length).fill(0),
      isEditing: true
    });
    this.setChangeIntoPlanning();
  }

  addLogicielGT(): void {
    this.nogPartie3.tabLogicielGT.push({
      type: '',
      logiciel: '',
      montant: 0,
      isEditing: true
    });
    this.setChangeIntoLogiciel();
  }

  addLogicielClient(): void {
    this.nogPartie3.tabLogicielClient.push({
      type: '',
      logiciel: '',
      isEditing: true
    });
    this.setChangeIntoLogiciel();
  }

  toggleEditAssocie(index: number): void {
    this.nogPartie1.associes[index].isEditing = !this.nogPartie1.associes[index].isEditing;
    if (!this.nogPartie1.associes[index].isEditing) {
      this.setChangeIntoAssocie();
    }
  }

  deleteAssocie(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet associé ?')) {
      this.nogPartie1.associes.splice(index, 1);
      this.setChangeIntoAssocie();
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
    this.setChangeIntoAssocie();
  }

  updateVariations(): void {
    // Cette fonction sera appelée automatiquement lors de la modification des inputs
    this.setChangeIntoCS();
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
    const newContent = target.innerHTML || '';

    this.nogPartie1.activiteExHisto = newContent;
    this.setChangeIntoActiviteHisto();
  }

  onEditorContentChangePrecisionTravaux(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie2.precisionTravaux = newContent;
    this.setChangeIntoPrecisionTravaux();
  }

  onEditorContentChangeOrgaServiceAdmin(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie3.orgaServiceAdmin = newContent;
    this.setChangeIntoOrgaServiceAdmin();
  }

  onEditorContentChangeSyntheseEntretienDir(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie3.syntheseEntretienDir = newContent;
    this.setChangeIntoSyntheseEntretien();
  }

  onEditorContentChangeAppreciationRisqueVigilence(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie4.appreciationRisqueVigilence = newContent;
    this.setChangeIntoVigilance();
  }

  onEditorContentChangeAspectsComptables(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie4.aspectsComptables = newContent;
    this.setChangeIntoPrincipeComp();
  }

  onEditorContentChangeAspectsFiscaux(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie4.aspectsFiscaux = newContent;
    this.setChangeIntoPrincipeComp();
  }

  onEditorContentChangeAspectsSociaux(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie4.aspectsSociaux = newContent;
    this.setChangeIntoPrincipeComp();
  }

  onEditorContentChangeAspectsJuridiques(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie4.aspectsJuridiques = newContent;
    this.setChangeIntoPrincipeComp();
  }

  onEditorContentChangeComptesAnnuels(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie4.comptesAnnuels = newContent;
    this.setChangeIntoPrincipeComp();
  }
  
  onEditorContentChangeCommGeneral(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie6.commGeneral = newContent;
    this.setChangeIntoRestitutionClient();
  }

  onEditorContentChangeCommentaireFE(event: Event): void {
    const target = event.target as HTMLElement;
    const newContent = target.innerHTML || '';

    this.nogPartie3.commentaireFE = newContent;
    this.setChangeIntoFE();
  }

  ngAfterViewInit(): void {
    // Initialiser le contenu de l'éditeur après le rendu
    const editorElement = document.querySelector('.editor-content') as HTMLElement;
    if (editorElement && this.nogPartie1.activiteExHisto) {
      editorElement.textContent = this.nogPartie1.activiteExHisto;
    }

    setTimeout(() => {
      this.initializeDiligenceCollapse();
      this.initializePrincipeCompCollapse();
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

  initializePrincipeCompCollapse(): void {
    const container = document.querySelector('#container-part-4-2-nog');
    if (!container) return;

    const contentDivs = container.querySelectorAll('.container-content-principe-comp');
    contentDivs.forEach(content => {
      (content as HTMLElement).style.display = 'none';
    });

    const rowTitles = container.querySelectorAll('.row-title-principe-comp');
    rowTitles.forEach(rowTitle => {
      rowTitle.addEventListener('click', this.togglePrincipeComp.bind(this));
    });
  }

  togglePrincipeComp(event: Event): void {
    const rowTitle = event.currentTarget as HTMLElement;
    const container = rowTitle.closest('.container-editeur-principe-comp');
    if (!container) return;

    const contentDiv = container.querySelector('.container-content-principe-comp') as HTMLElement;
    const icon = rowTitle.querySelector('.icon-collapse-principe-comp i');

    if (!contentDiv) return;

    if (contentDiv.style.display === 'none') {
      contentDiv.style.display = 'block';
      if (icon) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
      }
    } else {
      contentDiv.style.display = 'none';
      if (icon) {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
      }
    }
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
    this.setChangeIntoTypeMission();
  }

  toggleDiligenceDropdown(): void {
    this.showDiligenceDropdown = !this.showDiligenceDropdown;
  }

  isDiligenceSelected(diligence: TabDiligence): boolean {
    return this.selectedDiligences.some(d => d.diligence === diligence.diligence);
  }

  isManualDiligence(diligenceCode: string): boolean {
    // console.log('diligenceCode', diligenceCode)
    const isInAddMan = this.diligenceAddMan.some(d => d.diligence === diligenceCode);
    
    const isInBib = this.diligenceBib.some(d => d.diligence === diligenceCode);
    // console.log('isInAddMan', isInAddMan)
    // console.log('isInBib', isInBib)
    // console.log('return', isInAddMan && !isInBib)
    // console.log('--------------------------------')
    return isInAddMan && !isInBib;
    // return this.diligenceAddMan.some(d => d.diligence === diligenceCode);
  }

  toggleDiligenceSelection(diligence: TabDiligence): void {
    const index = this.selectedDiligences.findIndex(d => d.diligence === diligence.diligence);
    console.log('diligence', diligence);
    if (index > -1) {
      this.selectedDiligences.splice(index, 1);
      this.removeDiligenceFromNog(diligence);
    } else {
      this.selectedDiligences.push(diligence);
      this.addDiligenceToNog(diligence);
    }
  }

  addDiligenceToNog(diligence: TabDiligence): void {
    const groupe = diligence.cycle;
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
      this.sortDiligenceTabDiligence(groupeObj);
    }
    this.setChangeIntoDiligance();
  }

  removeDiligenceFromNog(diligence: TabDiligence): void {
    const groupe = diligence.cycle;
    const groupeObj = this.nogPartie5.diligence.find(d => d.groupe === groupe);

    if (groupeObj) {
      const index = groupeObj.tabDiligence.findIndex(d => d.diligence === diligence.diligence);
      if (index > -1) {
        groupeObj.tabDiligence.splice(index, 1);
        if (groupeObj.tabDiligence.length > 0) {
          this.sortDiligenceTabDiligence(groupeObj);
        }
      }

      if (groupeObj.tabDiligence.length === 0) {
        const groupeIndex = this.nogPartie5.diligence.findIndex(d => d.groupe === groupe);
        if (groupeIndex > -1) {
          this.nogPartie5.diligence.splice(groupeIndex, 1);
        }
      }
    }
    this.setChangeIntoDiligance();
  }

  toggleEditPlanning(index: number): void {
    this.nogPartie2.planning[index].isEditing = !this.nogPartie2.planning[index].isEditing;
    if (!this.nogPartie2.planning[index].isEditing) {
      this.setChangeIntoPlanning();
    }
  }

  deletePlanning(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne de planning ?')) {
      this.nogPartie2.planning.splice(index, 1);
      this.setChangeIntoPlanning();
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
    if (value === '4') {
      setTimeout(() => {
        this.initializePrincipeCompCollapse();
      }, 0);
    }

    if (value === '1' || value === '2' || value === '3' || value === '4' || value === '6') {
      setTimeout(() => {
        this.loadContentIntoEditors();
      }, 0);
    }
  }

  openApercuPopup(): void {
    this.showApercuPopup = true;
  }

  closeApercuPopup(): void {
    this.showApercuPopup = false;
  }

  addDiligenceManuelle(): void {
    this.newDiligence = {
      cycle: '',
      diligence: '',
      titre: '',
      objectif: '',
      activation: true
    };
    this.showAddDiligenceModal = true;
  }

  closeAddDiligenceModal(): void {
    this.showAddDiligenceModal = false;
  }

  validateNewDiligence(): void {
    if (!this.newDiligence.cycle || !this.newDiligence.diligence || !this.newDiligence.titre) {
      alert('Veuillez remplir au minimum les champs "Cycle", "Diligence" et "Titre"');
      return;
    }

    const newDiligenceCopy = {
      ...this.newDiligence,
      objectif: this.newDiligence.objectif.replace(/\n/g, '<br>')
    };
    this.nogPartie5.diligenceAdd.push(newDiligenceCopy);
    this.selectedDiligences.push(newDiligenceCopy);
    this.addDiligenceToNog(newDiligenceCopy);
    this.showAddDiligenceModal = false;
    this.setChangeIntoDiligance();
  }

  addDiligenceLabManuelle(): void {
    this.newDiligenceLab = {
      cycle: '',
      diligence: '',
      titre: '',
      objectif: '',
      activation: true
    };
    this.showAddDiligenceLabModal = true;
  }

  closeAddDiligenceLabModal(): void {
    this.showAddDiligenceLabModal = false;
  }

  validateNewDiligenceLab(): void {
    if (!this.newDiligenceLab.cycle || !this.newDiligenceLab.diligence || !this.newDiligenceLab.titre) {
      alert('Veuillez remplir au minimum les champs "Cycle", "Diligence" et "Titre"');
      return;
    }

    const newDiligenceLabCopy = {
      ...this.newDiligenceLab,
      objectif: this.newDiligenceLab.objectif.replace(/\n/g, '<br>')
    };
    this.nogPartie5.diligenceLab.push(newDiligenceLabCopy);
    this.sortDiligenceLab();
    this.showAddDiligenceLabModal = false;
    this.setChangeIntoDiliganceLab();
  }

  isGroupeActivated(diligence: Diligence): boolean {
    if (!diligence.tabDiligence || diligence.tabDiligence.length === 0) {
      return true;
    }
    return diligence.tabDiligence.some(d => d.activation);
  }

  sortDiligenceTabDiligence(groupeObj: Diligence): void {
    groupeObj.tabDiligence.sort((a, b) => {
      return a.diligence.localeCompare(b.diligence);
    });
  }

  sortAllDiligenceGroups(): void {
    this.nogPartie5.diligence.forEach(groupe => {
      this.sortDiligenceTabDiligence(groupe);
    });
  }

  sortDiligenceLab(): void {
    this.nogPartie5.diligenceLab.sort((a, b) => {
      return a.diligence.localeCompare(b.diligence);
    });
  }

  toggleGroupeActivation(diligence: Diligence, event: Event): void {
    if(this.nogPartieAnnexes.validationAssocie) {
      event.preventDefault();
      iziToast.error({
        timeout: 3000,
        icon: 'fa-regular fa-triangle-exclamation',
        title: 'Impossible de modifier car vous êtes en lecture seule.',
        close: false,
        position: 'bottomCenter',
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
      return;
    }
    if (!diligence.tabDiligence || diligence.tabDiligence.length === 0) {
      event.preventDefault();
      return;
    }
    const anyActivated = this.isGroupeActivated(diligence);
    diligence.tabDiligence.forEach(d => d.activation = !anyActivated);
    this.setChangeIntoDiligance();
  }

  onDiligenceActivationChange(): void {
    // Trigger change detection for groupe toggle switches
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

  transformDataPlanning(obj: any[]): Planning[] {
    return obj.map((item, index) => {
        const listeLib = Object.keys(item).filter(key => key !== 'nom' && key !== 'fonction');
        const listeValue = listeLib.map(lib => item[lib]);
        const totalCollab = listeValue.filter(value => value !== "").reduce((sum, value) => sum + parseFloat(value), 0);
        return {
            id: Date.now() + index,
            nom: item.nom,
            fonction: item.fonction,
            totalCollab : totalCollab,
            listeLib,
            listeValue,
            isEditing: false
        };
    });
  }

  replaceNameLibelleListeLib(value: string): string {
    let trim =value.split('-')[1];
    let annee = value.split('-')[0];
    return trim+' '+annee.substring(2,4);
  }

  mathCeil(value: any): number {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : Math.ceil(num);
  }

  transformDataDiligence(data: any[]): Diligence[] {
    const diligenceMap: { [key: string]: Diligence } = {};
    
    data.forEach(item => {
      if (!diligenceMap[item.GROUPE]) {
        diligenceMap[item.GROUPE] = {
          groupe: item.GROUPE,
          libelleGroupe: item.GROUPELIBELLE,
          tabDiligence: []
        };
      }

      diligenceMap[item.GROUPE].tabDiligence.push({
        cycle: item.GROUPE,
        diligence: item.DILIGENCE,
        titre: item.TITRE,
        activation: true,
        objectif: item.OBJECTIF
      });
    });

    return Object.values(diligenceMap);
  }

  transformDataDiligenceBibliotheque(data: any[]): TabDiligence[] {
    let objReturn: TabDiligence[] = [];
    let obj = Object();
    
    data.forEach(item => {
      obj = {
        cycle: item.GROUPE,
        diligence: item.DILIGENCE,
        titre: item.TITRE,
        activation: true,
        objectif: item.OBJECTIF
      }
      objReturn.push(obj);
    });

    return objReturn;
  }

  updateCheckboxDeontologie(checkbox: string): void {
    console.log('nogPartie7', this.nogPartie7);
    this.setChangeIntoDeontologie();
  }

  updateCheckboxRestClient(checkbox: string): void {
    if(checkbox == 'PPT'  && this.nogPartie6.checkboxEtage1 == 'PPT') {
      this.nogPartie6.checkboxEtage1 = '';
    } else if(checkbox == 'OutilReport' && this.nogPartie6.checkboxEtage1 == 'OutilReport') {
      this.nogPartie6.checkboxEtage1 = '';
    } else if(checkbox == 'Autre' && this.nogPartie6.checkboxEtage1 == 'Autre') {
      this.nogPartie6.checkboxEtage1 = '';
    } else {
      this.nogPartie6.checkboxEtage1 = checkbox;
    }
    console.log('nogPartie6', this.nogPartie6);
    this.setChangeIntoRestitutionClient();
  }

  updateCheckboxRestClientOutil(checkbox: string): void {
    if(checkbox == 'Emasphere'  && this.nogPartie6.checkboxEtage2 == 'Emasphere') {
      this.nogPartie6.checkboxEtage2 = '';
    } else if(checkbox == 'PowerBI' && this.nogPartie6.checkboxEtage2 == 'PowerBI') {
      this.nogPartie6.checkboxEtage2 = '';
    } else if(checkbox == 'Autre' && this.nogPartie6.checkboxEtage2 == 'Autre') {
      this.nogPartie6.checkboxEtage2 = '';
    } else {
      this.nogPartie6.checkboxEtage2 = checkbox;
    }
    console.log('nogPartie6', this.nogPartie6);
    this.setChangeIntoRestitutionClient();
  }

  updateCheckboxVigilance(checkbox: string): void {
    if(checkbox == 'Normal'  && this.nogPartie6.checkboxEtage2 == 'Normal') {
      this.nogPartie4.checkboxVigilance = '';
    } else if(checkbox == 'Renforcee' && this.nogPartie6.checkboxEtage2 == 'Renforcee') {
      this.nogPartie4.checkboxVigilance = '';
    } else {
      this.nogPartie4.checkboxVigilance = checkbox;
    }
    console.log('nogPartie4', this.nogPartie4);
    this.setChangeIntoVigilance();
  }

  formatDateTimeBDD(input: string): string {
    if(input == null || input == '') {
      return '';
    }
    const date = new Date(input);

    const day = ('0' + date.getUTCDate()).slice(-2);
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2); // getUTCMonth() retourne 0 pour janvier, donc on ajoute 1
    const year = date.getUTCFullYear();
    
    const hours = ('0' + date.getUTCHours()).slice(-2);
    const minutes = ('0' + date.getUTCMinutes()).slice(-2);

    return `${day}/${month}/${year} ${hours}:${minutes}`;
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

  getDateNow(): string {
    const now = new Date();

    // Ajoute un zéro devant les nombres inférieurs à 10
    const pad = (n: number) => n < 10 ? '0' + n : n;

    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1); // Les mois commencent à zéro
    const year = now.getFullYear();
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  insertNogCoordonnees(): void {
    let obj = {
      'codeAffaire': this.selectedCodeAffaire,
      'nomSociete': this.nogPartie1.coordonnees.DOS_NOM,
      'adresse': this.nogPartie1.coordonnees.DOS_ADRESSE,
      'siret': this.nogPartie1.coordonnees.DOS_SIRET,
      'codeAPE': this.nogPartie1.coordonnees.NAF_ID,
      'libelleAPE': this.nogPartie1.coordonnees.NAF_LIBELLE,
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogCoordonnees`, obj)
    .subscribe(response => {
      console.log('insertNogCoordonnees',response);
    });
  }

  insertNogContacts(): void {
    let obj: any[] = [];

    if(this.nogPartie1.contacts.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie1.contacts.forEach(contact => {
        obj.push({
          codeAffaire: this.selectedCodeAffaire,
          prenom: contact.prenom,
          nom: contact.nom,
          fonction: contact.libelle,
          telephone: contact.telephone,
          adresseMail: contact.mail
        })
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogContacts`, obj)
    .subscribe(response => {
      console.log('insertNogContacts',response);
    });
  }

  insertNogAssocies(): void {
    let obj: any[] = [];

    if(this.nogPartie1.associes.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie1.associes.forEach(associe => {
        obj.push({
          codeAffaire: this.selectedCodeAffaire,
          nom: associe.nom,
          nbTitres: associe.nbPart.toString(),
          montantCapital: associe.partCapital.toString(),
          pourcDetention: associe.pourcPart.toString()
        })
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogAssocies`, obj)
    .subscribe(response => {
      console.log('insertNogAssocies',response);
    });
  }

  insertNogCS(): void {
    let obj = {
      'codeAffaire': this.selectedCodeAffaire,
      'libelleN1': this.nogPartie1.chiffresSignificatifs[0].datePeriode,
      'nbMoisN1': this.nogPartie1.chiffresSignificatifs[0].dureeExercice,
      'effectifN1': this.nogPartie1.chiffresSignificatifs[0].effectif,
      'capitauxPropresN1': this.nogPartie1.chiffresSignificatifs[0].capitauxPropres,
      'bilanN1': this.nogPartie1.chiffresSignificatifs[0].bilanNet,
      'caN1': this.nogPartie1.chiffresSignificatifs[0].ca,
      'resultatN1': this.nogPartie1.chiffresSignificatifs[0].beneficePerte,
      'libelleN2': this.nogPartie1.chiffresSignificatifs[1].datePeriode,
      'nbMoisN2': this.nogPartie1.chiffresSignificatifs[1].dureeExercice,
      'effectifN2': this.nogPartie1.chiffresSignificatifs[1].effectif,
      'capitauxPropresN2': this.nogPartie1.chiffresSignificatifs[1].capitauxPropres,
      'bilanN2': this.nogPartie1.chiffresSignificatifs[1].bilanNet,
      'caN2': this.nogPartie1.chiffresSignificatifs[1].ca,
      'resultatN2': this.nogPartie1.chiffresSignificatifs[1].beneficePerte,
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogCS`, obj)
    .subscribe(response => {
      console.log('insertNogCS',response);
    });
  }

  insertNogTypeMission(): void {
    let obj = {
      'codeAffaire': this.selectedCodeAffaire,
      'typeMission': this.nogPartie2.typeMission
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogTypeMission`, obj)
    .subscribe(response => {
      console.log('insertNogTypeMission',response);
    });
  }

  insertNogNatureMission(): void {
    let obj = {
      'codeAffaire': this.selectedCodeAffaire,
      'natureMission': this.nogPartie2.natureMission
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogNatureMission`, obj)
    .subscribe(response => {
      console.log('insertNogNatureMission',response);
    });
  }

  insertNogPlanning(): void {
    let obj: any[] = [];

    if(this.nogPartie2.planning.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie2.planning.forEach(plan => {
        for(let i = 0; i < plan.listeLib.length; i++) {
          obj.push({
            codeAffaire: this.selectedCodeAffaire,
            fonction: plan.fonction,
            nom: plan.nom,
            periode: plan.listeLib[i],
            nbHeures: plan.listeValue[i] == "" ? "0" : plan.listeValue[i].toString()
          })
        }
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogPlanning`, obj)
    .subscribe(response => {
      console.log('insertNogPlanning',response);
    });
  }

  insertNogEquipeInter(): void {
    let obj: any[] = [];

    if(this.nogPartie2.equipeInter.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie2.equipeInter.forEach(equipe => {
        obj.push({
          codeAffaire: this.selectedCodeAffaire,
          fonction: 'DMCM',
          nom: equipe.dmcm,
          actif: equipe.dmcmStatut
        });

         obj.push({
          codeAffaire: this.selectedCodeAffaire,
          fonction: 'Responsable mission',
          nom: equipe.respMission,
          actif: equipe.respMissionStatut
        });

         obj.push({
          codeAffaire: this.selectedCodeAffaire,
          fonction: 'Factureur',
          nom: equipe.factureur,
          actif: equipe.factureurStatut
        })
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogEquipeInter`, obj)
    .subscribe(response => {
      console.log('insertNogEquipeInter',response);
    });
  }

  insertNogLogiciel(): void {
    let obj: any[] = [];

    if(this.nogPartie3.tabLogicielClient.length == 0 && this.nogPartie3.tabLogicielGT.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie3.tabLogicielClient.forEach(logiciel => {
        obj.push({
          codeAffaire: this.selectedCodeAffaire,
          interneClient: 'Client',
          type: logiciel.type,
          outil: logiciel.logiciel
        })
      });
      this.nogPartie3.tabLogicielGT.forEach(logiciel => {
        obj.push({
          codeAffaire: this.selectedCodeAffaire,
          interneClient: 'Interne',
          type: logiciel.type,
          outil: logiciel.logiciel,
          cout: logiciel.montant?.toString()
        })
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogLogiciel`, obj)
    .subscribe(response => {
      console.log('insertNogLogiciel',response);
    });
  }

  insertNogFE(): void {
    let obj: { tableFE: Array<any>; uniqueFE: { codeAffaire: string, eInvoicing: string, eReportingPaiement: string, eReportingTransaction: string, casGestion: string, envoiMail: string, signatureMandat: string, commentaireFE: string } } = {
      tableFE: [],
      uniqueFE: {
        codeAffaire: this.selectedCodeAffaire,
        eInvoicing: '',
        eReportingPaiement: '',
        eReportingTransaction: '',
        casGestion: '',
        envoiMail: '',
        signatureMandat: '',
        commentaireFE: ''
      }
    };

    if(this.nogPartie3.isFEValidate == false) {
      obj.tableFE.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      let i = 0;
      this.listeBdFE.forEach(bd => {
        obj.tableFE.push({
          codeAffaire: this.selectedCodeAffaire,
          categorie: bd.categorie,
          mission: bd.libelle,
          outil: bd.logiciel,
          bd: this.nogPartie3.businessDev[i]
        });
        i++;
      });

      obj.uniqueFE.eInvoicing = this.nogPartie3.eInvoicing;
      obj.uniqueFE.eReportingPaiement = this.nogPartie3.eReportingPaiement;
      obj.uniqueFE.eReportingTransaction = this.nogPartie3.eReportingTransaction;
      obj.uniqueFE.casGestion = this.nogPartie3.casGestion;
      obj.uniqueFE.envoiMail = this.nogPartie3.mailEnvoi;
      obj.uniqueFE.signatureMandat = this.nogPartie3.signatureMandat;
      obj.uniqueFE.commentaireFE = this.nogPartie3.commentaireFE;
    }
    this.http.post(`${environment.apiUrl}/nogs/insertNogFE`, obj)
    .subscribe(response => {
      console.log('insertNogFE',response);
    });
  }

  insertNogVigilance(): void {
    let obj = {
      'codeAffaire': this.selectedCodeAffaire,
      'vigilance': this.nogPartie4.checkboxVigilance
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogVigilance`, obj)
    .subscribe(response => {
      console.log('insertNogVigilance',response);
    });
  }

  insertNogDiligence(): void {
    let obj: any[] = [];

    if(this.nogPartie5.diligence.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie5.diligence.forEach(dili => {
        dili.tabDiligence.forEach(d => {
          obj.push({
            codeAffaire: this.selectedCodeAffaire,
            cycle: dili.groupe,
            cycleLibelle: dili.libelleGroupe,
            codeDiligence: d.diligence,
            titreDiligence: d.titre,
            activation: d.activation ? 'Oui' : 'Non',
            objectif: d.objectif
          })
        });
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogDiligence`, obj)
    .subscribe(response => {
      console.log('insertNogDiligence',response);
    });
  }

  insertNogModuleTexte(colonne: string, colonneDate: string, texte: string): void {
    let obj = {
      'codeAffaire': this.selectedCodeAffaire,
      'texte': texte,
      'colonne': colonne,
      'colonneDate': colonneDate
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogModuleTexte`, obj)
    .subscribe(response => {
      console.log('insertNogModuleTexte',response);
    });
  }

  insertNogValue(colonne: string, colonneDate: string, value: string): void {
    let obj = {
      'codeAffaire': this.selectedCodeAffaire,
      'value': value,
      'colonne': colonne,
      'colonneDate': colonneDate
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogValue`, obj)
    .subscribe(response => {
      console.log('insertNogValue',response);
    });
  }

  insertNogFileAnnexe(): void {
    let obj: any[] = [];
    
    if (this.nogPartieAnnexes.tabFiles.length == 0) {
      obj.push({ codeAffaire: this.selectedCodeAffaire });
      this.http.post(`${environment.apiUrl}/nogs/insertNogFileAnnexe`, obj)
        .subscribe(response => {
          console.log('insertNogFileAnnexe', response);
        });
    } else {
      let order = 1;
      let filePromises = this.nogPartieAnnexes.tabFiles.map(f => {
        return new Promise<void>((resolve, reject) => {
          let reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => {
            let base64File = '';
            let fileName = '';
            if (reader.result) {
              base64File = (reader.result as string).split(',')[1];
              fileName = f.name;
            }
            obj.push({
              codeAffaire: this.selectedCodeAffaire,
              titre: fileName,
              file: base64File,
              order: order.toString()
            });
            order++
            resolve();
          };
          reader.onerror = (error) => {
            reject(error);
          };
        });
      });

      Promise.all(filePromises).then(() => {
        this.http.post(`${environment.apiUrl}/nogs/insertNogFileAnnexe`, obj)
          .subscribe(response => {
            console.log('insertNogFileAnnexe', response);
          });
      }).catch(error => {
        console.error('Error while reading files', error);
      });
    }
  }

  insertNogDiligenceAdd(): void {
    let obj: any[] = [];

    if(this.nogPartie5.diligenceAdd.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie5.diligenceAdd.forEach(dili => {
          obj.push({
            codeAffaire: this.selectedCodeAffaire,
            cycle: dili.cycle,
            codeDiligence: dili.diligence,
            titreDiligence: dili.titre,
            objectif: dili.objectif
          })
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogDiligenceAdd`, obj)
    .subscribe(response => {
      console.log('insertNogDiligenceAdd',response);
    });
  }

  insertNogDiligenceLab(): void {
    let obj: any[] = [];

    if(this.nogPartie5.diligenceLab.length == 0) {
      obj.push({codeAffaire: this.selectedCodeAffaire});
    } else {
      this.nogPartie5.diligenceLab.forEach(dili => {
          obj.push({
            codeAffaire: this.selectedCodeAffaire,
            cycle: dili.cycle,
            cycleLibelle: '',
            codeDiligence: dili.diligence,
            titreDiligence: dili.titre,
            activation: dili.activation ? 'Oui' : 'Non',
            objectif: dili.objectif
          })
      });
    }

    this.http.post(`${environment.apiUrl}/nogs/insertNogDiligenceLab`, obj)
    .subscribe(response => {
      console.log('insertNogDiligenceLab',response);
    });
  }

  loadValeurUniqueNog(): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getListeValeurUnique/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      for (let key of response.data) {
        //PARTIE 1
        //1.1
        this.nogPartie1.coordonnees.DOS_NOM = key.MyNogVU_PRESDOSSIER_NomSociete;
        this.nogPartie1.coordonnees.DOS_ADRESSE = key.MyNogVU_PRESDOSSIER_Adresse;
        this.nogPartie1.coordonnees.DOS_SIRET = key.MyNogVU_PRESDOSSIER_Siret;
        this.nogPartie1.coordonnees.NAF_ID = key.MyNogVU_PRESDOSSIER_CodeApe;
        this.nogPartie1.coordonnees.NAF_LIBELLE = key.MyNogVU_PRESDOSSIER_LibelleApe;
        this.nogPartie1.dateLastUpdateCoordonnees = this.formatDateTimeBDD(key.MyNogVU_PRESDOSSIER_DateLastModifCoordonnees);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESDOSSIER_DateLastModifCoordonnees), this.dateLastUpdateNog);
         
        //1.4
        this.nogPartie1.chiffresSignificatifs[0].datePeriode = key.MyNogVU_PRESDOSSIER_LibelleExN1;
        this.nogPartie1.chiffresSignificatifs[0].dureeExercice = key.MyNogVU_PRESDOSSIER_NbMoisExN1;
        this.nogPartie1.chiffresSignificatifs[0].effectif = key.MyNogVU_PRESDOSSIER_EffectifN1;
        this.nogPartie1.chiffresSignificatifs[0].capitauxPropres = key.MyNogVU_PRESDOSSIER_CapitauxPropresN1;
        this.nogPartie1.chiffresSignificatifs[0].bilanNet = key.MyNogVU_PRESDOSSIER_BilanN1;
        this.nogPartie1.chiffresSignificatifs[0].ca = key.MyNogVU_PRESDOSSIER_CAN1;
        this.nogPartie1.chiffresSignificatifs[0].beneficePerte = key.MyNogVU_PRESDOSSIER_ResultatNetN1;
        this.nogPartie1.chiffresSignificatifs[1].datePeriode = key.MyNogVU_PRESDOSSIER_LibelleExN2;
        this.nogPartie1.chiffresSignificatifs[1].dureeExercice = key.MyNogVU_PRESDOSSIER_NbMoisExN2;
        this.nogPartie1.chiffresSignificatifs[1].effectif = key.MyNogVU_PRESDOSSIER_EffectifN2;
        this.nogPartie1.chiffresSignificatifs[1].capitauxPropres = key.MyNogVU_PRESDOSSIER_CapitauxPropresN2;
        this.nogPartie1.chiffresSignificatifs[1].bilanNet = key.MyNogVU_PRESDOSSIER_BilanN2;
        this.nogPartie1.chiffresSignificatifs[1].ca = key.MyNogVU_PRESDOSSIER_CAN2;
        this.nogPartie1.chiffresSignificatifs[1].beneficePerte = key.MyNogVU_PRESDOSSIER_ResultatNetN2;
        this.nogPartie1.dateLastUpdateCS = this.formatDateTimeBDD(key.MyNogVU_PRESDOSSIER_DateLastModifChriffresSign);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESDOSSIER_DateLastModifChriffresSign), this.dateLastUpdateNog);
         
        //1.5
        this.nogPartie1.activiteExHisto = key.MyNogVU_PRESDOSSIER_ActiviteExHisto; //load dans l'editeur #editorContent
        this.nogPartie1.dateLastUpdateActiviteExHisto = this.formatDateTimeBDD(key.MyNogVU_PRESDOSSIER_DateLastModifActiviteExHisto);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESDOSSIER_DateLastModifActiviteExHisto), this.dateLastUpdateNog);

        //PARTIE 2
        //2.1
        this.nogPartie2.dateMiseAJour = this.formatDateInput(key.MyNogVU_PRESMISSION_DateMAJLM);
        this.nogPartie2.montantHonoraire = key.MyNogVU_PRESMISSION_MontantHonoraires;
        this.nogPartie2.dateLastUpdateLettreMission = this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifLettreMission);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifLettreMission), this.dateLastUpdateNog);
        
        //2.2
        // this.nogPartie2.typeMission = key.MyNogVU_PRESMISSION_TypeMission;
        this.nogPartie2.dateLastUpdateTypeMission = this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifTypeMission);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifTypeMission), this.dateLastUpdateNog);

        //2.3
        // this.nogPartie2.natureMission = key.MyNogVU_PRESMISSION_NatureMission;
        this.nogPartie2.dateLastUpdateNatureMission = this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifNatureMission);
        this.loadTypeMissionNatureListeNog(key.MyNogVU_PRESMISSION_TypeMission, key.MyNogVU_PRESMISSION_NatureMission);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifNatureMission), this.dateLastUpdateNog);

        //2.4
        this.nogPartie2.consultationPro = key.MyNogVU_PRESMISSION_ConsultAutresPro;
        this.nogPartie2.interim = key.MyNogVU_PRESMISSION_Interim;
        this.nogPartie2.final = key.MyNogVU_PRESMISSION_Final;
        this.nogPartie2.delaiRespecter = key.MyNogVU_PRESMISSION_DelaiARespecter;
        this.nogPartie2.dateLastUpdatePlanning = this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifPlanning);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifPlanning), this.dateLastUpdateNog);
         
        //2.6
        this.nogPartie2.precisionTravaux = key.MyNogVU_PRESMISSION_PrecisionTravaux; //load dans l'editeur #editorContentPrecisionTravaux
        this.nogPartie2.dateLastUpdatePrecisionTravaux = this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifPrecisionTravaux);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_PRESMISSION_DateLastModifPrecisionTravaux), this.dateLastUpdateNog);
         
        //PARTIE 3
        //3.2
        this.nogPartie3.orgaServiceAdmin = key.MyNogVU_ORGAADMINCOMPTA_OrgaServiceAdmin; //load dans l'editeur #editorContentOrgaServiceAdmin
        this.nogPartie3.dateLastUpdateOrgaServiceAdmin= this.formatDateTimeBDD(key.MyNogVU_ORGAADMINCOMPTA_DateLastModifOrgaServiceAdmin); 
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_ORGAADMINCOMPTA_DateLastModifOrgaServiceAdmin), this.dateLastUpdateNog);

        //3.3
        this.nogPartie3.eInvoicing = key.MyNogVU_ORGAADMINCOMPTA_EInvoicing;
        this.nogPartie3.eReportingTransaction = key.MyNogVU_ORGAADMINCOMPTA_EReportingTransaction;
        this.nogPartie3.eReportingPaiement = key.MyNogVU_ORGAADMINCOMPTA_EReportingPaiement;
        this.nogPartie3.casGestion = key.MyNogVU_ORGAADMINCOMPTA_CasGestion;
        this.nogPartie3.mailEnvoi = key.MyNogVU_ORGAADMINCOMPTA_MailEnvoiClient;
        this.nogPartie3.signatureMandat = key.MyNogVU_ORGAADMINCOMPTA_SignatureMandat;
        this.nogPartie3.commentaireFE = key.MyNogVU_ORGAADMINCOMPTA_CommentaireFE;
        if(key.MyNogVU_ORGAADMINCOMPTA_EInvoicing != '' || key.MyNogVU_ORGAADMINCOMPTA_EReportingTransaction != '' || key.MyNogVU_ORGAADMINCOMPTA_EReportingPaiement != '') {
          this.nogPartie3.isFEValidate = true;
        }
        this.nogPartie3.dateLastUpdateFE = this.formatDateTimeBDD(key.MyNogVU_ORGAADMINCOMPTA_DateLastModifFE);  
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_ORGAADMINCOMPTA_DateLastModifFE), this.dateLastUpdateNog);
         
        //3.4
        this.nogPartie3.syntheseEntretienDir = key.MyNogVU_ORGAADMINCOMPTA_SyntheseEntretien; //load dans l'editeur #editorContentSyntheseEntretienDir
        this.nogPartie3.dateLastUpdateSyntheseEntretien = this.formatDateTimeBDD(key.MyNogVU_ORGAADMINCOMPTA_DateLastModifSyntheseEntretien); 
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_ORGAADMINCOMPTA_DateLastModifSyntheseEntretien), this.dateLastUpdateNog);

        //PARTIE 4
        //4.1
        this.nogPartie4.checkboxVigilance = key.MyNogVU_ZONERISQUE_Vigilance;
        this.nogPartie4.dateLastUpdateVigilance = this.formatDateTimeBDD(key.MyNogVU_ZONERISQUE_DateLastModifVigilance); 
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_ZONERISQUE_DateLastModifVigilance), this.dateLastUpdateNog);
         
        //4.2
        this.nogPartie4.aspectsComptables = key.MyNogVU_ZONERISQUE_AspectsComptables; //load dans l'editeur #editorContentAspectsComptables
        this.nogPartie4.aspectsFiscaux = key.MyNogVU_ZONERISQUE_AspectsFiscaux; //load dans l'editeur #editorContentAspectsFiscaux
        this.nogPartie4.aspectsSociaux = key.MyNogVU_ZONERISQUE_AspectsSociaux; //load dans l'editeur #editorContentAspectsSociaux
        this.nogPartie4.aspectsJuridiques = key.MyNogVU_ZONERISQUE_AspectsJuridiques; //load dans l'editeur #editorContentAspectsJuridiques
        this.nogPartie4.comptesAnnuels = key.MyNogVU_ZONERISQUE_ComptesAnnuels; //load dans l'editeur #editorContentComptesAnnuels
        this.nogPartie4.dateLastUpdatePrincipeComp = this.formatDateTimeBDD(key.MyNogVU_ZONERISQUE_DateLastModifPrincipeComp); 
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_ZONERISQUE_DateLastModifPrincipeComp), this.dateLastUpdateNog);
         
        //4.3
        this.nogPartie4.seuil = key.MyNogVU_ZONERISQUE_Seuil;
        this.nogPartie4.dateLastUpdateSeuil = this.formatDateTimeBDD(key.MyNogVU_ZONERISQUE_DateLastModifSeuil); 
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_ZONERISQUE_DateLastModifSeuil), this.dateLastUpdateNog);
         
        //PARTIE 6
        this.nogPartie6.checkboxEtage1 = key.MyNogVU_RESTCLIENT_ChoixRestClient;
        this.nogPartie6.checkboxEtage2 = key.MyNogVU_RESTCLIENT_ChoixOutil;
        this.nogPartie6.libelleAutreEtage1 = key.MyNogVU_RESTCLIENT_LibelleAutreRestClient;
        this.nogPartie6.libelleAutreEtage2 = key.MyNogVU_RESTCLIENT_LibelleAutreOutil;
        this.nogPartie6.commGeneral = key.MyNogVU_RESTCLIENT_CommGeneral;
        this.nogPartie6.dateLastUpdateRestitutionClient = this.formatDateTimeBDD(key.MyNogVU_RESTCLIENT_DateLastModifRestClient);
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_RESTCLIENT_DateLastModifRestClient), this.dateLastUpdateNog); 
         
        //PARTIE 7
        this.nogPartie7.checkboxFormInit = key.MyNogVU_DEONTOLOGIE_Coche1 == 'Oui';
        this.nogPartie7.checkboxFormAnn = key.MyNogVU_DEONTOLOGIE_Coche2 == 'Oui';
        this.nogPartie7.checkboxConflictCheck = key.MyNogVU_DEONTOLOGIE_Coche3 == 'Oui';
        this.nogPartie7.dateLastUpdateDeontologie = this.formatDateTimeBDD(key.MyNogVU_DEONTOLOGIE_DateLastModifCoche); 
        this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(key.MyNogVU_DEONTOLOGIE_DateLastModifCoche), this.dateLastUpdateNog);

        //PARTIE ANNEXE
        this.nogPartieAnnexes.validationCollab = key.MyNogVU_ANNEXE_ValidationCollab == 'Oui';
        this.nogPartieAnnexes.validationAssocie = key.MyNogVU_ANNEXE_ValidationAssocie == 'Oui';
      }

      console.log('nogPartie1', this.nogPartie1);
      console.log('nogPartie2', this.nogPartie2);
      console.log('nogPartie3', this.nogPartie3);
      console.log('nogPartie4', this.nogPartie4);
      console.log('nogPartie6', this.nogPartie6);
      console.log('nogPartie7', this.nogPartie7);
      this.isValeurUniqueLoaded = true;
      this.checkIdAllDataMJLoaded();
      console.log('response.data',response.data);
      this.checkConditionValidation();
    });
  }

  loadContentIntoEditors(): void {
    const editorContent = document.querySelector('#editorContent') as HTMLElement;
    console.log('editorContent', editorContent)
    console.log('this.nogPartie1.activiteExHisto', this.nogPartie1.activiteExHisto)
    if (editorContent && this.nogPartie1.activiteExHisto) {
      editorContent.innerHTML = this.nogPartie1.activiteExHisto;
    }

    const editorContentPrecisionTravaux = document.querySelector('#editorContentPrecisionTravaux') as HTMLElement;
    if (editorContentPrecisionTravaux && this.nogPartie2.precisionTravaux) {
      editorContentPrecisionTravaux.innerHTML = this.nogPartie2.precisionTravaux;
    }

    const editorContentOrgaServiceAdmin = document.querySelector('#editorContentOrgaServiceAdmin') as HTMLElement;
    if (editorContentOrgaServiceAdmin && this.nogPartie3.orgaServiceAdmin) {
      editorContentOrgaServiceAdmin.innerHTML = this.nogPartie3.orgaServiceAdmin;
    }

    const editorContentSyntheseEntretienDir = document.querySelector('#editorContentSyntheseEntretienDir') as HTMLElement;
    if (editorContentSyntheseEntretienDir && this.nogPartie3.syntheseEntretienDir) {
      editorContentSyntheseEntretienDir.innerHTML = this.nogPartie3.syntheseEntretienDir;
    }

    const editorContentAspectsComptables = document.querySelector('#editorContentAspectsComptables') as HTMLElement;
    if (editorContentAspectsComptables && this.nogPartie4.aspectsComptables) {
      editorContentAspectsComptables.innerHTML = this.nogPartie4.aspectsComptables;
    }

    const editorContentAspectsFiscaux = document.querySelector('#editorContentAspectsFiscaux') as HTMLElement;
    if (editorContentAspectsFiscaux && this.nogPartie4.aspectsFiscaux) {
      editorContentAspectsFiscaux.innerHTML = this.nogPartie4.aspectsFiscaux;
    }

    const editorContentAspectsSociaux = document.querySelector('#editorContentAspectsSociaux') as HTMLElement;
    if (editorContentAspectsSociaux && this.nogPartie4.aspectsSociaux) {
      editorContentAspectsSociaux.innerHTML = this.nogPartie4.aspectsSociaux;
    }

    const editorContentAspectsJuridiques = document.querySelector('#editorContentAspectsJuridiques') as HTMLElement;
    if (editorContentAspectsJuridiques && this.nogPartie4.aspectsJuridiques) {
      editorContentAspectsJuridiques.innerHTML = this.nogPartie4.aspectsJuridiques;
    }

    const editorContentComptesAnnuels = document.querySelector('#editorContentComptesAnnuels') as HTMLElement;
    if (editorContentComptesAnnuels && this.nogPartie4.comptesAnnuels) {
      editorContentComptesAnnuels.innerHTML = this.nogPartie4.comptesAnnuels;
    }

    const editorContentCommGeneral = document.querySelector('#editorContentCommGeneral') as HTMLElement;
    if (editorContentCommGeneral && this.nogPartie6.commGeneral) {
      editorContentCommGeneral.innerHTML = this.nogPartie6.commGeneral;
    }

    const editorContentCommentaireFE = document.querySelector('#editorContentCommentaireFE') as HTMLElement;
    if (editorContentCommentaireFE && this.nogPartie3.commentaireFE) {
      editorContentCommentaireFE.innerHTML = this.nogPartie3.commentaireFE;
    }
  }

  loadTypeMissionNatureListeNog(typeMission: string, natureMission: string): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getTypeMissionNatureNog`)
    .subscribe(response => {
      this.nogPartie2.typeMission = typeMission;
      this.nogPartie2.natureMission = natureMission;
      this.objTypeNatureMission = response.data;
      this.isTypeMissionNatureLoaded = true;
      this.checkIdAllDataMJLoaded();
      console.log('response.data',response.data);
    });
  }

  loadPlanningMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getPlanningMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      let data = this.transformDataPlanning(response.data.data);
      if(response.data.data.length != 0){
        this.nogPartie2.planning = data;
      }
      this.isPlanningsLoaded = true;
      this.nogPartie2.dateLastUpdatePlanning = this.formatDateTimeBDD(response.data.dateUpdate);
      this.listeLibPlanningSauv = data[0].listeLib;
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 2',this.nogPartie2);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadEquipeInterMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getEquipeInterMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      let obj = Object(response.data.data);
      obj.isEditingRespMission = false;
      obj.isEditingDmcm = false;
      obj.isEditingFactureur = false;

      let tab : EquipeInter[] = [];
      tab.push(obj); 
      this.nogPartie2.equipeInter = tab;
      this.isEquipeInterLoaded = true;
      this.nogPartie2.dateLastUpdateEquipeInter = this.formatDateTimeBDD(response.data.dateUpdate);
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 2',this.nogPartie2);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadContactMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getContactMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      this.nogPartie1.contacts = response.data.data;
      this.nogPartie1.dateLastUpdateContacts = this.formatDateTimeBDD(response.data.dateUpdate);
      this.isContactsLoaded = true;
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 1',this.nogPartie1);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadAssocieMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getAssocieMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      this.nogPartie1.associes = response.data.data;
      this.nogPartie1.dateLastUpdateAssocies = this.formatDateTimeBDD(response.data.dateUpdate);
      this.isAssociesLoaded = true;
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 1',this.nogPartie1);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadLogicielMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getLogicielMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      this.nogPartie3.tabLogicielGT = response.data.logicielGT;
      this.nogPartie3.tabLogicielClient = response.data.logicielClient;
      this.isMontantLogicielLoaded = true;
      this.nogPartie3.dateLastUpdateLogiciel = this.formatDateTimeBDD(response.data.dateUpdate);
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 3',this.nogPartie3);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadDiligenceMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getDiligenceMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      this.nogPartie5.diligence = response.data.data;
      this.sortAllDiligenceGroups();
      this.isDiligencesDefaultLoaded = true;
      this.nogPartie5.dateLastUpdateDiligence = this.formatDateTimeBDD(response.data.dateUpdate);
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 5',this.nogPartie5);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadDiligenceLabMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getDiligenceLabMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      this.nogPartie5.diligenceLab = response.data.data;
      this.sortDiligenceLab();
      this.isDiligenceLabLoaded = true;
      this.nogPartie5.dateLastUpdateDiligenceLab = this.formatDateTimeBDD(response.data.dateUpdate);
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 5',this.nogPartie5);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadDiligencesBibliothequeMJNog(): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getListeDiligenceBibliotheque`)
    .subscribe(response => {
      let data = this.transformDataDiligenceBibliotheque(response.data);
      this.isDiligencesBibliothequeLoaded = true;
      this.checkIdAllDataMJLoaded();
      response.data.forEach((element: any) => {
        this.diligenceBib.push(element);
      });
      this.nogPartie5.diligenceAdd = data;
      this.loadDiligenceAddMJNog();
    });
  }

  loadDiligenceAddMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getDiligenceAddMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      response.data.data.forEach((element: any) => {
        this.nogPartie5.diligenceAdd.push(element);
        this.diligenceAddMan.push(element);
      });
      this.isDiligenceAddLoaded = true;
      this.nogPartie5.dateLastUpdateDiligence = this.formatDateTimeBDD(response.data.dateUpdate);
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE 5',this.nogPartie5);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
  }

  loadFichiersAnnexeMJNog(): void {
    this.http.get<{ success: boolean; data: any; count: number; timestamp: string }>(`${environment.apiUrl}/nogs/getFichiersAnnexeMJNog/${this.selectedCodeAffaire}`)
    .subscribe(response => {
      response.data.data.forEach((element: any) => {
        this.nogPartieAnnexes.tabFiles.push(this.base64ToFile(element.file, element.titre));
      });
      this.isFichiersAnnexeLoaded = true;
      this.nogPartieAnnexes.dateLastUpdateAnnexe = this.formatDateTimeBDD(response.data.dateUpdate);
      this.checkIdAllDataMJLoaded();
      console.log('NOG PARTIE ANNEXE',this.nogPartieAnnexes);
      this.dateLastUpdateNog = this.getLaterDate(this.formatDateTimeBDD(response.data.dateUpdate), this.dateLastUpdateNog);
    });
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

  validateCollab(): void {
    if(this.nogPartieAnnexes.validationCollab) {
      this.nogPartieAnnexes.validationCollab = false;
      this.nogPartieAnnexes.validationAssocie = false;
      iziToast.success({
        timeout: 3000, 
        icon: 'fa-regular fa-thumbs-up', 
        title: 'Dévalidé avec succès !', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
      this.http.post(`${environment.apiUrl}/nogs/updateValidationCollab`, {validation: 'Non', codeAffaire: this.selectedCodeAffaire})
        .subscribe(response => {
          console.log('updateValidationCollab',response);
        });
      this.http.post(`${environment.apiUrl}/nogs/updateValidationAssocie`, {validation: 'Non', codeAffaire: this.selectedCodeAffaire})
        .subscribe(response => {
          console.log('updateValidationAssocie',response);
        });
      this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'editing');
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Devalide collab',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      return;
    }

    this.nogPartieAnnexes.validationCollab = true;
    this.http.post(`${environment.apiUrl}/nogs/updateValidationCollab`, {validation: 'Oui', codeAffaire: this.selectedCodeAffaire})
        .subscribe(response => {
          console.log('updateValidationCollab',response);
        });
    iziToast.success({
      timeout: 3000, 
      icon: 'fa-regular fa-thumbs-up', 
      title: 'Validation effectuée avec succès !', 
      close: false, 
      position: 'bottomCenter', 
      transitionIn: 'flipInX',
      transitionOut: 'flipOutX'
    });
    this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'collab');
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Validation collab',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
  }

  showToastValidationCollab(): void {
    if(!this.nogPartie3.isFEValidate) {
      iziToast.error({
        timeout: 3000,
        icon: 'fa-regular fa-triangle-exclamation', 
        title: 'Veuillez remplir la partie 3.3. Facturation électronique.', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
    }

    if(!this.nogPartie7.checkboxFormInit && !this.nogPartie7.checkboxFormAnn && !this.nogPartie7.checkboxConflictCheck) {
      iziToast.error({
        timeout: 3000,
        icon: 'fa-regular fa-triangle-exclamation', 
        title: 'Veuillez remplir la partie 7. Déontologie.', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
    }
  }

  validateAssocie(): void {
    if(!this.isProfilAssocie) {
      iziToast.error({
        timeout: 3000,
        icon: 'fa-regular fa-triangle-exclamation', 
        title: 'Vous n\'avez pas le profil d\'associé sur cette mission.', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
      return;
    }

    if(this.nogPartieAnnexes.validationAssocie) {
      this.nogPartieAnnexes.validationAssocie = false;
      iziToast.success({
        timeout: 3000, 
        icon: 'fa-regular fa-thumbs-up', 
        title: 'Dévalidé avec succès !', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
      this.http.post(`${environment.apiUrl}/nogs/updateValidationAssocie`, {validation: 'Non', codeAffaire: this.selectedCodeAffaire})
        .subscribe(response => {
          console.log('updateValidationAssocie',response);
        });
      this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'collab');
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Devalide associe',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
      return;
    }

    if(this.nogPartieAnnexes.validationCollab) {
      this.nogPartieAnnexes.validationAssocie = true;
      this.http.post(`${environment.apiUrl}/nogs/updateValidationAssocie`, {validation: 'Oui', codeAffaire: this.selectedCodeAffaire})
        .subscribe(response => {
          console.log('updateValidationAssocie',response);
        });
      iziToast.success({
        timeout: 3000, 
        icon: 'fa-regular fa-thumbs-up', 
        title: 'Validation effectuée avec succès !', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
      this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'associe');
      this.setLog({
        email : this.usrMailCollab,
        dosPgi: this.selectedDossier?.DOS_PGI,
        modif: 'Modification NOG',
        typeModif: 'NOG',
        module: 'NOG',
        champ: 'Validation associe',
        valeur: this.selectedCodeAffaire,
        periode: '',
        mailPriseProfil: this.userEmail
      });
    } else {
      iziToast.error({
        timeout: 3000,
        icon: 'fa-regular fa-triangle-exclamation', 
        title: 'Veuillez d\'abord validé la validation collaborateur.', 
        close: false, 
        position: 'bottomCenter', 
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX'
      });
    }
  }

  reloadFE() : void {
    if (this.isReloadingFE) return;
    this.isReloadingFE = true;
    this.isSavingNog = true;
    this.loadModuleFE();
    setTimeout(() => {
      this.isReloadingFE = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload FE',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  reloadLogiciel() : void {
    if (this.isReloadingLogiciel) return;
    this.isReloadingLogiciel = true;
    this.isSavingNog = true;
    this.loadMontantLogiciel();
    setTimeout(() => {
      this.isReloadingLogiciel = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload logiciel',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  reloadCoordonnee() : void {
    if (this.isReloadingCoordonnees) return;
    this.isReloadingCoordonnees = true;
    this.isSavingNog = true;
    this.loadCoordonnees();
    setTimeout(() => {
      this.isReloadingCoordonnees = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload coordonnees',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  reloadContact() : void {
    if (this.isReloadingContacts) return;
    this.isReloadingContacts = true;
    this.isSavingNog = true;
    this.loadContacts();
    setTimeout(() => {
      this.isReloadingContacts = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload contacts',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  reloadAssocie() : void {
    if (this.isReloadingAssocies) return;
    this.isReloadingAssocies = true;
    this.isSavingNog = true;
    this.loadAssocies();
    setTimeout(() => {
      this.isReloadingAssocies = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload associes',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  reloadCS() : void {
    if (this.isReloadingCS) return;
    this.isReloadingCS = true;
    this.isSavingNog = true;
    this.loadChiffresSignificatifs();
    setTimeout(() => {
      this.isReloadingCS = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload chiffres significatifs',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  reloadPlanning() : void {
    if (this.isReloadingPlanning) return;
    this.isReloadingPlanning = true;
    this.isSavingNog = true;
    this.loadPlannings();
    setTimeout(() => {
      this.isReloadingPlanning = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload planning',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  reloadEquipeInter() : void {
    if (this.isReloadingEquipeInter) return;
    this.isReloadingEquipeInter = true;
    this.isSavingNog = true;
    this.loadEquipeInter();
    setTimeout(() => {
      this.isReloadingEquipeInter = false;
    }, 5000);
    this.setLog({
      email : this.usrMailCollab,
      dosPgi: this.selectedDossier?.DOS_PGI,
      modif: 'Modification NOG',
      typeModif: 'NOG',
      module: 'NOG',
      champ: 'Reload equipe intervention',
      valeur: this.selectedCodeAffaire,
      periode: '',
      mailPriseProfil: this.userEmail
    });
    this.dateLastUpdateNog = this.getLaterDate(this.getDateNow(), this.dateLastUpdateNog);
    setTimeout(() => {
      this.isSavingNog = false;
    }, 2000);
  }

  getLaterDate(dateStr1: string, dateStr2: string): string {
    console.log('dateStr1',dateStr1)
    console.log('dateStr2',dateStr2)
    if(dateStr2 == '' || dateStr2 == null) {
      return dateStr1;
    }

    if(dateStr1 == '' || dateStr1 == null) {
      return dateStr2;
    }
    // Fonction utilitaire pour parser le format 'dd/MM/yyyy HH:mm'
    const parseDate = (dateStr: string): Date => {
      const [datePart, timePart] = dateStr.split(" ");
      const [day, month, year] = datePart.split("/").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    };

    // Fonction utilitaire pour reformater une Date en 'dd/MM/yyyy HH:mm'
    const formatDate = (date: Date): string => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const d1 = parseDate(dateStr1);
    const d2 = parseDate(dateStr2);

    // Retourne la date la plus grande
    return formatDate(d1 > d2 ? d1 : d2);
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

  removeFileNog(fileNumber: string): void {
    this.selectedFileNog = null;
    this.deleteModuleFile(fileNumber, this.usrMailCollab, 'Mission', this.selectedCodeAffaire, 'NOG');
    this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'non');
  }

  deleteModuleFile(fileId: String, email: String, source: String, missionIdDosPgiDosGroupe: String, module: String) {
    console.log('Suppression du fichier du module:', fileId);

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

  getModuleFiles(missionId: String, profilId: String): void {
    this.http.get<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/files/getModuleFiles/${missionId}&NOG&${profilId}&Mission`)
      .subscribe(response => {
        if(response.data[0].Base64_File != null) {
          console.log('getModuleFiles',response);
          this.selectedFileNog = this.base64ToFile(response.data[0].Base64_File, response.data[0].MODFILE_TITLE);
          this.selectedFileNogId = response.data[0].MODFILE_Id;
          this.selectedFileNogDate = this.formatDateInput(response.data[0].MODFILE_DateFichier);
        }
      });
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

      this.http.post<{ success: boolean; data: any[]; count: number; timestamp: string }>(`${environment.apiUrl}/files/setModuleFile`, moduleFile)
        .subscribe(response => {
         
          this.selectedFileNogId = response.data[0].MODFILE_Id;
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

  getCycleNameDiligence(cycle: string): string {
    switch (cycle) {
      case 'A':
        return 'Préparation et finalisation de la mission';
      case 'B':
        return 'Trésorerie / Financement';
      case 'C':
        return 'Fournisseurs - Achats et charges externes';
      case 'D':
        return 'Immobilisations';
      case 'E':
        return 'Clients - Produits';
      case 'F':
        return 'Stocks';
      case 'G':
        return 'Personnel';
      case 'H':
        return 'Etat - Tiers et charges';
      case 'I':
        return 'Capitaux propres - Provisions, et comptes courants';
      case 'J':
        return 'Autres comptes';
      default: 
        return '';
    }
  }

  changeDateFichier(event: Event, fileId: string): void {
    const input = event.target as HTMLInputElement;
    console.log('input value', input.value);
    console.log('fileId', fileId);
    if(input.value == '') {
      this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'encours');
    } else {
      this.sendModuleStatus('NOG', this.usrMailCollab, this.selectedCodeAffaire, 'Mission', 'oui');
    }
    this.updateDateFichier(fileId, input.value, this.usrMailCollab, 'Mission', this.selectedCodeAffaire, 'NOG');
  }

  updateDateFichier(fileId: String, dateFichier: string, email: String, source: String, missionIdDosPgiDosGroupe: String, module: String) {
    console.log('Update date du fichier du module:', fileId);

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
}