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
        
        try {
          // Créer un canvas pour ce module spécifique avec options robustes
          const canvas = await html2canvas(moduleElement, {
            scale: 1.5, // Réduire le scale pour éviter les problèmes de mémoire
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: moduleElement.scrollWidth,
            height: moduleElement.scrollHeight,
            logging: false, // Désactiver les logs
            imageTimeout: 5000, // Timeout pour les images
            removeContainer: true,
            foreignObjectRendering: false, // Désactiver le rendu des objets étrangers
            ignoreElements: (element) => {
              // Ignorer les éléments problématiques
              return element.tagName === 'IFRAME' || 
                     element.tagName === 'OBJECT' || 
                     element.tagName === 'EMBED' ||
                     element.classList.contains('ignore-pdf');
            }
          });

          // Vérifier que le canvas est valide
          if (!canvas || canvas.width === 0 || canvas.height === 0) {
            console.warn(`Module ${i} ignoré: canvas invalide`);
            continue;
          }

          // Convertir en image avec gestion d'erreur
          let imgData: string;
          try {
            imgData = canvas.toDataURL('image/png', 0.8); // Réduire la qualité
          } catch (canvasError) {
            console.warn(`Erreur lors de la conversion canvas pour le module ${i}:`, canvasError);
            // Essayer avec JPEG en fallback
            try {
              imgData = canvas.toDataURL('image/jpeg', 0.8);
            } catch (jpegError) {
              console.warn(`Module ${i} ignoré: impossible de convertir en image`);
              continue;
            }
          }

          const imgWidth = pageWidth - (2 * margin);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Vérifier si le module peut tenir sur la page actuelle
          if (currentY + imgHeight > pageHeight - footerHeight - margin) {
            // Le module ne peut pas tenir, créer une nouvelle page
            addNewPage();
          }

          // Ajouter l'image du module
          const imageFormat = imgData.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
          pdf.addImage(imgData, imageFormat, margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 5; // Ajouter un petit espacement entre les modules

        } catch (moduleError) {
          console.warn(`Erreur lors du traitement du module ${i}:`, moduleError);
          // Continuer avec le module suivant
          continue;
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
      // Ne pas relancer l'erreur, mais informer l'utilisateur
      throw new Error('Erreur lors de la génération du PDF. Veuillez réessayer ou vérifier que toutes les images sont accessibles.');
    }
  }

  private async waitForImages(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      return new Promise<void>((resolve) => {
        if (img.complete) {
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
            console.warn('Image failed to load:', img.src);
            resolve(); // Résoudre même en cas d'erreur pour ne pas bloquer
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
    });

    await Promise.all(imagePromises);
  }
}