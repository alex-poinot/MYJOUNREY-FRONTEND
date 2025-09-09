import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextModule } from '../../models/module.interface';

@Component({
  selector: 'app-text-module',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="module-container">
      <div class="module-header">
        <span class="module-type">📃 Texte</span>
        <button class="delete-btn" (click)="onDelete()">×</button>
      </div>
      <div class="module-content">
        <div class="form-group">
          <label>Contenu:</label>
          <textarea 
            [(ngModel)]="module.content" 
            (input)="onUpdate()"
            placeholder="Saisissez votre texte..."
            rows="4">
          </textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Taille:</label>
            <input 
              type="number" 
              [(ngModel)]="module.fontSize" 
              (input)="onUpdate()"
              min="8" 
              max="72">
          </div>
          <div class="form-group">
            <label>Couleur:</label>
            <input 
              type="color" 
              [(ngModel)]="module.color" 
              (input)="onUpdate()">
          </div>
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
    textarea, input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: var(--font-size-md);
    }
    textarea:focus, input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(34, 109, 104, 0.1);
    }
  `]
})
export class TextModuleComponent {
  @Input() module!: TextModule;
  @Output() moduleChange = new EventEmitter<TextModule>();
  @Output() deleteModule = new EventEmitter<string>();

  onUpdate(): void {
    this.moduleChange.emit(this.module);
  }

  onDelete(): void {
    this.deleteModule.emit(this.module.id);
  }
}