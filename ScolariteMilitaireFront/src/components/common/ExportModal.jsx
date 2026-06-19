import { FileDown, FileSpreadsheet } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * Modale réutilisable pour confirmer un export PDF ou Excel.
 */
export default function ExportModal({
  open,
  onClose,
  title = 'Exporter les données',
  subtitle,
  studentCount = 0,
  columnCount = 0,
  busy = null,
  onExportExcel,
  onExportPdf,
  excelLabel = 'Exporter Excel',
  pdfLabel = 'Exporter PDF',
}) {
  const disabled = !!busy || studentCount < 1 || columnCount < 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={!!busy}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={onExportPdf}
          >
            <FileDown size={18} className="mr-1.5" aria-hidden />
            {busy === 'pdf' ? 'Export…' : pdfLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={disabled}
            onClick={onExportExcel}
          >
            <FileSpreadsheet size={18} className="mr-1.5" aria-hidden />
            {busy === 'xlsx' ? 'Export…' : excelLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-slate-700">
        <p>
          Vous allez exporter{' '}
          <strong className="text-navy">{studentCount}</strong> étudiant
          {studentCount > 1 ? 's' : ''} avec{' '}
          <strong className="text-navy">{columnCount}</strong> colonne
          {columnCount > 1 ? 's' : ''}.
        </p>
        {studentCount < 1 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            Sélectionnez au moins un étudiant avant d&apos;exporter.
          </p>
        ) : null}
        {columnCount < 1 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            Choisissez au moins une colonne via le bouton « Colonnes ».
          </p>
        ) : null}
        <p className="text-xs text-slate-500">
          Excel : registre transposé (libellés en lignes, étudiants en colonnes), sans mensurations.
          PDF : tableau classique avec en-tête officiel ESP.
        </p>
        <p className="text-xs text-slate-500">
          Le fichier sera téléchargé sur votre appareil. Vérifiez les filtres appliqués avant
          l&apos;export.
        </p>
      </div>
    </Modal>
  );
}
