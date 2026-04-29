import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import {
  downloadExcelImportTemplate,
  downloadWordImportTemplate,
  parseWordDocxTableRows,
  runBulkImport,
} from '../utils/importEtudiantsBulk';
import { eleveService } from '../services/eleveService';
import { IMPORT_MAX_BYTES, IMPORT_MAX_LABEL } from '../utils/importExportLimits';

export default function ImportEtudiantsPage() {
  const excelInputRef = useRef(null);
  const wordInputRef = useRef(null);
  const [busyExcel, setBusyExcel] = useState(false);
  const [busyWord, setBusyWord] = useState(false);
  const [statusExcel, setStatusExcel] = useState(null);
  const [statusWord, setStatusWord] = useState(null);

  function guardSize(file) {
    if (file.size > IMPORT_MAX_BYTES) {
      window.alert(`Fichier trop volumineux. Taille maximale : ${IMPORT_MAX_LABEL}.`);
      return false;
    }
    return true;
  }

  async function handleExcelFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!guardSize(file)) {
      if (excelInputRef.current) excelInputRef.current.value = '';
      return;
    }
    setBusyExcel(true);
    setStatusExcel(null);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const filtered = rows.filter((r) => {
        const m = String(r.matricule ?? r.Matricule ?? '').trim();
        return m && !m.startsWith('ESP-DEMO');
      });
      if (!filtered.length) {
        setStatusExcel({
          type: 'err',
          text: 'Aucune ligne importable (vérifiez les colonnes ou supprimez la ligne d’exemple ESP-DEMO).',
        });
        return;
      }
      const { ok, errors } = await runBulkImport(filtered, eleveService);
      setStatusExcel({
        type: errors.length ? 'warn' : 'ok',
        text: `${ok} étudiant(s) créé(s). ${errors.length ? `${errors.length} erreur(s). ` : ''}${ok ? 'Retournez à la liste pour voir les dossiers.' : ''}`,
        errors,
      });
    } catch (err) {
      console.error(err);
      setStatusExcel({ type: 'err', text: err?.message ?? 'Import Excel impossible.' });
    } finally {
      setBusyExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  }

  async function handleWordFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!guardSize(file)) {
      if (wordInputRef.current) wordInputRef.current.value = '';
      return;
    }
    setBusyWord(true);
    setStatusWord(null);
    try {
      const buf = await file.arrayBuffer();
      let rows = await parseWordDocxTableRows(buf);
      rows = rows.filter((r) => {
        const m = String(r.matricule ?? r.Matricule ?? '').trim();
        return m && !m.startsWith('ESP-DEMO');
      });
      if (!rows.length) {
        setStatusWord({
          type: 'err',
          text: 'Aucune ligne importable dans le tableau Word (vérifiez l’en-tête ou retirez la ligne d’exemple).',
        });
        return;
      }
      const { ok, errors } = await runBulkImport(rows, eleveService);
      setStatusWord({
        type: errors.length ? 'warn' : 'ok',
        text: `${ok} étudiant(s) créé(s). ${errors.length ? `${errors.length} erreur(s). ` : ''}${ok ? 'Retournez à la liste pour voir les dossiers.' : ''}`,
        errors,
      });
    } catch (err) {
      console.error(err);
      setStatusWord({ type: 'err', text: err?.message ?? 'Import Word impossible.' });
    } finally {
      setBusyWord(false);
      if (wordInputRef.current) wordInputRef.current.value = '';
    }
  }

  const hintBox =
    'rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700';

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link to="/eleves" className="hover:text-navy">
          Étudiants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Importer</span>
      </nav>

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
          Excel ou Word selon les modèles ci-dessous. Taille maximale : <strong>{IMPORT_MAX_LABEL}</strong>.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 xl:col-span-12">
        <strong className="font-semibold">Important :</strong> une ligne par étudiant ; matricule, nom et prénom
        obligatoires pour créer un dossier.
      </div>

      <div className="grid gap-8 lg:grid-cols-2 xl:col-span-12">
        <Card title="Import Excel (.xlsx)" subtitle="Recommandé pour les volumes et les corrections">
          <div className={hintBox}>
            <p className="font-semibold text-slate-900">Structure attendue</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs md:text-sm">
              <li>Première ligne : libellés du modèle (sans fusion).</li>
              <li>Dates : <code className="rounded bg-slate-100 px-1">AAAA-MM-JJ</code>.</li>
              <li>Département et niveau : comme dans le SI.</li>
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={() => downloadExcelImportTemplate()}
              disabled={busyExcel}
            >
              Modèle Excel
            </Button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelFile}
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
          {statusExcel && (
            <ImportStatusBanner status={statusExcel} />
          )}
        </Card>

        <Card title="Import Word (.docx)" subtitle="Un seul tableau dans le document">
          <div className={hintBox}>
            <p className="font-semibold text-slate-900">Structure attendue</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs md:text-sm">
              <li>Un seul tableau ; première ligne = en-têtes du modèle.</li>
              <li>Même intitulés de colonnes que le modèle (<code className="rounded bg-slate-100 px-1">matricule</code>, etc.).</li>
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={() => downloadWordImportTemplate()}
              disabled={busyWord}
            >
              Modèle Word
            </Button>
            <input
              ref={wordInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleWordFile}
            />
            <Button
              type="button"
              variant="gold"
              icon={Upload}
              onClick={() => wordInputRef.current?.click()}
              disabled={busyWord}
            >
              {busyWord ? 'Traitement…' : 'Importer un fichier Word'}
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
        <ul className="mt-2 max-h-36 list-inside list-disc overflow-y-auto text-xs">
          {status.errors.slice(0, 12).map((err, idx) => (
            <li key={idx}>
              Ligne ~{err.ligne} : {err.message}
            </li>
          ))}
          {status.errors.length > 12 && <li>…</li>}
        </ul>
      )}
    </div>
  );
}
