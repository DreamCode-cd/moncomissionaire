import {
  formaterDateCourte,
  formaterDateEtHeure,
  formaterDateLongue,
  formaterHeure,
} from './dates';
import { t } from '@/i18n';
import { libelleTypeBien } from './annonce';
import { lireStatut } from './statuts';
import { jsPDF } from 'jspdf';
import type { Visite, RapportVisite } from '@shared/schema';
import { formaterPrix } from '@/lib/prix';
import { nomAffiche } from '@/lib/utils';
import { lieuVisite } from '@/lib/visite';

const etatGeneralLabels: Record<string, string> = {
  get tres_interessant() { return t('statut.appreciation.tres_interessant'); },
  get interessant() { return t('statut.appreciation.interessant'); },
  get moyen() { return t('statut.appreciation.moyen'); },
  get peu_interessant() { return t('statut.appreciation.peu_interessant'); },
  get non_recommande() { return t('statut.appreciation.non_recommande'); },
};


function safeString(
  value: string | number | null | undefined,
  fallback = 'N/A',
): string {
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
  doc.text(t('pdf.rapport'), pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t('pdf.infosVisite'), margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const visiteInfo = [
    [t('pdf.dateVisite'), formaterDateLongue(visite.date_visite)],
    [t('pdf.heure'), formaterHeure(visite.heure_visite)],
    [t('pdf.statut'), lireStatut('visite', visite.statut).libelle],
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
  doc.text(t('pdf.bien'), margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const bienDetail = visite.demande_detail?.bien_detail;
  if (bienDetail) {
    const bienInfo = [
      [t('pdf.titre'), safeString(bienDetail.titre, t('pdf.nonSpecifie'))],
      [t('pdf.type'), libelleTypeBien(bienDetail.type_bien)],
      [t('pdf.prix'), formaterPrix(bienDetail.prix_mensuel, bienDetail.devise)],
      [t('pdf.superficie'), `${safeString(bienDetail.superficie, '0')} m²`],
      [t('pdf.chambres'), safeNumber(bienDetail.nombre_chambres)],
      [t('pdf.sallesBain'), safeNumber(bienDetail.nombre_salles_bain)],
      [t('pdf.adresse'), [lieuVisite(visite).adresse, lieuVisite(visite).secteur].filter(Boolean).join(', ') || t('pdf.nonSpecifiee')],
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
  doc.text(t('pdf.participants'), margin, y);
  y += 8;

  doc.setFontSize(11);
  const client = visite.demande_detail?.client;
  if (client) {
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.client'), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(nomAffiche(client, t('pdf.nonSpecifie')), margin + 50, y);
    y += 6;
  }

  if (visite.agent_detail) {
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.agent'), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(nomAffiche(visite.agent_detail, t('pdf.nonSpecifie')), margin + 50, y);
    y += 6;
  }

  if (visite.commissionnaire_detail) {
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.suiviePar'), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(nomAffiche(visite.commissionnaire_detail, t('pdf.nonSpecifie')), margin + 50, y);
    y += 6;
  }

  if (rapport) {
    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.evaluation'), margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.appreciation'), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(etatGeneralLabels[rapport.etat_general] || rapport.etat_general, margin + 50, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.conforme'), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(rapport.conformite_annonce ? t('pdf.oui') : t('pdf.non'), margin + 50, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.interesse'), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(rapport.client_interesse ? t('pdf.oui') : t('pdf.non'), margin + 50, y);
    y += 10;

    const textSections = [
      { title: t('pdf.positifs'), content: rapport.points_positifs },
      { title: t('pdf.negatifs'), content: rapport.points_negatifs },
      { title: t('pdf.recommandations'), content: rapport.recommandations },
      { title: t('pdf.commentaires'), content: rapport.commentaires },
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
      { label: t('pdf.electricite'), value: rapport.etat_electricite },
      { label: t('pdf.plomberie'), value: rapport.etat_plomberie },
      { label: t('pdf.peinture'), value: rapport.etat_peinture },
      { label: t('pdf.sols'), value: rapport.etat_sols },
      { label: t('pdf.fenetres'), value: rapport.etat_fenetres },
      { label: t('pdf.portes'), value: rapport.etat_portes },
      { label: t('pdf.accessibilite'), value: rapport.accessibilite },
      { label: t('pdf.environnement'), value: rapport.environnement },
    ].filter(item => item.value);

    if (technicalDetails.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      y += 5;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.details'), margin, y);
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
    t('pdf.genereLe', { date: formaterDateEtHeure(new Date()) }),
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  doc.text(t('pdf.pied'), pageWidth / 2, pageHeight - 5, { align: 'center' });

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
  doc.text(t('pdf.recap'), pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(t('pdf.genereLe', { date: formaterDateCourte(new Date()) }), pageWidth / 2, y, { align: 'center' });
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
  doc.text(t('pdf.statistiques'), margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(t('pdf.total', { n: visites.length }), margin, y);
  y += 6;
  doc.text(t('pdf.terminees', { n: completed }), margin, y);
  y += 6;
  doc.text(t('pdf.planifiees', { n: planned }), margin, y);
  y += 6;
  doc.text(t('pdf.enCours', { n: inProgress }), margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(t('pdf.liste'), margin, y);
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
    const titre = visite.demande_detail?.bien_detail?.titre || t('pdf.bienNonSpecifie');
    doc.text(`${index + 1}. ${titre}`, margin + 2, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(t('pdf.date', { quand: t('date.dateEtHeure', { date: formaterDateLongue(visite.date_visite), heure: formaterHeure(visite.heure_visite) }) }), margin + 2, y);
    y += 5;
    const lieu = lieuVisite(visite).secteur || t('pdf.lieuNonSpecifie');
    doc.text(t('pdf.lieu', { lieu }), margin + 2, y);
    y += 5;
    doc.text(t('pdf.statutValeur', { statut: lireStatut('visite', visite.statut).libelle }), margin + 2, y);
    y += 12;
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(t('pdf.pied'), pageWidth / 2, pageHeight - 5, { align: 'center' });

  const filename = `recapitulatif-visites-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return true;
}
