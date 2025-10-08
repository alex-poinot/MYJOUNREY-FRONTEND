import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TitleModule } from '../../models/module.interface';

@Component({
  selector: 'app-title-module',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="module-container">
      <div class="module-header">
        <span class="module-type">📝 Titre</span>
        <button class="delete-btn" (click)="onDelete()">×</button>
      </div>
      <div class="module-content">
        <div class="form-group">
          <label>Contenu du titre:</label>
          <input 
            type="text" 
            [(ngModel)]="module.content" 
            (input)="onUpdate()"
            placeholder="Saisissez votre titre...">
        </div>
        <div class="form-group">
          <label>Niveau:</label>
          <select [(ngModel)]="module.level" (change)="onUpdate()">
            <option [value]="1">H1 - Titre principal</option>
            <option [value]="2">H2 - Titre secondaire</option>
            <option [value]="3">H3 - Titre tertiaire</option>
          </select>
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
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      color: var(--gray-700);
    }
    input, select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: var(--font-size-md);
    }
    input:focus, select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(34, 109, 104, 0.1);
    }
  `]
})
export class TitleModuleComponent {
  @Input() module!: TitleModule;
  @Output() moduleChange = new EventEmitter<TitleModule>();
  @Output() deleteModule = new EventEmitter<string>();

  onUpdate(): void {
    this.moduleChange.emit(this.module);
  }

  onDelete(): void {
    this.deleteModule.emit(this.module.id);
  }
}