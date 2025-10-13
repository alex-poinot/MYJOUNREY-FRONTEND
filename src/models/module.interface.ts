export interface BaseModule {
  id: string;
  type: 'text' | 'image' | 'table' | 'title' | 'subtitle';
  order: number;
}

export interface TextModule extends BaseModule {
  type: 'text';
  content: string;
  fontSize?: number;
  color?: string;
}

export interface ImageModule extends BaseModule {
  type: 'image';
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface TableModule extends BaseModule {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface TitleModule extends BaseModule {
  type: 'title';
  content: string;
  level: 1 | 2 | 3;
}

export interface SubtitleModule extends BaseModule {
  type: 'subtitle';
  content: string;
}

export type Module = TextModule | ImageModule | TableModule | TitleModule | SubtitleModule;

export interface ModuleTemplate {
  type: Module['type'];
  name: string;
  icon: string;
  description: string;
}

export interface FileWithExpiration {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  expirationDate: Date;
}

export interface NogPartie1 {
  informationsGenerales: string;
  activite: string;
  organisation: string;
  environnement: string;
  systemesInformation: string;
  donneesFinancieres: string;
  processusMetiers: string;
  gouvernance: string;
  risques: string;
  conformite: string;
  controleInterne: string;
  auditInterne: string;
  relationsExternes: string;
  objectifsStrategiques: string;
  indicateursPerformance: string;
  projetsDeveloppement: string;
  defisOpportunites: string;
  conclusionGenerale: string;
}