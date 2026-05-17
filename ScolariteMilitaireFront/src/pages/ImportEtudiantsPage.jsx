import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { uploadFileToImportApi, downloadTemplateFromApi } from '../utils/importEtudiantsBulk';
import { IMPORT_MAX_BYTES, IMPORT_MAX_LABEL } from '../utils/importExportLimits';

export default function ImportEtudiantsPage() {
  const excelInputRef = useRef(null);
  const wordInputRef  = useRef(null);
  const [busyExcel, setBusyExcel] = useState(false);
  const [busyWord,  setBusyWord]  = useState(false);
  const [statusExcel, setStatusExcel] = useState(null);
  const [statusWord,  setStatusWord]  = useState(null);

  /** Shared handler — used for both Excel and Word cards. */
  async function handleFileUpload(file, setBusy, setStatus, inputRef) {
    if (!file) return;

    if (file.size > IMPORT_MAX_BYTES) {
      window.alert(`Fichier trop volumineux. Taille maximale : ${IMPORT_MAX_LABEL}.`);
      if (inputRef.current) inputRef.current.value = '';
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
    } catch (err) {
      console.error(err);
      const detail =
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        err?.message ??
        'Import impossible.';
      setStatus({ type: 'err', text: detail });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const hintBox =
    'rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700';

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      {/* Breadcrumb */}
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">Accueil</Link>
        <span className="mx-2">/</span>
        <Link to="/eleves" className="hover:text-navy">Étudiants</Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Importer</span>
      </nav>

      {/* Header */}
      <div className="xl:col-span-12">
        <Link
          to="/eleves"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour à la liste
        </Link>
        <h1 className="page-title">Importer des étudiants</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Excel (.xlsx) ou CSV selon les modèles ci-dessous.{' '}
          Taille maximale : <strong>{IMPORT_MAX_LABEL}</strong>.
        </p>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 xl:col-span-12">
        <strong className="font-semibold">Important :</strong> une ligne par étudiant ;{' '}
        matricule, nom et prénom obligatoires pour créer un dossier.
      </div>

      {/* Import cards */}
      <div className="grid gap-8 lg:grid-cols-2 xl:col-span-12">

        {/* ── Excel card ─────────────────────────────────────────────────── */}
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
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={() => downloadTemplateFromApi('xlsx')}
              disabled={busyExcel}
            >
              Modèle Excel
            </Button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) =>
                handleFileUpload(e.target.files?.[0], setBusyExcel, setStatusExcel, excelInputRef)
              }
            />
            <Button
              type="button"
              variant="primary"
              icon={Upload}
              onClick={() => excelInputRef.current?.click()}
              disabled={busyExcel}
            >
              {busyExcel ? 'Traitement…' : 'Importer un fichier Excel'}
            </Button>
          </div>
          {statusExcel && <ImportStatusBanner status={statusExcel} />}
        </Card>

        {/* ── CSV card ───────────────────────────────────────────────────── */}
        <Card title="Import CSV (.csv)" subtitle="Format texte — séparateur point-virgule">
          <div className={hintBox}>
            <p className="font-semibold text-slate-900">Structure attendue</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs md:text-sm">
              <li>Encodage UTF-8 ou Latin-1.</li>
              <li>Séparateur <code className="rounded bg-slate-100 px-1">;</code> ou <code className="rounded bg-slate-100 px-1">,</code> — détecté automatiquement.</li>
              <li>Mêmes colonnes que le modèle Excel.</li>
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={() => downloadTemplateFromApi('csv')}
              disabled={busyWord}
            >
              Modèle CSV
            </Button>
            <input
              ref={wordInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) =>
                handleFileUpload(e.target.files?.[0], setBusyWord, setStatusWord, wordInputRef)
              }
            />
            <Button
              type="button"
              variant="gold"
              icon={Upload}
              onClick={() => wordInputRef.current?.click()}
              disabled={busyWord}
            >
              {busyWord ? 'Traitement…' : 'Importer un fichier CSV'}
            </Button>
          </div>
          {statusWord && <ImportStatusBanner status={statusWord} />}
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
