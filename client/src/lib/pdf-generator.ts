import {
  formaterDateCourte,
  formaterDateEtHeure,
  formaterDateLongue,
  formaterHeure,
} from './dates';
import { jsPDF } from 'jspdf';
import type { Visite, RapportVisite } from '@shared/schema';
import { formaterPrix } from '@/lib/prix';

const etatGeneralLabels: Record<string, string> = {
  tres_interessant: 'Très intéressant',
  interessant: 'Intéressant',
  moyen: 'Moyen',
  peu_interessant: 'Peu intéressant',
  non_recommande: 'Non recommandé',
};


function safeString(
  value: string | number | null | undefined,
  fallback = 'N/A',
): string {
  // `ville` arrive tantôt comme identifiant numérique, tantôt comme nom.
  return value === null || value === undefined ? fallback : String(value);
}

function safeNumber(value: number | null | undefined, fallback = 0): string {
  return value != null ? String(value) : String(fallback);
}

export function generateVisiteReportPDF(visite: Visite, rapport?: RapportVisite): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport de Visite', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations de la visite', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const visiteInfo = [
    ['Date de visite:', formaterDateLongue(visite.date_visite)],
    ['Heure:', formaterHeure(visite.heure_visite)],
    ['Statut:', safeString(visite.statut_display, visite.statut ?? 'Non spécifié')],
  ];

  visiteInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, y);
    y += 6;
  });

  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Bien immobilier', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const bienDetail = visite.demande_detail?.bien_detail;
  if (bienDetail) {
    const bienInfo = [
      ['Titre:', safeString(bienDetail.titre, 'Non spécifié')],
      ['Type:', safeString(bienDetail.type_bien_display, bienDetail.type_bien ?? 'Non spécifié')],
      ['Prix mensuel:', formaterPrix(bienDetail.prix_mensuel, bienDetail.devise)],
      ['Superficie:', `${safeString(bienDetail.superficie, '0')} m²`],
      ['Chambres:', safeNumber(bienDetail.nombre_chambres)],
      ['Salles de bain:', safeNumber(bienDetail.nombre_salles_bain)],
      ['Adresse:', `${safeString(bienDetail.quartier, '')}, ${safeString(bienDetail.ville, '')}`],
    ];

    bienInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(value, pageWidth - margin * 2 - 50);
      doc.text(textLines, margin + 50, y);
      y += 6 * textLines.length;
    });
  }

  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Participants', margin, y);
  y += 8;

  doc.setFontSize(11);
  const client = visite.demande_detail?.client;
  if (client) {
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${safeString(client.first_name, '')} ${safeString(client.last_name, '')}`.trim() || 'Non spécifié', margin + 50, y);
    y += 6;
  }

  if (visite.agent_detail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Agent:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${safeString(visite.agent_detail.first_name, '')} ${safeString(visite.agent_detail.last_name, '')}`.trim() || 'Non spécifié', margin + 50, y);
    y += 6;
  }

  if (visite.commissionnaire_detail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Commissionnaire:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${safeString(visite.commissionnaire_detail.first_name, '')} ${safeString(visite.commissionnaire_detail.last_name, '')}`.trim() || 'Non spécifié', margin + 50, y);
    y += 6;
  }

  if (rapport) {
    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Évaluation du bien', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('État général:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(etatGeneralLabels[rapport.etat_general] || rapport.etat_general, margin + 50, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Conforme à l\'annonce:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(rapport.conformite_annonce ? 'Oui' : 'Non', margin + 50, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Client intéressé:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(rapport.client_interesse ? 'Oui' : 'Non', margin + 50, y);
    y += 10;

    const textSections = [
      { title: 'Points positifs', content: rapport.points_positifs },
      { title: 'Points négatifs', content: rapport.points_negatifs },
      { title: 'Recommandations', content: rapport.recommandations },
      { title: 'Commentaires', content: rapport.commentaires },
    ];

    textSections.forEach(({ title, content }) => {
      if (content) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(`${title}:`, margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(content, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += 6 * lines.length + 4;
      }
    });

    const technicalDetails = [
      { label: 'État électricité', value: rapport.etat_electricite },
      { label: 'État plomberie', value: rapport.etat_plomberie },
      { label: 'État peinture', value: rapport.etat_peinture },
      { label: 'État sols', value: rapport.etat_sols },
      { label: 'État fenêtres', value: rapport.etat_fenetres },
      { label: 'État portes', value: rapport.etat_portes },
      { label: 'Accessibilité', value: rapport.accessibilite },
      { label: 'Environnement', value: rapport.environnement },
    ].filter(item => item.value);

    if (technicalDetails.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      y += 5;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Détails techniques', margin, y);
      y += 8;

      doc.setFontSize(11);
      technicalDetails.forEach(({ label, value }) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value!, pageWidth - margin * 2 - 50);
        doc.text(lines, margin + 50, y);
        y += 6 * lines.length;
      });
    }
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Généré le ${formaterDateEtHeure(new Date())}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  doc.text('VillaGo - Plateforme de location immobilière', pageWidth / 2, pageHeight - 5, { align: 'center' });

  const filename = `rapport-visite-${visite.id}-${visite.date_visite}.pdf`;
  doc.save(filename);
}

export function generateVisiteSummaryPDF(visites: Visite[]): boolean {
  if (!visites || visites.length === 0) {
    return false;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif des Visites', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(`Généré le ${formaterDateCourte(new Date())}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 10;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const completed = visites.filter(v => v.statut === 'terminee').length;
  const planned = visites.filter(v => v.statut === 'planifiee').length;
  const inProgress = visites.filter(v => v.statut === 'en_cours').length;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistiques', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total des visites: ${visites.length}`, margin, y);
  y += 6;
  doc.text(`Terminées: ${completed}`, margin, y);
  y += 6;
  doc.text(`Planifiées: ${planned}`, margin, y);
  y += 6;
  doc.text(`En cours: ${inProgress}`, margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des visites', margin, y);
  y += 10;

  visites.forEach((visite, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 24, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const titre = visite.demande_detail?.bien_detail?.titre || 'Bien non spécifié';
    doc.text(`${index + 1}. ${titre}`, margin + 2, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Date: ${formaterDateLongue(visite.date_visite)} à ${formaterHeure(visite.heure_visite)}`, margin + 2, y);
    y += 5;
    const quartier = safeString(visite.demande_detail?.bien_detail?.quartier, '');
    const ville = safeString(visite.demande_detail?.bien_detail?.ville, '');
    const lieu = [quartier, ville].filter(Boolean).join(', ') || 'Lieu non spécifié';
    doc.text(`Lieu: ${lieu}`, margin + 2, y);
    y += 5;
    doc.text(`Statut: ${safeString(visite.statut_display, visite.statut ?? 'Non spécifié')}`, margin + 2, y);
    y += 12;
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('VillaGo - Plateforme de location immobilière', pageWidth / 2, pageHeight - 5, { align: 'center' });

  const filename = `recapitulatif-visites-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return true;
}
