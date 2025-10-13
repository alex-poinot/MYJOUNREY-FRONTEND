import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
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
        pdf.setTextColor(102, 74, 133); // Couleur primaire
        pdf.text('GRANT THORNTON', pageWidth / 2, 15, { align: 'center' });
        
        // Ligne de séparation sous le header
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(102, 74, 133);
        pdf.line(margin, headerHeight, pageWidth - margin, headerHeight);
      };

      // Fonction pour ajouter footer
      const addFooter = (currentPage: number, totalPages: number) => {
        const footerY = pageHeight - 10;
        
        // Ligne de séparation au-dessus du footer
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(102, 74, 133);
        pdf.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
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

      // Traiter chaque module séparément
      const modules = element.children;
      
      for (let i = 0; i < modules.length; i++) {
        const moduleElement = modules[i] as HTMLElement;
        
        try {
          const moduleType = moduleElement.getAttribute('data-module-type');
          const estimatedHeight = await this.estimateModuleHeight(pdf, moduleElement, contentWidth);
          
          // Vérifier si on a assez d'espace
          if (currentY + estimatedHeight > pageHeight - footerHeight - margin) {
            addNewPage();
          }

          const addedHeight = await this.processModuleWithStyles(pdf, moduleElement, moduleType, margin, contentWidth, currentY);
          currentY += addedHeight + 8; // Espacement entre modules
          
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

  private async processModuleWithStyles(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    moduleType: string | null,
    margin: number, 
    contentWidth: number, 
    startY: number
  ): Promise<number> {
    
    let addedHeight = 0;

    switch (moduleType) {
      case 'title':
        addedHeight = await this.processTitleModule(pdf, moduleElement, margin, contentWidth, startY);
        break;
      case 'subtitle':
        addedHeight = await this.processSubtitleModule(pdf, moduleElement, margin, contentWidth, startY);
        break;
      case 'text':
        addedHeight = await this.processTextModule(pdf, moduleElement, margin, contentWidth, startY);
        break;
      case 'table':
        addedHeight = await this.processTableModule(pdf, moduleElement, margin, contentWidth, startY);
        break;
      case 'image':
        addedHeight = await this.processImageModule(pdf, moduleElement, margin, contentWidth, startY);
        break;
      default:
        // Fallback pour les modules non reconnus
        addedHeight = await this.processGenericModule(pdf, moduleElement, margin, contentWidth, startY);
        break;
    }

    return addedHeight;
  }

  private async processTitleModule(pdf: jsPDF, element: HTMLElement, margin: number, contentWidth: number, startY: number): Promise<number> {
    const titleElement = element.querySelector('h1, h2, h3') as HTMLElement;
    if (!titleElement) return 0;

    const text = titleElement.textContent?.trim() || '';
    const tagName = titleElement.tagName.toLowerCase();
    
    // Styles selon le niveau de titre
    let fontSize = 18;
    let fontWeight: 'normal' | 'bold' = 'bold';
    
    switch (tagName) {
      case 'h1':
        fontSize = 20;
        break;
      case 'h2':
        fontSize = 18;
        break;
      case 'h3':
        fontSize = 16;
        break;
    }

    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontWeight);
    pdf.setTextColor(102, 74, 133); // Couleur primaire

    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, startY + 8);

    // Ligne sous le titre pour H1
    if (tagName === 'h1') {
      const textHeight = lines.length * (fontSize * 0.352778); // Conversion pt to mm
      pdf.setLineWidth(0.8);
      pdf.setDrawColor(149, 126, 170); // Couleur primaire claire
      pdf.line(margin, startY + textHeight + 12, margin + contentWidth, startY + textHeight + 12);
      return textHeight + 20;
    }

    return lines.length * (fontSize * 0.352778) + 10;
  }

  private async processSubtitleModule(pdf: jsPDF, element: HTMLElement, margin: number, contentWidth: number, startY: number): Promise<number> {
    const subtitleElement = element.querySelector('h4') as HTMLElement;
    if (!subtitleElement) return 0;

    const text = subtitleElement.textContent?.trim() || '';
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128); // Couleur grise

    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, startY + 6);

    return lines.length * 5 + 8;
  }

  private async processTextModule(pdf: jsPDF, element: HTMLElement, margin: number, contentWidth: number, startY: number): Promise<number> {
    const textElement = element.querySelector('p.text-content') as HTMLElement;
    if (!textElement) return 0;

    const text = textElement.textContent?.trim() || '';
    
    // Récupérer les styles du texte
    const computedStyle = window.getComputedStyle(textElement);
    const fontSize = parseInt(computedStyle.fontSize) * 0.75 || 12; // Conversion px to pt
    const color = this.parseColor(computedStyle.color);

    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(color.r, color.g, color.b);

    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, startY + 6, { align: 'justify' });

    return lines.length * (fontSize * 0.352778) + 8;
  }

  private async processTableModule(pdf: jsPDF, element: HTMLElement, margin: number, contentWidth: number, startY: number): Promise<number> {
    const table = element.querySelector('table.preview-table') as HTMLTableElement;
    if (!table) return 0;

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return 0;

    // Calculer la largeur des colonnes
    const headerCells = rows[0].querySelectorAll('th, td');
    const colCount = headerCells.length;
    const colWidth = contentWidth / colCount;
    
    let currentTableY = startY + 5;
    const rowHeight = 8;
    const cellPadding = 2;

    // Dessiner les en-têtes
    if (rows[0].querySelector('th')) {
      // Fond gris pour l'en-tête
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, currentTableY, contentWidth, rowHeight, 'F');
      
      // Bordures
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(209, 213, 219);
      pdf.rect(margin, currentTableY, contentWidth, rowHeight);

      // Texte des en-têtes
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);

      headerCells.forEach((cell, index) => {
        const text = cell.textContent?.trim() || '';
        const cellX = margin + (index * colWidth);
        
        // Bordure verticale
        if (index > 0) {
          pdf.line(cellX, currentTableY, cellX, currentTableY + rowHeight);
        }
        
        // Texte centré dans la cellule
        const lines = pdf.splitTextToSize(text, colWidth - (cellPadding * 2));
        pdf.text(lines, cellX + cellPadding, currentTableY + 5);
      });

      currentTableY += rowHeight;
    }

    // Dessiner les lignes de données
    const dataRows = rows[0].querySelector('th') ? rows.slice(1) : rows;
    
    dataRows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td, th');
      
      // Fond alterné pour les lignes
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, currentTableY, contentWidth, rowHeight, 'F');
      }
      
      // Bordures
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(209, 213, 219);
      pdf.rect(margin, currentTableY, contentWidth, rowHeight);

      // Texte des cellules
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);

      cells.forEach((cell, cellIndex) => {
        const text = cell.textContent?.trim() || '';
        const cellX = margin + (cellIndex * colWidth);
        
        // Bordure verticale
        if (cellIndex > 0) {
          pdf.line(cellX, currentTableY, cellX, currentTableY + rowHeight);
        }
        
        // Texte dans la cellule
        const lines = pdf.splitTextToSize(text, colWidth - (cellPadding * 2));
        pdf.text(lines, cellX + cellPadding, currentTableY + 5);
      });

      currentTableY += rowHeight;
    });

    return currentTableY - startY + 5;
  }

  private async processImageModule(pdf: jsPDF, element: HTMLElement, margin: number, contentWidth: number, startY: number): Promise<number> {
    const img = element.querySelector('img') as HTMLImageElement;
    if (!img || !img.src) return 0;

    try {
      // Créer un canvas pour l'image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;

      // Attendre que l'image soit chargée
      await this.waitForImage(img);

      // Calculer les dimensions
      const maxWidth = contentWidth;
      const maxHeight = 100; // Hauteur max en mm
      
      let imgWidth = img.naturalWidth * 0.264583; // px to mm
      let imgHeight = img.naturalHeight * 0.264583;
      
      // Redimensionner si nécessaire
      if (imgWidth > maxWidth) {
        imgHeight = (imgHeight * maxWidth) / imgWidth;
        imgWidth = maxWidth;
      }
      if (imgHeight > maxHeight) {
        imgWidth = (imgWidth * maxHeight) / imgHeight;
        imgHeight = maxHeight;
      }

      // Dessiner l'image sur le canvas
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // Ajouter au PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const imgX = margin + (contentWidth - imgWidth) / 2; // Centrer
      pdf.addImage(imgData, 'JPEG', imgX, startY + 5, imgWidth, imgHeight);

      return imgHeight + 15;
    } catch (error) {
      console.warn('Erreur lors du traitement de l\'image:', error);
      return 0;
    }
  }

  private async processGenericModule(pdf: jsPDF, element: HTMLElement, margin: number, contentWidth: number, startY: number): Promise<number> {
    const text = element.textContent?.trim() || '';
    if (!text) return 0;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, startY + 6);

    return lines.length * 4.5 + 8;
  }

  private async estimateModuleHeight(pdf: jsPDF, element: HTMLElement, contentWidth: number): Promise<number> {
    const text = element.textContent?.trim() || '';
    if (!text) return 10;

    // Estimation basique basée sur le contenu
    const moduleType = element.getAttribute('data-module-type');
    
    switch (moduleType) {
      case 'title':
        return 25;
      case 'subtitle':
        return 15;
      case 'table':
        const rows = element.querySelectorAll('tr');
        return rows.length * 8 + 10;
      case 'image':
        return 60; // Estimation pour les images
      default:
        const lines = pdf.splitTextToSize(text, contentWidth);
        return lines.length * 4.5 + 10;
    }
  }

  private parseColor(colorStr: string): { r: number, g: number, b: number } {
    // Parser les couleurs RGB/RGBA
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    
    // Couleur par défaut (noir)
    return { r: 0, g: 0, b: 0 };
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
          resolve();
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
        
        setTimeout(() => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          resolve();
        }, 5000);
      }
    });
  }
}