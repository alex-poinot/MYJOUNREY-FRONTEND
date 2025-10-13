import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NogPartie1 } from '../../models/module.interface';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-nog-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nog-editor-container">
      <div class="nog-header">
        <h1>📋 Éditeur NOG</h1>
        <div class="nog-actions">
          <button id="btn-apercu-pdf" class="btn-primary" (click)="openPreviewModal()">
            👁️ Aperçu PDF
          </button>
        </div>
      </div>

      <div class="nog-content">
        <div class="form-section">
          <h2>1. Présentation de la société</h2>
          
          <div class="form-group">
            <label for="informationsGenerales">1.1 Informations générales</label>
            <textarea 
              id="informationsGenerales"
              [(ngModel)]="nogPartie1.informationsGenerales"
              rows="4"
              placeholder="Saisissez les informations générales...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="activite">1.2 Activité</label>
            <textarea 
              id="activite"
              [(ngModel)]="nogPartie1.activite"
              rows="4"
              placeholder="Décrivez l'activité de la société...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="organisation">1.3 Organisation</label>
            <textarea 
              id="organisation"
              [(ngModel)]="nogPartie1.organisation"
              rows="4"
              placeholder="Décrivez l'organisation...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="environnement">1.4 Environnement</label>
            <textarea 
              id="environnement"
              [(ngModel)]="nogPartie1.environnement"
              rows="4"
              placeholder="Décrivez l'environnement...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="systemesInformation">1.5 Systèmes d'information</label>
            <textarea 
              id="systemesInformation"
              [(ngModel)]="nogPartie1.systemesInformation"
              rows="4"
              placeholder="Décrivez les systèmes d'information...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="donneesFinancieres">1.6 Données financières</label>
            <textarea 
              id="donneesFinancieres"
              [(ngModel)]="nogPartie1.donneesFinancieres"
              rows="4"
              placeholder="Saisissez les données financières...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="processusMetiers">1.7 Processus métiers</label>
            <textarea 
              id="processusMetiers"
              [(ngModel)]="nogPartie1.processusMetiers"
              rows="4"
              placeholder="Décrivez les processus métiers...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="gouvernance">1.8 Gouvernance</label>
            <textarea 
              id="gouvernance"
              [(ngModel)]="nogPartie1.gouvernance"
              rows="4"
              placeholder="Décrivez la gouvernance...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="risques">1.9 Risques</label>
            <textarea 
              id="risques"
              [(ngModel)]="nogPartie1.risques"
              rows="4"
              placeholder="Identifiez les risques...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="conformite">1.10 Conformité</label>
            <textarea 
              id="conformite"
              [(ngModel)]="nogPartie1.conformite"
              rows="4"
              placeholder="Décrivez la conformité...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="controleInterne">1.11 Contrôle interne</label>
            <textarea 
              id="controleInterne"
              [(ngModel)]="nogPartie1.controleInterne"
              rows="4"
              placeholder="Décrivez le contrôle interne...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="auditInterne">1.12 Audit interne</label>
            <textarea 
              id="auditInterne"
              [(ngModel)]="nogPartie1.auditInterne"
              rows="4"
              placeholder="Décrivez l'audit interne...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="relationsExternes">1.13 Relations externes</label>
            <textarea 
              id="relationsExternes"
              [(ngModel)]="nogPartie1.relationsExternes"
              rows="4"
              placeholder="Décrivez les relations externes...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="objectifsStrategiques">1.14 Objectifs stratégiques</label>
            <textarea 
              id="objectifsStrategiques"
              [(ngModel)]="nogPartie1.objectifsStrategiques"
              rows="4"
              placeholder="Définissez les objectifs stratégiques...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="indicateursPerformance">1.15 Indicateurs de performance</label>
            <textarea 
              id="indicateursPerformance"
              [(ngModel)]="nogPartie1.indicateursPerformance"
              rows="4"
              placeholder="Listez les indicateurs de performance...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="projetsDeveloppement">1.16 Projets de développement</label>
            <textarea 
              id="projetsDeveloppement"
              [(ngModel)]="nogPartie1.projetsDeveloppement"
              rows="4"
              placeholder="Décrivez les projets de développement...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="defisOpportunites">1.17 Défis et opportunités</label>
            <textarea 
              id="defisOpportunites"
              [(ngModel)]="nogPartie1.defisOpportunites"
              rows="4"
              placeholder="Identifiez les défis et opportunités...">
            </textarea>
          </div>

          <div class="form-group">
            <label for="conclusionGenerale">1.18 Conclusion générale</label>
            <textarea 
              id="conclusionGenerale"
              [(ngModel)]="nogPartie1.conclusionGenerale"
              rows="4"
              placeholder="Rédigez la conclusion générale...">
            </textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'aperçu PDF -->
    <div *ngIf="showPreviewModal" class="modal-overlay" (click)="closePreviewModal()">
      <div class="preview-modal" (click)="$event.stopPropagation()" [class.show]="showPreviewModal">
        <div class="modal-header">
          <h3>Aperçu du document NOG</h3>
          <button class="modal-close" (click)="closePreviewModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="preview-actions">
            <button class="btn-primary" (click)="downloadPdf()" [disabled]="isGeneratingPdf">
              <i class="fas fa-download" *ngIf="!isGeneratingPdf"></i>
              <i class="fas fa-spinner fa-spin" *ngIf="isGeneratingPdf"></i>
              {{ isGeneratingPdf ? 'Génération...' : 'Télécharger PDF' }}
            </button>
          </div>
          
          <div class="preview-content" id="nog-pdf-content">
            <div class="document-title">
              <h1>1. Présentation de la société</h1>
            </div>
            
            <div class="section" *ngIf="nogPartie1.informationsGenerales">
              <h2>1.1 Informations générales</h2>
              <div class="content">{{ nogPartie1.informationsGenerales }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.activite">
              <h2>1.2 Activité</h2>
              <div class="content">{{ nogPartie1.activite }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.organisation">
              <h2>1.3 Organisation</h2>
              <div class="content">{{ nogPartie1.organisation }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.environnement">
              <h2>1.4 Environnement</h2>
              <div class="content">{{ nogPartie1.environnement }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.systemesInformation">
              <h2>1.5 Systèmes d'information</h2>
              <div class="content">{{ nogPartie1.systemesInformation }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.donneesFinancieres">
              <h2>1.6 Données financières</h2>
              <div class="content">{{ nogPartie1.donneesFinancieres }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.processusMetiers">
              <h2>1.7 Processus métiers</h2>
              <div class="content">{{ nogPartie1.processusMetiers }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.gouvernance">
              <h2>1.8 Gouvernance</h2>
              <div class="content">{{ nogPartie1.gouvernance }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.risques">
              <h2>1.9 Risques</h2>
              <div class="content">{{ nogPartie1.risques }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.conformite">
              <h2>1.10 Conformité</h2>
              <div class="content">{{ nogPartie1.conformite }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.controleInterne">
              <h2>1.11 Contrôle interne</h2>
              <div class="content">{{ nogPartie1.controleInterne }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.auditInterne">
              <h2>1.12 Audit interne</h2>
              <div class="content">{{ nogPartie1.auditInterne }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.relationsExternes">
              <h2>1.13 Relations externes</h2>
              <div class="content">{{ nogPartie1.relationsExternes }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.objectifsStrategiques">
              <h2>1.14 Objectifs stratégiques</h2>
              <div class="content">{{ nogPartie1.objectifsStrategiques }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.indicateursPerformance">
              <h2>1.15 Indicateurs de performance</h2>
              <div class="content">{{ nogPartie1.indicateursPerformance }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.projetsDeveloppement">
              <h2>1.16 Projets de développement</h2>
              <div class="content">{{ nogPartie1.projetsDeveloppement }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.defisOpportunites">
              <h2>1.17 Défis et opportunités</h2>
              <div class="content">{{ nogPartie1.defisOpportunites }}</div>
            </div>

            <div class="section" *ngIf="nogPartie1.conclusionGenerale">
              <h2>1.18 Conclusion générale</h2>
              <div class="content">{{ nogPartie1.conclusionGenerale }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nog-editor-container {
      padding: 24px;
      background: var(--gray-50);
      min-height: calc(100vh - 8vh);
    }

    .nog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding: 24px;
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
    }

    .nog-header h1 {
      margin: 0;
      color: var(--primary-color);
      font-size: 2rem;
      font-weight: 700;
    }

    .nog-actions {
      display: flex;
      gap: 12px;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .nog-content {
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      padding: 32px;
    }

    .form-section h2 {
      color: var(--primary-color);
      margin-bottom: 24px;
      font-size: 1.5rem;
      font-weight: 600;
      border-bottom: 2px solid var(--primary-light);
      padding-bottom: 8px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--gray-700);
      font-size: 1rem;
    }

    .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--gray-200);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      line-height: 1.5;
      resize: vertical;
      transition: all 0.2s ease;
    }

    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 74, 133, 0.1);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .preview-modal {
      width: 60vw;
      height: 100vh;
      background: white;
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    }

    .preview-modal.show {
      transform: translateX(0);
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .preview-actions {
      margin-bottom: 24px;
      text-align: center;
    }

    .preview-content {
      background: white;
      padding: 40px;
      line-height: 1.6;
      font-family: 'Times New Roman', serif;
    }

    .document-title h1 {
      font-size: 24px;
      font-weight: bold;
      color: var(--primary-color);
      margin-bottom: 32px;
      text-align: center;
      border-bottom: 3px solid var(--primary-color);
      padding-bottom: 16px;
    }

    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .section h2 {
      font-size: 18px;
      font-weight: bold;
      color: var(--gray-800);
      margin-bottom: 12px;
      border-left: 4px solid var(--primary-color);
      padding-left: 12px;
    }

    .section .content {
      font-size: 14px;
      line-height: 1.6;
      color: var(--gray-700);
      text-align: justify;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Print styles pour le PDF */
    @media print {
      .preview-actions {
        display: none !important;
      }
      
      .section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .section h2 {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      .content {
        orphans: 3;
        widows: 3;
      }
    }
  `]
})
export class NogEditorComponent implements OnInit {
  showPreviewModal = false;
  isGeneratingPdf = false;

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
    // Initialisation du composant
  }

  openPreviewModal(): void {
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
  }

  async downloadPdf(): Promise<void> {
    this.isGeneratingPdf = true;
    
    try {
      const filename = `nog-presentation-societe-${new Date().toISOString().split('T')[0]}.pdf`;
      await this.pdfService.exportNogToPdf('nog-pdf-content', filename);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF');
    } finally {
      this.isGeneratingPdf = false;
    }
  }
}