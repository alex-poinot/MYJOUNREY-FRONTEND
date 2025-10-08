import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Module } from '../../models/module.interface';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="preview-container">
      <div class="preview-header">
        <h2>Prévisualisation du document</h2>
      </div>
      <div class="preview-content" id="pdf-content">
        <div *ngFor="let module of sortedModules" class="preview-module" [attr.data-module-type]="module.type">
          
          <!-- Titre -->
          <h1 *ngIf="module.type === 'title' && module.level === 1" 
              class="title-h1">
            {{ module.content }}
          </h1>
          <h2 *ngIf="module.type === 'title' && module.level === 2" 
              class="title-h2">
            {{ module.content }}
          </h2>
          <h3 *ngIf="module.type === 'title' && module.level === 3" 
              class="title-h3">
            {{ module.content }}
          </h3>
          
          <!-- Sous-titre -->
          <h4 *ngIf="module.type === 'subtitle'" class="subtitle">
            {{ module.content }}
          </h4>
          
          <!-- Texte -->
          <p *ngIf="module.type === 'text'" 
             class="text-content"
             [style.font-size.px]="module.fontSize"
             [style.color]="module.color">
            {{ module.content }}
          </p>
          
          <!-- Image -->
          <div *ngIf="module.type === 'image'" class="image-content">
            <img [src]="module.src" 
                 [alt]="module.alt"
                 [style.width.px]="module.width"
                 [style.height.px]="module.height">
          </div>
          
          <!-- Tableau -->
          <div *ngIf="module.type === 'table'" class="table-content">
            <table class="preview-table">
              <thead>
                <tr>
                  <th *ngFor="let header of module.headers">
                    {{ header }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of module.rows">
                  <td *ngFor="let cell of row">
                    {{ cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
        </div>
        
        <div *ngIf="sortedModules.length === 0" class="empty-preview">
          <p>Aucun module ajouté. Commencez par ajouter du contenu depuis la sidebar.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-container {
      background: white;
      box-shadow: var(--shadow-md);
      border-radius: 8px;
      overflow: hidden;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .preview-header {
      background: var(--gray-800);
      color: white;
      padding: 16px 20px;
      flex-shrink: 0;
    }
    .preview-header h2 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
    .preview-content {
      padding: 24px;
      line-height: 1.6;
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }
    .preview-module {
      margin-bottom: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .title-h1 {
      font-size: 1.7vw;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0 0 16px 0;
      border-bottom: 3px solid var(--primary-light);
      padding-bottom: 8px;
    }
    .title-h2 {
      font-size: 1.5vw;
      font-weight: 600;
      color: var(--gray-700);
      margin: 24px 0 12px 0;
    }
    .title-h3 {
      font-size: 1.3vw;
      font-weight: 500;
      color: var(--gray-600);
      margin: 20px 0 10px 0;
    }
    .subtitle {
      font-size: var(--font-size-lg);
      font-weight: 500;
      color: var(--gray-600);
      margin: 16px 0 8px 0;
      font-style: italic;
    }
    .text-content {
      margin: 12px 0;
      text-align: justify;
    }
    .image-content {
      text-align: center;
      margin: 20px 0;
    }
    .image-content img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: var(--shadow-md);
    }
    .table-content {
      margin: 20px 0;
      overflow-x: auto;
    }
    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-md);
    }
    .preview-table th,
    .preview-table td {
      border: 1px solid var(--gray-300);
      padding: 8px 12px;
      text-align: left;
      word-wrap: break-word;
      word-break: break-word;
      white-space: pre-wrap;
      vertical-align: top;
      max-width: 200px;
    }
    .preview-table th {
      background: var(--gray-50);
      font-weight: 600;
      color: var(--gray-700);
    }
    .preview-table tr:nth-child(even) {
      background: var(--gray-50);
    }
    .empty-preview {
      text-align: center;
      color: var(--gray-600);
      font-style: italic;
      padding: 40px 20px;
    }
  `]
})
export class PreviewComponent {
  @Input() modules: Module[] = [];

  get sortedModules(): Module[] {
    return [...this.modules].sort((a, b) => a.order - b.order);
  }
}