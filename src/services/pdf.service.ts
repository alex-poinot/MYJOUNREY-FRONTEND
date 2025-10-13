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

      // Fonction pour vérifier si on a assez d'espace
      const checkSpace = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - footerHeight - margin) {
          addNewPage();
        }
      };

      // Première page
      addHeader();

      // Traiter chaque module séparément
      const modules = element.children;
      
      for (let i = 0; i < modules.length; i++) {
        const moduleElement = modules[i] as HTMLElement;
        
        try {
          await this.processModule(pdf, moduleElement, margin, contentWidth, currentY, checkSpace, (newY) => {
            currentY = newY;
          });
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

  private async processModule(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    currentY: number,
    checkSpace: (height: number) => void,
    updateY: (newY: number) => void
  ): Promise<void> {
    
    // Identifier le type de module
    const moduleType = moduleElement.getAttribute('data-module-type');
    
    switch (moduleType) {
      case 'title':
        await this.processTitleModule(pdf, moduleElement, margin, contentWidth, currentY, checkSpace, updateY);
        break;
      case 'subtitle':
        await this.processSubtitleModule(pdf, moduleElement, margin, contentWidth, currentY, checkSpace, updateY);
        break;
      case 'text':
        await this.processTextModule(pdf, moduleElement, margin, contentWidth, currentY, checkSpace, updateY);
        break;
      case 'table':
        await this.processTableModule(pdf, moduleElement, margin, contentWidth, currentY, checkSpace, updateY);
        break;
      case 'image':
        await this.processImageModule(pdf, moduleElement, margin, contentWidth, currentY, checkSpace, updateY);
        break;
      default:
        // Fallback: traiter comme texte
        await this.processTextModule(pdf, moduleElement, margin, contentWidth, currentY, checkSpace, updateY);
    }
  }

  private async processTitleModule(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    currentY: number,
    checkSpace: (height: number) => void,
    updateY: (newY: number) => void
  ): Promise<void> {
    const titleElement = moduleElement.querySelector('h1, h2, h3');
    if (!titleElement) return;

    const text = titleElement.textContent || '';
    const tagName = titleElement.tagName.toLowerCase();
    
    let fontSize = 16;
    let fontWeight = 'bold';
    
    switch (tagName) {
      case 'h1':
        fontSize = 18;
        break;
      case 'h2':
        fontSize = 16;
        break;
      case 'h3':
        fontSize = 14;
        break;
    }

    const lineHeight = fontSize * 0.5; // Conversion approximative mm
    checkSpace(lineHeight + 10);

    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontWeight);
    pdf.setTextColor(102, 74, 133); // Couleur primaire
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, currentY);
    
    updateY(currentY + (lines.length * lineHeight) + 10);

    // Ligne de séparation pour h1
    if (tagName === 'h1') {
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(149, 126, 170); // Couleur primaire claire
      pdf.line(margin, currentY - 5, margin + contentWidth, currentY - 5);
    }
  }

  private async processSubtitleModule(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    currentY: number,
    checkSpace: (height: number) => void,
    updateY: (newY: number) => void
  ): Promise<void> {
    const subtitleElement = moduleElement.querySelector('h4');
    if (!subtitleElement) return;

    const text = subtitleElement.textContent || '';
    const lineHeight = 6;
    
    checkSpace(lineHeight + 8);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128); // Couleur grise
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, currentY);
    
    updateY(currentY + (lines.length * lineHeight) + 8);
  }

  private async processTextModule(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    currentY: number,
    checkSpace: (height: number) => void,
    updateY: (newY: number) => void
  ): Promise<void> {
    const textElement = moduleElement.querySelector('p, div');
    if (!textElement) return;

    const text = textElement.textContent || '';
    const lineHeight = 5;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    const totalHeight = lines.length * lineHeight;
    
    checkSpace(totalHeight + 8);
    
    pdf.text(lines, margin, currentY);
    updateY(currentY + totalHeight + 8);
  }

  private async processTableModule(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    currentY: number,
    checkSpace: (height: number) => void,
    updateY: (newY: number) => void
  ): Promise<void> {
    const table = moduleElement.querySelector('table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return;

    // Calculer les largeurs des colonnes
    const firstRow = rows[0];
    const cells = Array.from(firstRow.querySelectorAll('th, td'));
    const colCount = cells.length;
    const colWidth = contentWidth / colCount;
    
    const rowHeight = 8;
    const tableHeight = rows.length * rowHeight + 10;
    
    checkSpace(tableHeight);

    pdf.setFontSize(10);
    pdf.setLineWidth(0.1);
    pdf.setDrawColor(0, 0, 0);

    let tableY = currentY;

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const isHeader = row.querySelector('th') !== null;
      
      if (isHeader) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(243, 244, 246); // Gris clair
      } else {
        pdf.setFont('helvetica', 'normal');
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(249, 250, 251); // Gris très clair
        } else {
          pdf.setFillColor(255, 255, 255); // Blanc
        }
      }

      // Dessiner le fond de la ligne
      pdf.rect(margin, tableY, contentWidth, rowHeight, 'F');

      cells.forEach((cell, colIndex) => {
        const cellX = margin + (colIndex * colWidth);
        const cellText = cell.textContent || '';
        
        // Dessiner la bordure de la cellule
        pdf.rect(cellX, tableY, colWidth, rowHeight, 'S');
        
        // Ajouter le texte
        const lines = pdf.splitTextToSize(cellText, colWidth - 4);
        pdf.text(lines[0] || '', cellX + 2, tableY + 5);
      });

      tableY += rowHeight;
    });

    updateY(tableY + 10);
  }

  private async processImageModule(
    pdf: jsPDF, 
    moduleElement: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    currentY: number,
    checkSpace: (height: number) => void,
    updateY: (newY: number) => void
  ): Promise<void> {
    const img = moduleElement.querySelector('img');
    if (!img) return;

    try {
      // Attendre que l'image soit chargée
      await this.waitForImage(img);

      // Créer un canvas pour l'image seulement
      const canvas = await html2canvas(img, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        imageTimeout: 5000
      });

      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('Image ignorée: canvas invalide');
        return;
      }

      // Calculer les dimensions pour le PDF
      const maxWidth = contentWidth;
      const maxHeight = 100; // Hauteur max en mm
      
      let imgWidth = maxWidth;
      let imgHeight = (canvas.height * maxWidth) / canvas.width;
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (canvas.width * maxHeight) / canvas.height;
      }

      checkSpace(imgHeight + 10);

      // Convertir en image
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Centrer l'image
      const imgX = margin + (contentWidth - imgWidth) / 2;
      
      pdf.addImage(imgData, 'JPEG', imgX, currentY, imgWidth, imgHeight);
      updateY(currentY + imgHeight + 10);

    } catch (error) {
      console.warn('Erreur lors du traitement de l\'image:', error);
      // Ajouter un placeholder texte
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(128, 128, 128);
      pdf.text('[Image non disponible]', margin, currentY);
      updateY(currentY + 10);
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