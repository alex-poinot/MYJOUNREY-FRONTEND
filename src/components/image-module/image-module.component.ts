import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageModule } from '../../models/module.interface';

@Component({
  selector: 'app-image-module',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="module-container">
      <div class="module-header">
        <span class="module-type">🖼️ Image</span>
        <button class="delete-btn" (click)="onDelete()">×</button>
      </div>
      <div class="module-content">
        <div class="form-group">
          <label>URL de l'image:</label>
          <input 
            type="url" 
            [(ngModel)]="module.src" 
            (input)="onUpdate()"
            placeholder="https://...">
        </div>
        <div class="form-group">
          <label>Texte alternatif:</label>
          <input 
            type="text" 
            [(ngModel)]="module.alt" 
            (input)="onUpdate()"
            placeholder="Description de l'image">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Largeur (px):</label>
            <input 
              type="number" 
              [(ngModel)]="module.width" 
              (input)="onUpdate()"
              min="50" 
              max="800">
          </div>
          <div class="form-group">
            <label>Hauteur (px):</label>
            <input 
              type="number" 
              [(ngModel)]="module.height" 
              (input)="onUpdate()"
              min="50" 
              max="600">
          </div>
        </div>
        <div class="image-preview" *ngIf="module.src">
          <img [src]="module.src" [alt]="module.alt" 
               [style.width.px]="Math.min(module.width || 400, 300)"
               [style.height.px]="Math.min(module.height || 300, 200)">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-container {
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      margin-bottom: 16px;
      background: white;
      box-shadow: var(--shadow-sm);
    }
    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--gray-50);
      border-bottom: 1px solid var(--gray-200);
      border-radius: 8px 8px 0 0;
    }
    .module-type {
      font-weight: 600;
      color: var(--gray-700);
    }
    .delete-btn {
      background: var(--error-color);
      color: white;
      border: none;
      border-radius: 4px;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: var(--font-size-lg);
      line-height: 1;
    }
    .delete-btn:hover {
      background: #dc2626;
    }
    .module-content {
      padding: 16px;
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .form-row .form-group {
      flex: 1;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      color: var(--gray-700);
    }
    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: var(--font-size-md);
    }
    input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(34, 109, 104, 0.1);
    }
    .image-preview {
      margin-top: 12px;
      text-align: center;
      padding: 12px;
      background: var(--gray-50);
      border-radius: 4px;
    }
    .image-preview img {
      border-radius: 4px;
      box-shadow: var(--shadow-sm);
    }
  `]
})
export class ImageModuleComponent {
  @Input() module!: ImageModule;
  @Output() moduleChange = new EventEmitter<ImageModule>();
  @Output() deleteModule = new EventEmitter<string>();

  Math = Math;

  onUpdate(): void {
    this.moduleChange.emit(this.module);
  }

  onDelete(): void {
    this.deleteModule.emit(this.module.id);
  }
}