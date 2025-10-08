import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Module, ModuleTemplate } from '../models/module.interface';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private modulesSubject = new BehaviorSubject<Module[]>([]);
  public modules$ = this.modulesSubject.asObservable();

  private nextOrder = 1;

  public moduleTemplates: ModuleTemplate[] = [
    {
      type: 'title',
      name: 'Titre',
      icon: '📝',
      description: 'Ajouter un titre principal'
    },
    {
      type: 'subtitle',
      name: 'Sous-titre',
      icon: '📄',
      description: 'Ajouter un sous-titre'
    },
    {
      type: 'text',
      name: 'Texte',
      icon: '📃',
      description: 'Ajouter du texte libre'
    },
    {
      type: 'image',
      name: 'Image',
      icon: '🖼️',
      description: 'Ajouter une image'
    },
    {
      type: 'table',
      name: 'Tableau',
      icon: '📊',
      description: 'Ajouter un tableau'
    }
  ];

  addModule(type: Module['type']): void {
    const id = this.generateId();
    const order = this.nextOrder++;
    
    let newModule: Module;

    switch (type) {
      case 'title':
        newModule = {
          id,
          type: 'title',
          order,
          content: 'Nouveau titre',
          level: 1
        };
        break;
      case 'subtitle':
        newModule = {
          id,
          type: 'subtitle',
          order,
          content: 'Nouveau sous-titre'
        };
        break;
      case 'text':
        newModule = {
          id,
          type: 'text',
          order,
          content: 'Nouveau texte...',
          fontSize: 14,
          color: '#000000'
        };
        break;
      case 'image':
        newModule = {
          id,
          type: 'image',
          order,
          src: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=400',
          alt: 'Image d\'exemple',
          width: 400,
          height: 300
        };
        break;
      case 'table':
        newModule = {
          id,
          type: 'table',
          order,
          headers: ['Colonne 1', 'Colonne 2'],
          rows: [['Données 1', 'Données 2'], ['Données 3', 'Données 4']]
        };
        break;
      default:
        return;
    }

    const currentModules = this.modulesSubject.value;
    this.modulesSubject.next([...currentModules, newModule]);
  }

  updateModule(updatedModule: Module): void {
    const currentModules = this.modulesSubject.value;
    const index = currentModules.findIndex(m => m.id === updatedModule.id);
    if (index !== -1) {
      currentModules[index] = updatedModule;
      this.modulesSubject.next([...currentModules]);
    }
  }

  removeModule(id: string): void {
    const currentModules = this.modulesSubject.value;
    this.modulesSubject.next(currentModules.filter(m => m.id !== id));
  }

  moveModule(fromIndex: number, toIndex: number): void {
    const currentModules = [...this.modulesSubject.value];
    const [movedModule] = currentModules.splice(fromIndex, 1);
    currentModules.splice(toIndex, 0, movedModule);
    
    // Mettre à jour les ordres
    currentModules.forEach((module, index) => {
      module.order = index + 1;
    });
    
    this.modulesSubject.next(currentModules);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}