# Documentation Technique - MyJourney

## 📋 Vue d'ensemble du projet

**MyJourney** est une application web Angular standalone développée pour Grant Thornton, permettant la gestion des missions d'audit avec authentification Microsoft Azure AD et génération de documents PDF.

## 🏗️ Architecture générale

### Stack technologique
- **Frontend**: Angular 20 (Standalone Components)
- **Authentification**: Azure AD avec MSAL (Microsoft Authentication Library)
- **UI Framework**: Angular Material + CSS personnalisé
- **PDF Generation**: jsPDF + html2canvas
- **Drag & Drop**: Angular CDK
- **Build Tool**: Angular CLI

### Structure du projet
```
src/
├── auth/                    # Configuration authentification
├── components/              # Composants Angular standalone
├── guards/                  # Guards de routage
├── models/                  # Interfaces TypeScript
├── services/                # Services métier
├── global_styles.css        # Styles globaux
├── index.html              # Point d'entrée HTML
└── main.ts                 # Bootstrap de l'application
```

## 🔐 Système d'authentification

### Configuration Azure AD
- **Client ID**: `634d3680-46b5-48e4-bdae-b7c6ed6b218a`
- **Tenant ID**: `e1029da6-a2e7-449b-b816-9dd31f7c2d83`
- **Type**: Application à page unique (SPA)
- **Flux**: PKCE (Proof Key for Code Exchange)

### Composants d'authentification
```typescript
// auth.config.ts - Configuration MSAL
export const msalConfig: Configuration = {
  auth: {
    clientId: '634d3680-46b5-48e4-bdae-b7c6ed6b218a',
    authority: 'https://login.microsoftonline.com/e1029da6-a2e7-449b-b816-9dd31f7c2d83',
    redirectUri: 'http://localhost:4200/',
  },
  cache: {
    cacheLocation: 'sessionStorage'
  }
};
```

### Service d'authentification
- **AuthService**: Gestion centralisée de l'authentification
- **Observables**: `isAuthenticated$` et `userProfile$`
- **Microsoft Graph**: Récupération du profil et photo utilisateur
- **Gestion des tokens**: Acquisition silencieuse et renouvellement

## 🧩 Architecture des composants

### Composants standalone
Tous les composants utilisent l'architecture standalone d'Angular 20 :
```typescript
@Component({
  selector: 'app-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `...`,
  styles: [`...`]
})
```

### Hiérarchie des composants
```
AppComponent (root)
├── LoginComponent (si non authentifié)
└── Application authentifiée
    ├── NavbarComponent
    └── Contenu principal
        ├── DashboardComponent
        ├── NogEditorComponent
        │   ├── PreviewComponent
        │   ├── TextModuleComponent
        │   ├── ImageModuleComponent
        │   ├── TableModuleComponent
        │   ├── TitleModuleComponent
        │   └── SubtitleModuleComponent
        └── Autres composants métier
```

## 📊 Gestion des données

### Services métier
- **AuthService**: Authentification et profil utilisateur
- **ModuleService**: Gestion des modules NOG (CRUD)
- **PdfService**: Génération de documents PDF

### Modèles de données
```typescript
// Module interface
export interface BaseModule {
  id: string;
  type: 'text' | 'image' | 'table' | 'title' | 'subtitle';
  order: number;
}

// Types spécialisés
export type Module = TextModule | ImageModule | TableModule | TitleModule | SubtitleModule;
```

### État de l'application
- **BehaviorSubject**: Gestion réactive des modules
- **Observables**: Communication entre composants
- **Session Storage**: Persistance des tokens d'authentification

## 🎨 Système de design

### Variables CSS personnalisées
```css
:root {
  --primary-color: #226D68;
  --secondary-color: #64CEC7;
  --gray-50: #f9fafb;
  /* ... autres variables */
}
```

### Composants UI réutilisables
- **Cards**: `.card`, `.card-header`, `.card-body`
- **Boutons**: `.btn-primary`, `.btn-secondary`, `.btn-outline`
- **Badges**: `.badge-primary`, `.badge-success`, etc.
- **Inputs**: `.form-input` avec focus states

### Responsive Design
- **Mobile First**: Breakpoints à 768px et 1200px
- **Flexbox**: Layout principal avec flex
- **Grid**: Tableaux et grilles de données

## 🔄 Drag & Drop (NOG Editor)

### Angular CDK Drag Drop
```typescript
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

onModuleDrop(event: CdkDragDrop<any[]>): void {
  if (event.previousContainer === event.container) {
    // Réorganisation
    moveItemInArray(sortedModules, event.previousIndex, event.currentIndex);
  } else {
    // Ajout nouveau module
    this.moduleService.addModule(template.type);
  }
}
```

### Zones de drop connectées
- **Sidebar**: Templates de modules
- **Editor**: Zone d'édition des modules
- **Connected Lists**: Communication entre les zones

## 📄 Génération PDF

### Architecture PDF
```typescript
// PdfService
async exportToPdf(elementId: string, filename: string): Promise<void> {
  // 1. Capture HTML avec html2canvas
  const canvas = await html2canvas(element);
  
  // 2. Création PDF avec jsPDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // 3. Ajout header/footer personnalisés
  // 4. Gestion multi-pages
  // 5. Sauvegarde
}
```

### Optimisations PDF
- **Pagination automatique**: Gestion des sauts de page
- **Headers/Footers**: Ajout automatique sur chaque page
- **Qualité d'image**: Scale 2x pour la netteté
- **Gestion mémoire**: Traitement par modules

## 🚀 Build et déploiement

### Configuration Angular
```json
// angular.json
{
  "build": {
    "builder": "@angular/build:application",
    "options": {
      "outputPath": "dist/demo",
      "index": "src/index.html",
      "browser": "src/main.ts",
      "polyfills": ["zone.js"],
      "styles": ["src/global_styles.css"]
    }
  }
}
```

### Scripts disponibles
```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build"
  }
}
```

## 🔧 Configuration développement

### Prérequis
- Node.js 18+
- Angular CLI 20+
- Compte Azure AD configuré

### Variables d'environnement
- **MSAL Configuration**: Directement dans `auth.config.ts`
- **URLs de redirection**: `http://localhost:4200/`

### Démarrage local
```bash
npm install
ng serve
# Application disponible sur http://localhost:4200
```

## 📱 Fonctionnalités techniques

### Dashboard
- **Pagination**: Gestion de grandes listes de missions
- **Groupement hiérarchique**: Groupes → Clients → Missions
- **État d'expansion**: Persistance de l'état UI
- **Modales**: Gestion des statuts avec upload de fichiers

### NOG Editor
- **Modules dynamiques**: Création/édition/suppression
- **Réorganisation**: Drag & drop avec ordre persistant
- **Prévisualisation temps réel**: Synchronisation editor/preview
- **Export PDF**: Génération avec mise en page professionnelle

### Navbar
- **Navigation hiérarchique**: Groupes de fonctionnalités
- **Profil utilisateur**: Photo et informations depuis Microsoft Graph
- **Responsive**: Adaptation mobile avec collapse

## 🛡️ Sécurité

### Authentification
- **PKCE Flow**: Sécurisation des échanges de tokens
- **Session Storage**: Stockage sécurisé des tokens
- **Token Refresh**: Renouvellement automatique silencieux

### Guards
- **AuthGuard**: Protection des routes authentifiées
- **Redirection**: Gestion automatique vers login

### API Calls
- **Microsoft Graph**: Tokens d'accès pour les appels API
- **CORS**: Configuration pour les domaines Microsoft

## 📊 Performance

### Optimisations
- **Standalone Components**: Réduction du bundle size
- **OnPush Strategy**: Optimisation du change detection
- **Lazy Loading**: Chargement différé des composants
- **Tree Shaking**: Élimination du code mort

### Monitoring
- **Error Handling**: Gestion centralisée des erreurs
- **Loading States**: Indicateurs de chargement
- **Memory Management**: Unsubscribe avec takeUntil

## 🔮 Évolutions futures

### Architecture
- **State Management**: Intégration NgRx si nécessaire
- **Micro-frontends**: Découpage par domaines métier
- **PWA**: Transformation en Progressive Web App

### Fonctionnalités
- **Offline Mode**: Synchronisation hors ligne
- **Real-time**: WebSockets pour collaboration
- **API Backend**: Intégration avec APIs métier Grant Thornton

---

*Documentation générée le {{ date }} - Version 1.0*