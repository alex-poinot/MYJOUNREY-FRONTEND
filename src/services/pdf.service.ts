import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
      const margin = 10;

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

      // Fonction pour ajouter footer avec numérotation temporaire
      const addFooter = (currentPage: number) => {
        const footerY = pageHeight - 10;
        
        // Ligne de séparation au-dessus du footer
        pdf.setLineWidth(0.5);
        pdf.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });
      };

      // Fonction pour créer une nouvelle page
      const addNewPage = () => {
        addFooter(pageNumber);
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
        
        // Créer un canvas pour ce module spécifique
        const canvas = await html2canvas(moduleElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: moduleElement.scrollWidth,
          height: moduleElement.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Vérifier si le module peut tenir sur la page actuelle
        if (currentY + imgHeight > pageHeight - footerHeight - margin) {
          // Le module ne peut pas tenir, créer une nouvelle page
          addNewPage();
        }

        // Ajouter l'image du module
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5; // Ajouter un petit espacement entre les modules

        // Vérifier si on a besoin d'une nouvelle page pour le prochain module
        if (i < modules.length - 1) {
          const nextModule = modules[i + 1] as HTMLElement;
          const nextCanvas = await html2canvas(nextModule, {
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: nextModule.scrollWidth,
            height: nextModule.scrollHeight
          });
          
          const nextImgHeight = (nextCanvas.height * imgWidth) / nextCanvas.width;
          
          if (currentY + nextImgHeight > pageHeight - footerHeight - margin) {
            addNewPage();
          }
        }
      }

      // Ajouter le footer à la dernière page
      addFooter(pageNumber);

      // Maintenant, mettre à jour tous les footers avec le nombre total de pages
      const totalPages = pageNumber;
      for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        
        // Effacer l'ancien footer
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
        
        // Ligne de séparation au-dessus du footer
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        
        // Nouveau footer avec le total
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Page ${page} sur ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      throw error;
    }
  }
}