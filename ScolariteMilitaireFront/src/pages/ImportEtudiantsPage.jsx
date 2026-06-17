import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import FileUploadField from '../components/common/FileUploadField';
import { useToast } from '../context/ToastContext';
import { uploadFileToImportApi, downloadTemplateFromApi } from '../utils/importEtudiantsBulk';
import { IMPORT_MAX_LABEL } from '../utils/importExportLimits';
import { validateImportFile } from '../utils/validateImportFile';
import { humanizeError } from '../utils/apiErrors';

export default function ImportEtudiantsPage() {
  const toast = useToast();
  const [busyExcel, setBusyExcel] = useState(false);
  const [busyCsv, setBusyCsv] = useState(false);
  const [statusExcel, setStatusExcel] = useState(null);
  const [statusCsv, setStatusCsv] = useState(null);

  async function handleTemplateDownload(type) {
    try {
      await downloadTemplateFromApi(type);
      toast.success('Modèle téléchargé.');
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }

  async function handleFileUpload(file, setBusy, setStatus) {
    if (!file) return;

    const check = validateImportFile(file);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    setBusy(true);
    setStatus(null);

    try {
      const { ok, skipped, errors } = await uploadFileToImportApi(file);
      setStatus({
        type: errors.length > 0 ? (ok > 0 ? 'warn' : 'err') : 'ok',
        text: `${ok} étudiant(s) créé(s)${skipped ? `, ${skipped} ignoré(s)` : ''}.${
          errors.length ? ` ${errors.length} erreur(s).` : ''
        }${ok ? ' Retournez à la liste pour voir les dossiers.' : ''}`,
        errors,
      });
      if (errors.length === 0 && ok > 0) {
        toast.success(`${ok} étudiant(s) importé(s) avec succès.`);
      } else if (ok > 0) {
        toast.warning(`Import partiel : ${ok} créé(s), ${errors.length} erreur(s).`);
      } else {
        toast.error('Aucun étudiant importé. Vérifiez le fichier.');
      }
    } catch (err) {
      console.error(err);
      const detail = humanizeError(err);
      setStatus({ type: 'err', text: detail });
      toast.error(detail);
    } finally {
      setBusy(false);
    }
  }

  const hintBox =
    'rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700';

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">Accueil</Link>
        <span className="mx-2">/</span>
        <Link to="/gestion-eleves" className="hover:text-navy">Gestion des élèves</Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Importer</span>
      </nav>

      <div className="xl:col-span-12">
        <Link
          to="/gestion-eleves"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour à la liste
        </Link>
        <h1 className="page-title">Importer des étudiants</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Excel (.xlsx) ou CSV selon les modèles ci-dessous. Import <strong>local</strong> (navigateur) :
          les dossiers sont enregistrés ici et apparaissent dans la liste avec fiche complète au clic.
          Taille maximale : <strong>{IMPORT_MAX_LABEL}</strong>.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 xl:col-span-12">
        <strong className="font-semibold">Important :</strong> une ligne par étudiant ; matricule,
        nom et prénom obligatoires pour créer un dossier.
      </div>

      <div className="grid gap-8 lg:grid-cols-2 xl:col-span-12">
        <Card title="Import Excel (.xlsx)" subtitle="Recommandé pour les volumes et les corrections">
          <div className={hintBox}>
            <p className="font-semibold text-slate-900">Structure attendue</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs md:text-sm">
              <li>Première ligne : libellés du modèle (sans fusion).</li>
              <li>Dates : <code className="rounded bg-slate-100 px-1">AAAA-MM-JJ</code>.</li>
              <li>Département : code court (IRT, GE, GM, GC-HE, SID, MPG).</li>
              <li>Niveau : 3, 4, 4-DD, 4-E ou 5-DD.</li>
            </ul>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={() => handleTemplateDownload('xlsx')}
              disabled={busyExcel}
            >
              Télécharger le modèle Excel
            </Button>
          </div>
          <div className="mt-4">
            <FileUploadField
              label="Fichier Excel"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hint={`Excel (.xlsx) · max. ${IMPORT_MAX_LABEL}`}
              validateFn={validateImportFile}
              disabled={busyExcel}
              onChange={(file) => handleFileUpload(file, setBusyExcel, setStatusExcel)}
            />
          </div>
          {busyExcel ? (
            <p className="mt-2 text-sm font-medium text-navy">Traitement en cours…</p>
          ) : null}
          {statusExcel && <ImportStatusBanner status={statusExcel} />}
        </Card>

        <Card title="Import CSV (.csv)" subtitle="Format texte — séparateur point-virgule">
          <div className={hintBox}>
            <p className="font-semibold text-slate-900">Structure attendue</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs md:text-sm">
              <li>Encodage UTF-8 ou Latin-1.</li>
              <li>Séparateur <code className="rounded bg-slate-100 px-1">;</code> ou <code className="rounded bg-slate-100 px-1">,</code>.</li>
              <li>Mêmes colonnes que le modèle Excel.</li>
            </ul>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={() => handleTemplateDownload('csv')}
              disabled={busyCsv}
            >
              Télécharger le modèle CSV
            </Button>
          </div>
          <div className="mt-4">
            <FileUploadField
              label="Fichier CSV"
              accept=".csv,text/csv"
              hint={`CSV (.csv) · max. ${IMPORT_MAX_LABEL}`}
              validateFn={validateImportFile}
              disabled={busyCsv}
              onChange={(file) => handleFileUpload(file, setBusyCsv, setStatusCsv)}
            />
          </div>
          {busyCsv ? (
            <p className="mt-2 text-sm font-medium text-navy">Traitement en cours…</p>
          ) : null}
          {statusCsv && <ImportStatusBanner status={statusCsv} />}
        </Card>
      </div>
    </div>
  );
}

function ImportStatusBanner({ status }) {
  const cls =
    status.type === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
      : status.type === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-red-200 bg-red-50 text-red-900';

  return (
    <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>
      <p>{status.text}</p>
      {status.errors?.length > 0 && (
        <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs">
          {status.errors.slice(0, 15).map((err, idx) => (
            <li key={idx}>
              Ligne {err.ligne} : {err.message}
            </li>
          ))}
          {status.errors.length > 15 && (
            <li>… et {status.errors.length - 15} autre(s) erreur(s).</li>
          )}
        </ul>
      )}
    </div>
  );
}
