import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService } from '../../services/pdf.service';
import { NogPartie1 } from '../../models/module.interface';

@Component({
  selector: 'app-nog-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nog-editor-container">
      <!-- Interface principale -->
      <div class="nog-main-content">
        <div class="nog-header">
          <h1>Éditeur NOG</h1>
          <button id="btn-apercu-pdf" class="btn-apercu-pdf" (click)="openPdfPreview()">
            <i class="fas fa-file-pdf"></i>
            Aperçu PDF
          </button>
        </div>

        <!-- Menu des sections -->
        <div class="nog-menu">
          <div class="text-element-menu-nog" 
               [class.active]="selectedSection === 'presentation'"
               (click)="selectSection('presentation')">
            1. Présentation de la société
          </div>
          <div class="text-element-menu-nog"
               [class.active]="selectedSection === 'activite'"
               (click)="selectSection('activite')">
            2. Activité de la société
          </div>
          <div class="text-element-menu-nog"
               [class.active]="selectedSection === 'organisation'"
               (click)="selectSection('organisation')">
            3. Organisation
          </div>
        </div>

        <!-- Contenu de la section sélectionnée -->
        <div class="nog-content">
          <div *ngIf="selectedSection === 'presentation'" class="section-content">
            <h2>1. Présentation de la société</h2>
            
            <div class="subsection">
              <h3>1.1 Informations générales</h3>
              <textarea 
                [(ngModel)]="nogPartie1.informationsGenerales"
                placeholder="Saisissez les informations générales..."
                rows="4">
              </textarea>
            </div>

            <div class="subsection">
              <h3>1.2 Activité</h3>
              <textarea 
                [(ngModel)]="nogPartie1.activite"
                placeholder="Décrivez l'activité de la société..."
                rows="4">
              </textarea>
            </div>

            <div class="subsection">
              <h3>1.3 Organisation</h3>
              <textarea 
                [(ngModel)]="nogPartie1.organisation"
                placeholder="Décrivez l'organisation..."
                rows="4">
              </textarea>
            </div>
          </div>

          <div *ngIf="selectedSection === 'activite'" class="section-content">
            <h2>2. Activité de la société</h2>
            
            <div class="subsection">
              <h3>2.1 Environnement</h3>
              <textarea 
                [(ngModel)]="nogPartie1.environnement"
                placeholder="Décrivez l'environnement..."
                rows="4">
              </textarea>
            </div>

            <div class="subsection">
              <h3>2.2 Systèmes d'information</h3>
              <textarea 
                [(ngModel)]="nogPartie1.systemesInformation"
                placeholder="Décrivez les systèmes d'information..."
                rows="4">
              </textarea>
            </div>
          </div>

          <div *ngIf="selectedSection === 'organisation'" class="section-content">
            <h2>3. Organisation</h2>
            
            <div class="subsection">
              <h3>3.1 Données financières</h3>
              <textarea 
                [(ngModel)]="nogPartie1.donneesFinancieres"
                placeholder="Saisissez les données financières..."
                rows="4">
              </textarea>
            </div>

            <div class="subsection">
              <h3>3.2 Processus métiers</h3>
              <textarea 
                [(ngModel)]="nogPartie1.processusMetiers"
                placeholder="Décrivez les processus métiers..."
                rows="4">
              </textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Pop-up d'aperçu PDF -->
      <div class="pdf-preview-overlay" [class.open]="showPdfPreview" (click)="closePdfPreview()">
        <div class="pdf-preview-panel" (click)="$event.stopPropagation()">
          <div class="pdf-preview-header">
            <h2>Aperçu PDF - NOG</h2>
            <div class="header-actions">
              <button class="btn-download" (click)="downloadPdf()" [disabled]="isGeneratingPdf">
                <i class="fas fa-download" *ngIf="!isGeneratingPdf"></i>
                <i class="fas fa-spinner fa-spin" *ngIf="isGeneratingPdf"></i>
                {{ isGeneratingPdf ? 'Génération...' : 'Télécharger PDF' }}
              </button>
              <button class="btn-close" (click)="closePdfPreview()">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div class="pdf-preview-content" id="pdf-preview-content">
            <!-- Contenu de l'aperçu PDF -->
            <div class="pdf-page">
              <div class="pdf-header">
                <div class="header-left">Grant Thornton</div>
                <div class="header-center">NOG</div>
                <div class="header-right"></div>
              </div>

              <div class="pdf-body">
                <h1 class="pdf-main-title">{{ getSelectedSectionTitle() }}</h1>
                
                <div *ngIf="selectedSection === 'presentation'">
                  <div class="pdf-subsection" *ngIf="nogPartie1.informationsGenerales">
                    <h2>1.1 Informations générales</h2>
                    <p>{{ nogPartie1.informationsGenerales }}</p>
                  </div>

                  <div class="pdf-subsection" *ngIf="nogPartie1.activite">
                    <h2>1.2 Activité</h2>
                    <p>{{ nogPartie1.activite }}</p>
                  </div>

                  <div class="pdf-subsection" *ngIf="nogPartie1.organisation">
                    <h2>1.3 Organisation</h2>
                    <p>{{ nogPartie1.organisation }}</p>
                  </div>
                </div>

                <div *ngIf="selectedSection === 'activite'">
                  <div class="pdf-subsection" *ngIf="nogPartie1.environnement">
                    <h2>2.1 Environnement</h2>
                    <p>{{ nogPartie1.environnement }}</p>
                  </div>

                  <div class="pdf-subsection" *ngIf="nogPartie1.systemesInformation">
                    <h2>2.2 Systèmes d'information</h2>
                    <p>{{ nogPartie1.systemesInformation }}</p>
                  </div>
                </div>

                <div *ngIf="selectedSection === 'organisation'">
                  <div class="pdf-subsection" *ngIf="nogPartie1.donneesFinancieres">
                    <h2>3.1 Données financières</h2>
                    <p>{{ nogPartie1.donneesFinancieres }}</p>
                  </div>

                  <div class="pdf-subsection" *ngIf="nogPartie1.processusMetiers">
                    <h2>3.2 Processus métiers</h2>
                    <p>{{ nogPartie1.processusMetiers }}</p>
                  </div>
                </div>
              </div>

              <div class="pdf-footer">
                <div class="footer-center">Page 1 / 1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nog-editor-container {
      min-height: calc(100vh - 8vh);
      background: var(--gray-50);
      position: relative;
    }

    .nog-main-content {
      padding: 2vh 2vw;
    }

    .nog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2vh;
      background: white;
      padding: 1.5vh 2vw;
      border-radius: 0.8vw;
      box-shadow: var(--shadow-sm);
    }

    .nog-header h1 {
      margin: 0;
      color: var(--primary-color);
      font-size: var(--font-size-xl);
      font-weight: 700;
    }

    .btn-apercu-pdf {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 1vh 1.5vw;
      border-radius: 0.5vw;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5vw;
      font-size: var(--font-size-md);
    }

    .btn-apercu-pdf:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .nog-menu {
      display: flex;
      gap: 1vw;
      margin-bottom: 2vh;
    }

    .text-element-menu-nog {
      background: white;
      padding: 1vh 1.5vw;
      border-radius: 0.5vw;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 0.1vh solid var(--gray-200);
      font-weight: 500;
      color: var(--gray-700);
      font-size: var(--font-size-md);
    }

    .text-element-menu-nog:hover {
      background: var(--gray-50);
      border-color: var(--primary-color);
    }

    .text-element-menu-nog.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .nog-content {
      background: white;
      border-radius: 0.8vw;
      padding: 2vh 2vw;
      box-shadow: var(--shadow-sm);
    }

    .section-content h2 {
      color: var(--primary-color);
      margin: 0 0 2vh 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
      border-bottom: 0.2vh solid var(--primary-light);
      padding-bottom: 1vh;
    }

    .subsection {
      margin-bottom: 2vh;
    }

    .subsection h3 {
      color: var(--gray-700);
      margin: 0 0 1vh 0;
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    .subsection textarea {
      width: 100%;
      padding: 1vh 1vw;
      border: 0.1vh solid var(--gray-300);
      border-radius: 0.5vw;
      font-size: var(--font-size-md);
      font-family: inherit;
      resize: vertical;
      min-height: 8vh;
    }

    .subsection textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 74, 133, 0.1);
    }

    /* Pop-up d'aperçu PDF */
    .pdf-preview-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .pdf-preview-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .pdf-preview-panel {
      position: absolute;
      top: 0;
      right: 0;
      width: 21cm; /* Largeur A4 */
      height: 100vh;
      background: white;
      box-shadow: var(--shadow-xl);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .pdf-preview-overlay.open .pdf-preview-panel {
      transform: translateX(0);
    }

    .pdf-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5vh 2vw;
      background: var(--primary-color);
      color: white;
      flex-shrink: 0;
    }

    .pdf-preview-header h2 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: 1vw;
      align-items: center;
    }

    .btn-download {
      background: var(--secondary-color);
      color: white;
      border: none;
      padding: 0.8vh 1.2vw;
      border-radius: 0.4vw;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5vw;
      font-size: var(--font-size-md);
    }

    .btn-download:hover:not(:disabled) {
      background: var(--primary-dark);
    }

    .btn-download:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-close {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: none;
      padding: 0.8vh 1vw;
      border-radius: 0.4vw;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: var(--font-size-md);
    }

    .btn-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .pdf-preview-content {
      flex: 1;
      overflow-y: auto;
      background: var(--gray-100);
      padding: 2vh;
    }

    /* Styles pour le contenu PDF */
    .pdf-page {
      width: 19cm; /* A4 moins marges */
      min-height: 27.7cm; /* A4 moins marges */
      background: white;
      margin: 0 auto;
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .pdf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1vh 2vw;
      border-bottom: 0.1vh solid var(--gray-300);
      background: var(--gray-50);
      font-weight: 600;
      font-size: var(--font-size-md);
    }

    .header-left {
      color: var(--primary-color);
    }

    .header-center {
      color: var(--gray-700);
      font-weight: 700;
    }

    .pdf-body {
      flex: 1;
      padding: 2vh 2vw;
      line-height: 1.6;
    }

    .pdf-main-title {
      color: var(--primary-color);
      font-size: 1.2vw;
      font-weight: 700;
      margin: 0 0 2vh 0;
      border-bottom: 0.2vh solid var(--primary-light);
      padding-bottom: 1vh;
    }

    .pdf-subsection {
      margin-bottom: 2vh;
      page-break-inside: avoid;
    }

    .pdf-subsection h2 {
      color: var(--gray-700);
      font-size: var(--font-size-lg);
      font-weight: 600;
      margin: 0 0 1vh 0;
    }

    .pdf-subsection p {
      color: var(--gray-800);
      font-size: var(--font-size-md);
      line-height: 1.6;
      margin: 0;
      text-align: justify;
      white-space: pre-wrap;
    }

    .pdf-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1vh 2vw;
      border-top: 0.1vh solid var(--gray-300);
      background: var(--gray-50);
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }

    /* Responsive */
    @media (max-width: 1400px) {
      .pdf-preview-panel {
        width: 90vw;
      }
    }

    @media (max-width: 768px) {
      .pdf-preview-panel {
        width: 100vw;
      }
      
      .nog-menu {
        flex-direction: column;
      }
    }
  `]
})
export class NogEditorComponent implements OnInit {
  selectedSection: string = 'presentation';
  showPdfPreview: boolean = false;
  isGeneratingPdf: boolean = false;

  nogPartie1: NogPartie1 = {
    informationsGenerales: '',
    activite: '',
    organisation: '',
    environnement: '',
    systemesInformation: '',
    donneesFinancieres: '',
    processusMetiers: '',
    gouvernance: '',
    risques: '',
    conformite: '',
    controleInterne: '',
    auditInterne: '',
    relationsExternes: '',
    objectifsStrategiques: '',
    indicateursPerformance: '',
    projetsDeveloppement: '',
    defisOpportunites: '',
    conclusionGenerale: ''
  };

  constructor(private pdfService: PdfService) {}

  ngOnInit(): void {
    // Initialisation avec des données d'exemple
    this.nogPartie1 = {
      informationsGenerales: 'La société XYZ est une entreprise française créée en 2010, spécialisée dans le conseil en transformation digitale. Elle compte aujourd\'hui 150 collaborateurs répartis sur 3 sites.',
      activite: 'L\'activité principale de la société consiste en l\'accompagnement des entreprises dans leur transformation digitale, incluant la mise en place de solutions technologiques innovantes.',
      organisation: 'L\'organisation de la société s\'articule autour de 4 départements principaux : Commercial, Technique, RH et Finance. Chaque département est dirigé par un directeur qui rapporte au comité de direction.',
      environnement: 'La société évolue dans un environnement concurrentiel dynamique, avec une forte croissance du marché de la transformation digitale.',
      systemesInformation: 'Le système d\'information de la société repose sur une architecture cloud hybride, avec des outils de gestion intégrés (ERP, CRM).',
      donneesFinancieres: 'Le chiffre d\'affaires de la société s\'élève à 25M€ pour l\'exercice 2024, en croissance de 15% par rapport à l\'année précédente.',
      processusMetiers: 'Les processus métiers sont documentés et suivent une approche qualité certifiée ISO 9001.',
      gouvernance: '',
      risques: '',
      conformite: '',
      controleInterne: '',
      auditInterne: '',
      relationsExternes: '',
      objectifsStrategiques: '',
      indicateursPerformance: '',
      projetsDeveloppement: '',
      defisOpportunites: '',
      conclusionGenerale: ''
    };
  }

  selectSection(section: string): void {
    this.selectedSection = section;
  }

  openPdfPreview(): void {
    this.showPdfPreview = true;
  }

  closePdfPreview(): void {
    this.showPdfPreview = false;
  }

  getSelectedSectionTitle(): string {
    switch (this.selectedSection) {
      case 'presentation':
        return '1. Présentation de la société';
      case 'activite':
        return '2. Activité de la société';
      case 'organisation':
        return '3. Organisation';
      default:
        return 'Section NOG';
    }
  }

  async downloadPdf(): Promise<void> {
    this.isGeneratingPdf = true;
    
    try {
      const filename = `NOG-${this.selectedSection}-${new Date().toISOString().split('T')[0]}.pdf`;
      await this.pdfService.exportToPdf('pdf-preview-content', filename);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF');
    } finally {
      this.isGeneratingPdf = false;
    }
  }
}