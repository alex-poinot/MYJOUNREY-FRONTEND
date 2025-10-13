import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Module } from '../models/module.interface';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  
  async exportToPdf(elementId: string, filename: string = 'document.pdf'): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      // Attendre que toutes les images soient chargées
      await this.waitForImages(element);

      // Format A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      
      // Marges pour header et footer
      const headerHeight = 20;
      const footerHeight = 20;
      const contentHeight = pageHeight - headerHeight - footerHeight;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);

      let currentY = headerHeight + margin;
      let pageNumber = 1;

      // Fonction pour ajouter header
      const addHeader = () => {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('GRANT THORNTON', pageWidth / 2, 15, { align: 'center' });
        
        // Ligne de séparation sous le header
        pdf.setLineWidth(0.5);
        pdf.line(margin, headerHeight, pageWidth - margin, headerHeight);
      };

      // Fonction pour ajouter footer
      const addFooter = (currentPage: number, totalPages: number) => {
        const footerY = pageHeight - 10;
        
        // Ligne de séparation au-dessus du footer
        pdf.setLineWidth(0.5);
        pdf.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${currentPage} sur ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
      };

      // Fonction pour créer une nouvelle page
      const addNewPage = () => {
        pdf.addPage();
        pageNumber++;
        addHeader();
        currentY = headerHeight + margin;
      };

      // Première page
      addHeader();

      // Traiter chaque module séparément avec approche hybride
      const modules = element.children;
      
      for (let i = 0; i < modules.length; i++) {
        const moduleElement = modules[i] as HTMLElement;
        
        try {
          // Vérifier si on a assez d'espace (estimation)
          const moduleHeight = moduleElement.offsetHeight * 0.264583; // Conversion px to mm
          if (currentY + moduleHeight > pageHeight - footerHeight - margin) {
            addNewPage();
          }

          await this.processModuleHybrid(pdf, moduleElement, margin, contentWidth, currentY);
          currentY += moduleHeight + 5; // Espacement entre modules
          
        } catch (moduleError) {
          console.warn(`Erreur lors du traitement du module ${i}:`, moduleError);
          continue;
        }
      }

      // Calculer le nombre total de pages
      const totalPages = pageNumber;
      
      // Ajouter les footers à toutes les pages
      for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        addFooter(page, totalPages);
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      throw new Error('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  }

  private async processModuleHybrid(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    currentY: number
  ): Promise<void> {
    
    try {
      // 1. Capturer l'apparence visuelle avec html2canvas
      const canvas = await html2canvas(moduleElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        removeContainer: true,
        foreignObjectRendering: false,
        ignoreElements: (element) => {
          return element.classList.contains('drag-handle') || 
                 element.classList.contains('module-actions');
        }
      });

      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('Module ignoré: canvas invalide');
        return;
      }

      // Calculer les dimensions pour le PDF
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      // Ajouter l'image de fond (apparence visuelle)
      let imgData: string;
      try {
        imgData = canvas.toDataURL('image/jpeg', 0.9);
      } catch (pngError) {
        console.warn('Erreur PNG, tentative en JPEG:', pngError);
        imgData = canvas.toDataURL('image/jpeg', 0.8);
      }
      
      pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight);

      // 2. Ajouter le texte invisible sélectionnable par-dessus
      await this.addSelectableTextOverlay(pdf, moduleElement, margin, currentY, contentWidth, imgHeight);

    } catch (error) {
      console.warn('Erreur lors du traitement hybride du module:', error);
      // Fallback: ajouter juste le texte visible
      await this.addFallbackText(pdf, moduleElement, margin, currentY, contentWidth);
    }
  }

  private async addSelectableTextOverlay(
    pdf: jsPDF,
    moduleElement: HTMLElement,
    margin: number,
    startY: number,
    contentWidth: number,
    moduleHeight: number
  ): Promise<void> {
    
    // Extraire tout le texte du module
    const textContent = this.extractTextContent(moduleElement);
    
    if (!textContent.trim()) return;

    // Configurer le texte invisible
    pdf.setTextColor(255, 255, 255, 0); // Texte transparent
    pdf.setFontSize(1); // Très petite taille pour être invisible
    
    // Diviser le texte en lignes qui correspondent à la largeur
    const lines = pdf.splitTextToSize(textContent, contentWidth);
    
    // Calculer l'espacement vertical pour couvrir toute la hauteur du module
    const lineSpacing = moduleHeight / Math.max(lines.length, 1);
    
    // Ajouter chaque ligne de texte invisible
    lines.forEach((line: string, index: number) => {
      const y = startY + (index * lineSpacing) + 5;
      pdf.text(line, margin, y);
    });
    
    // Remettre la couleur normale pour les prochains éléments
    pdf.setTextColor(0, 0, 0, 1);
    pdf.setFontSize(12);
  }

  private extractTextContent(element: HTMLElement): string {
    // Extraire le texte de manière intelligente selon le type d'élément
    const texts: string[] = [];
    
    // Titres
    const titles = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    titles.forEach(title => {
      const text = title.textContent?.trim();
      if (text) texts.push(text);
    });
    
    // Paragraphes et texte
    const paragraphs = element.querySelectorAll('p, div.text-content');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim();
      if (text && !texts.includes(text)) texts.push(text);
    });
    
    // Tableaux
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowText = Array.from(cells).map(cell => cell.textContent?.trim() || '').join(' | ');
        if (rowText.trim()) texts.push(rowText);
      });
    });
    
    // Si aucun texte spécifique trouvé, prendre tout le contenu textuel
    if (texts.length === 0) {
      const allText = element.textContent?.trim();
      if (allText) texts.push(allText);
    }
    
    return texts.join('\n');
  }

  private async addFallbackText(
    pdf: jsPDF,
    moduleElement: HTMLElement,
    margin: number,
    currentY: number,
    contentWidth: number
  ): Promise<void> {
    
    const textContent = this.extractTextContent(moduleElement);
    if (!textContent.trim()) return;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    const lines = pdf.splitTextToSize(textContent, contentWidth);
    pdf.text(lines, margin, currentY + 10);
  }

  private async waitForImages(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => this.waitForImage(img));
    
    try {
      await Promise.allSettled(imagePromises);
    } catch (error) {
      console.warn('Certaines images n\'ont pas pu être chargées:', error);
    }
  }

  private async waitForImage(img: HTMLImageElement): Promise<void> {
    return new Promise<void>((resolve) => {
      if (img.complete && img.naturalHeight !== 0) {
        resolve();
      } else {
        const onLoad = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          resolve(); // Résoudre même en cas d'erreur
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
        
        // Timeout de sécurité
        setTimeout(() => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          resolve();
        }, 5000);
      }
    });
  }
}