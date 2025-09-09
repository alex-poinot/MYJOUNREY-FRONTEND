import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from '../../models/module.interface';

@Component({
  selector: 'app-table-module',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="module-container">
      <div class="module-header">
        <span class="module-type">📊 Tableau</span>
        <button class="delete-btn" (click)="onDelete()">×</button>
      </div>
      <div class="module-content">
        <div class="table-actions">
          <button class="action-btn" (click)="addColumn()">+ Colonne</button>
          <button class="action-btn" (click)="addRow()">+ Ligne</button>
        </div>
        
        <div class="table-container">
          <table class="editable-table">
            <thead>
              <tr>
                <th *ngFor="let header of module.headers; let i = index">
                  <input 
                    type="text"
                    [value]="module.headers[i]" 
                    (input)="updateHeader(i, $event)"
                    placeholder="En-tête"
                    class="header-input">
                  <button class="remove-btn" (click)="removeColumn(i)" 
                          *ngIf="module.headers.length > 1">×</button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of module.rows; let i = index">
                <td *ngFor="let cell of row; let j = index">
                  <input 
                    type="text"
                    [value]="module.rows[i][j]" 
                    (input)="updateCell(i, j, $event)"
                    placeholder="Données"
                    class="cell-input">
                </td>
                <td class="row-actions">
                  <button class="remove-btn" (click)="removeRow(i)" 
                          *ngIf="module.rows.length > 1">×</button>
                </td>
              </tr>
            </tbody>
          </table>
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
    .table-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .action-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--font-size-sm);
    }
    .action-btn:hover {
      background: var(--primary-dark);
    }
    .table-container {
      overflow-x: auto;
    }
    .editable-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--gray-300);
    }
    .editable-table th,
    .editable-table td {
      border: 1px solid var(--gray-300);
      padding: 4px;
      position: relative;
      vertical-align: top;
      min-width: 120px;
    }
    .editable-table th {
      background: var(--gray-100);
      font-weight: 600;
    }
    .header-input,
    .cell-input {
      width: 100%;
      border: none;
      padding: 8px;
      background: transparent;
      font-size: var(--font-size-md);
      font-family: inherit;
      line-height: 1.4;
      outline: none;
    }
    .header-input:focus,
    .cell-input:focus {
      background: rgba(34, 109, 104, 0.05);
      border-radius: 4px;
    }
    .remove-btn {
      background: var(--error-color);
      color: white;
      border: none;
      border-radius: 2px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      line-height: 1;
      position: absolute;
      top: 2px;
      right: 2px;
    }
    .remove-btn:hover {
      background: #dc2626;
    }
    .row-actions {
      width: 30px;
      background: var(--gray-50);
      text-align: center;
      border-left: 2px solid var(--gray-200) !important;
    }
  `]
})
export class TableModuleComponent {
  @Input() module!: TableModule;
  @Output() moduleChange = new EventEmitter<TableModule>();
  @Output() deleteModule = new EventEmitter<string>();

  updateHeader(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.module.headers[index] = target.value;
    this.moduleChange.emit(this.module);
  }

  updateCell(rowIndex: number, colIndex: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.module.rows[rowIndex][colIndex] = target.value;
    this.moduleChange.emit(this.module);
  }

  onDelete(): void {
    this.deleteModule.emit(this.module.id);
  }

  addColumn(): void {
    this.module.headers.push('Nouvelle colonne');
    this.module.rows.forEach(row => row.push(''));
    this.moduleChange.emit(this.module);
  }

  addRow(): void {
    const newRow = new Array(this.module.headers.length).fill('');
    this.module.rows.push(newRow);
    this.moduleChange.emit(this.module);
  }

  removeColumn(index: number): void {
    if (this.module.headers.length > 1) {
      this.module.headers.splice(index, 1);
      this.module.rows.forEach(row => row.splice(index, 1));
      this.moduleChange.emit(this.module);
    }
  }

  removeRow(index: number): void {
    if (this.module.rows.length > 1) {
      this.module.rows.splice(index, 1);
      this.moduleChange.emit(this.module);
    }
  }
}