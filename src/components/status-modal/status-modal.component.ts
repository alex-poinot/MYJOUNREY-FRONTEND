import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileWithExpiration } from '../../models/module.interface';

export interface StatusModalData {
  title: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'coming-soon';
  selectedFile?: FileWithExpiration | null;
  selectedFile2?: FileWithExpiration | null;
  type: string;
}

@Component({
  selector: 'app-status-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ modalData.title }}</h3>
          <button class="modal-close" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Statut -->
          <div class="form-group">
            <label>Statut :</label>
            <div class="status-options">
              <label class="status-option">
                <input type="radio" 
                       [value]="'not-started'" 
                       [(ngModel)]="modalData.status"
                       (change)="onStatusChange()">
                <span class="status-indicator not-started"></span>
                Non commencé
              </label>
              <label class="status-option">
                <input type="radio" 
                       [value]="'in-progress'" 
                       [(ngModel)]="modalData.status"
                       (change)="onStatusChange()">
                <span class="status-indicator in-progress"></span>
                En cours
              </label>
              <label class="status-option" *ngIf="modalData.type !== 'Carto LAB' && modalData.type !== 'Fin relation client'">
                <input type="radio" 
                       [value]="'completed'" 
                       [(ngModel)]="modalData.status"
                       (change)="onStatusChange()">
                <span class="status-indicator completed"></span>
                Terminé
              </label>
              <label class="status-option" *ngIf="modalData.type === 'Carto LAB' || modalData.type === 'Fin relation client'">
                <input type="radio" 
                       [value]="'coming-soon'" 
                       [(ngModel)]="modalData.status"
                       (change)="onStatusChange()" 
                       disabled>
                <span class="status-indicator coming-soon"></span>
                Fonctionnalité à venir
              </label>
            </div>
          </div>

          <!-- Upload de fichier principal -->
          <div class="form-group" *ngIf="modalData.status === 'completed' && modalData.type !== 'Carto LAB' && modalData.type !== 'Fin relation client'">
            <label>Document :</label>
            <div class="file-upload-section">
              <button class="upload-btn" 
                      (click)="triggerFileUpload('file1')">
                <i class="fas fa-upload"></i>
                {{ modalData.selectedFile ? 'Changer le fichier' : 'Choisir un fichier' }}
              </button>
              <input #fileInput1 
                     type="file" 
                     (change)="onFileSelected($event, 'file1')" 
                     style="display: none;">
              
              <div *ngIf="modalData.selectedFile" class="uploaded-file">
                <div class="file-info">
                  <i class="fas fa-file"></i>
                  <span class="file-name">{{ modalData.selectedFile.name }}</span>
                  <span class="file-size">({{ formatFileSize(modalData.selectedFile.size) }})</span>
                  <button class="remove-file-btn" (click)="removeFile('file1')">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div class="file-expiration" 
                     [class.expired]="isExpired(modalData.selectedFile.expirationDate)"
                     [class.expiring-soon]="isExpiringSoon(modalData.selectedFile.expirationDate)">
                  <i class="fas fa-calendar-alt"></i>
                  <span>Expire le {{ formatExpirationDate(modalData.selectedFile.expirationDate) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Upload de fichier secondaire (pour certains modules) -->
          <div class="form-group" *ngIf="modalData.status === 'completed' && (modalData.type === 'QAC' || modalData.type === 'QAM' || modalData.type === 'LDM') && modalData.type !== 'Carto LAB' && modalData.type !== 'Fin relation client'">
            <label>Document complémentaire :</label>
            <div class="file-upload-section">
              <button class="upload-btn" (click)="triggerFileUpload('file2')">
                <i class="fas fa-upload"></i>
                {{ modalData.selectedFile2 ? 'Changer le fichier' : 'Choisir un fichier' }}
              </button>
              <input #fileInput2 
                     type="file" 
                     (change)="onFileSelected($event, 'file2')" 
                     style="display: none;">
              
              <div *ngIf="modalData.selectedFile2" class="uploaded-file">
                <div class="file-info">
                  <i class="fas fa-file"></i>
                  <span class="file-name">{{ modalData.selectedFile2.name }}</span>
                  <span class="file-size">({{ formatFileSize(modalData.selectedFile2.size) }})</span>
                  <button class="remove-file-btn" (click)="removeFile('file2')">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div class="file-expiration" 
                     [class.expired]="isExpired(modalData.selectedFile2.expirationDate)"
                     [class.expiring-soon]="isExpiringSoon(modalData.selectedFile2.expirationDate)">
                  <i class="fas fa-calendar-alt"></i>
                  <span>Expire le {{ formatExpirationDate(modalData.selectedFile2.expirationDate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" (click)="closeModal()">Annuler</button>
          <button class="btn-save" (click)="saveChanges()">Sauvegarder</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
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

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--gray-700);
    }

    .status-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .status-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background-color 0.2s;
    }

    .status-option:hover {
      background: var(--gray-50);
    }

    .status-option input[type="radio"] {
      margin: 0;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-indicator.not-started {
      background: var(--gray-400);
    }

    .status-indicator.in-progress {
      background: var(--warning-color);
    }

    .status-indicator.completed {
      background: var(--success-color);
    }

    .status-indicator.coming-soon {
      background: var(--info-color);
    }

    .file-upload-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .upload-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      align-self: flex-start;
    }

    .upload-btn:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }


    .uploaded-file {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--gray-50);
      border-radius: 6px;
      border: 1px solid var(--gray-200);
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .file-name {
      font-weight: 500;
      color: var(--gray-700);
      flex: 1;
    }

    .file-size {
      color: var(--gray-500);
      font-size: var(--font-size-sm);
    }

    .remove-file-btn {
      background: var(--error-color);
      color: white;
      border: none;
      border-radius: 4px;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
    }

    .remove-file-btn:hover {
      background: #dc2626;
    }

    .file-expiration {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }

    .file-expiration.expiring-soon {
      color: var(--warning-color);
    }

    .file-expiration.expired {
      color: var(--error-color);
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
  `]
})
export class StatusModalComponent {
  @Input() isOpen = false;
  @Input() modalData: StatusModalData = {
    title: '',
    status: 'not-started',
    type: ''
  };
  
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() saveChangesEvent = new EventEmitter<StatusModalData>();

  closeModal(): void {
    this.closeModalEvent.emit();
  }

  saveChanges(): void {
    this.saveChangesEvent.emit(this.modalData);
  }

  onStatusChange(): void {
    // Réinitialiser les fichiers si le statut n'est plus "completed"
    if (this.modalData.status !== 'completed') {
      this.modalData.selectedFile = null;
      this.modalData.selectedFile2 = null;
    }
  }

  triggerFileUpload(fileType: 'file1' | 'file2'): void {
    const input = document.querySelector(`input[type="file"]${fileType === 'file2' ? ':nth-of-type(2)' : ''}`) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onFileSelected(event: Event, fileType: 'file1' | 'file2'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const expirationDays = this.getExpirationDays(this.modalData.type);
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      const expirationDays = this.getExpirationDays(this.modalData.type);
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      const fileWithExpiration: FileWithExpiration = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        expirationDate: expirationDate
      };

      if (fileType === 'file1') {
        this.modalData.selectedFile = fileWithExpiration;
      } else {
        this.modalData.selectedFile2 = fileWithExpiration;
      }
    }
  }

  removeFile(fileType: 'file1' | 'file2'): void {
    if (fileType === 'file1') {
      this.modalData.selectedFile = null;
    } else {
      this.modalData.selectedFile2 = null;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getExpirationDays(moduleType: string): number {
    const expirationMap: { [key: string]: number } = {
      'LAB': 365,
      'Conflit Check': 180,
      'QAC': 90,
      'QAM': 90,
      'LDM': 60,
      'NOG': 365,
      'Checklist': 180,
      'Révision': 90,
      'Supervision': 90,
      'NDS/CR Mission': 365,
      'QMM': 180,
      'Plaquette': 30,
      'Restitution communication client': 60,
      'Carto LAB': 90,
      'Fin relation client': 90
    };
    return expirationMap[moduleType] || 90;
  }

  formatExpirationDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  isExpired(date: Date): boolean {
    return new Date() > date;
  }

  isExpiringSoon(date: Date): boolean {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  }
  getExpirationDays(moduleType: string): number {
    const expirationMap: { [key: string]: number } = {
      'LAB': 365,
      'Conflit Check': 180,
      'QAC': 90,
      'QAM': 90,
      'LDM': 60,
      'NOG': 365,
      'Checklist': 180,
      'Révision': 90,
      'Supervision': 90,
      'NDS/CR Mission': 365,
      'QMM': 180,
      'Plaquette': 30,
      'Restitution communication client': 60
    };
    return expirationMap[moduleType] || 90;
  }

  formatExpirationDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  isExpired(date: Date): boolean {
    return new Date() > date;
  }

  isExpiringSoon(date: Date): boolean {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  }
}