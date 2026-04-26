import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  eleves,
  appels,
  presenceParSection,
  kpiScolarite,
  inscriptionsParFiliere,
} from '../data/mockData';
import { INSTITUTION } from '../data/institution';

const SLUG = (s) => String(s || 'export').replace(/[^\w-]+/g, '_').slice(0, 80);

function rowsInscriptions() {
  const rows = inscriptionsParFiliere.map((f) => [f.filiere, f.confirmees, f.enAttente, f.confirmees + f.enAttente]);
  return { head: [['Filière / département', 'Inscriptions validées', 'En attente', 'Total']], body: rows };
}

function rowsSuspendus() {
  const s = eleves.filter((e) => e.statut === 'suspendu');
  return {
    head: [['Matricule', 'Nom', 'Prénom', 'Filière', 'Motif (extrait)']],
    body: s.map((e) => [
      e.matricule,
      e.nom,
      e.prenom,
      e.filiere,
      (e.suspension?.motif || '—').slice(0, 60),
    ]),
  };
}

function rowsPresence() {
  const a = appels.slice(0, 14);
  return {
    head: [['Date', 'Type', 'Section', 'Effectif', 'Présents', 'Absents', 'Statut']],
    body: a.map((x) => [
      new Date(x.date).toLocaleDateString('fr-FR'),
      x.type,
      x.section,
      String(x.total),
      String(x.presents),
      String(x.absents),
      x.statut === 'en_cours' ? 'En cours' : 'Transmis',
    ]),
  };
}

function getTable(rapportType) {
  if (rapportType === 'inscriptions') return rowsInscriptions();
  if (rapportType === 'suspendus') return rowsSuspendus();
  if (rapportType === 'presence') return rowsPresence();
  return { head: [['—']], body: [['Aucun jeu de données']] };
}

const TITRES = {
  inscriptions: "Rapport — Synthèse des inscriptions (par filière)",
  suspendus: "Rapport — Étudiants en suspension",
  presence: "Rapport — Présence & appels (extraits récents)",
};

/**
 * @param {'inscriptions'|'suspendus'|'presence'} rapportType
 * @param {'pdf'|'pptx'|'xlsx'} format
 */
export async function exportRapportDashboard(rapportType, format) {
  const { head, body } = getTable(rapportType);
  const title = TITRES[rapportType] || 'Rapport';
  const kpi = [
    `Établissement : ${INSTITUTION.nomComplet} (${INSTITUTION.pays})`,
    `Généré le : ${new Date().toLocaleString('fr-FR')}`,
    `Indicateurs : étudiants actifs (KPI) ${kpiScolarite.etudiantsActifs} · inscriptions en attente ${kpiScolarite.inscriptionsEnAttente} · absences (alerte) voir section présence`,
  ];

  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(12);
    doc.text(title, 14, 14);
    doc.setFontSize(9);
    let y = 22;
    kpi.forEach((l) => {
      doc.text(l, 14, y);
      y += 4;
    });
    autoTable(doc, {
      head,
      body,
      startY: y + 4,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [27, 42, 74] },
    });
    doc.save(`Rapport_${rapportType}_${SLUG(new Date().toISOString())}.pdf`);
    return;
  }

  if (format === 'xlsx') {
    const aoa = [[title], [], ...kpi.map((l) => [l]), [], ...head, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    saveAs(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Rapport_${rapportType}.xlsx`,
    );
    return;
  }

  if (format === 'pptx') {
    const pptx = new PptxGenJS();
    pptx.title = title;
    const slide1 = pptx.addSlide();
    slide1.addText(INSTITUTION.nomComplet, { x: 0.5, y: 0.3, w: 12, fontSize: 14, color: '1B2A4A', bold: true });
    slide1.addText(title, { x: 0.5, y: 0.75, w: 12, fontSize: 20, bold: true });
    slide1.addText(kpi.join('\n'), { x: 0.5, y: 1.4, w: 12, fontSize: 10, color: '444444' });

    const tableData = [head[0], ...body];
    slide1.addTable(tableData, {
      x: 0.4,
      y: 2.3,
      w: 12.2,
      fontSize: 8,
      colW: head[0].map(() => 12.2 / head[0].length),
    });

    if (rapportType === 'presence') {
      const s2 = pptx.addSlide();
      s2.addText("Répartition par section (taux indicatif)", { x: 0.5, y: 0.35, fontSize: 16, bold: true });
      s2.addTable(
        [
          ['Section', 'Taux (%)', 'Effectif (référence)'],
          ...presenceParSection.map((p) => [p.section, String(p.taux), String(p.effectif)]),
        ],
        { x: 0.5, y: 1, w: 12, fontSize: 9 },
      );
    }
    if (rapportType === 'inscriptions') {
      const s2 = pptx.addSlide();
      s2.addText("Contexte pédagogique (IRT — référence publique)", { x: 0.5, y: 0.35, fontSize: 14, bold: true });
      s2.addText(
        "Compétences et débouchés : développement logiciel, systèmes d'information, réseaux & sécurité. Voir le site officiel de la filière IRT pour le détail de l'offre de formation.",
        { x: 0.5, y: 0.85, w: 12, fontSize: 10 },
      );
    }

    const out = await pptx.write({ outputType: 'blob' });
    saveAs(out, `Rapport_${rapportType}.pptx`);
  }
}
