import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download } from 'lucide-react';
import FileUploadField from '../components/common/FileUploadField';
import { useToast } from '../context/ToastContext';
import { useInvalidateEleves } from '../hooks/useElevesQueries';
import { downloadTemplateFromApi, uploadFileToImportApi } from '../utils/importEtudiantsBulk';
import { notifyElevesChanged } from '../utils/importedElevesStore';
import { isDocxFile, validateImportFile } from '../utils/validateImportFile';
import { humanizeError } from '../utils/apiErrors';

export default function ImportEtudiantsPage() {
  const { t } = useTranslation(['eleves']);
  const toast = useToast();
  const invalidateEleves = useInvalidateEleves();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await downloadTemplateFromApi('xlsx');
      toast.success(t('eleves:importTemplateDownloaded'));
    } catch (err) {
      console.error(err);
      toast.error(humanizeError(err));
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileUpload(file) {
    if (!file) return;

    const check = validateImportFile(file, t);
    if (!check.ok) {
      toast.error(check.message);
      setStatus({ type: 'err', text: check.message });
      return;
    }

    if (isDocxFile(file)) {
      const msg = t('eleves:importWordSoon');
      setStatus({ type: 'warn', text: msg });
      toast.warning(msg);
      return;
    }

    setBusy(true);
    setStatus({ type: 'ok', text: t('eleves:importBusy') });

    try {
      const { ok, skipped, errors } = await uploadFileToImportApi(file);
      const skippedPart = skipped
        ? t('eleves:importSkipped', { count: skipped })
        : '';
      const errorsPart = errors.length
        ? t('eleves:importErrorsCount', { count: errors.length })
        : '';
      const hintPart = ok > 0 ? t('eleves:importGoList') : '';
      setStatus({
        type: errors.length > 0 ? (ok > 0 ? 'warn' : 'err') : 'ok',
        text: t('eleves:importResult', {
          ok,
          skipped: skippedPart,
          errors: errorsPart,
          hint: hintPart,
        }),
        errors,
      });
      if (ok > 0) {
        notifyElevesChanged();
        await invalidateEleves();
      }
      if (errors.length === 0 && ok > 0) {
        toast.success(t('eleves:importSuccess', { count: ok }));
      } else if (ok > 0) {
        toast.warning(
          t('eleves:importPartial', { ok, errors: errors.length }),
        );
      } else {
        toast.error(t('eleves:importNone'));
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

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 overflow-x-hidden md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <div className="min-w-0 xl:col-span-12">
        <Link
          to="/eleves/dossiers"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden className="rtl:rotate-180" />
          {t('eleves:retourListe')}
        </Link>
        <h1 className="page-title text-2xl sm:text-3xl md:text-5xl">{t('eleves:importTitle')}</h1>
        <p className="mt-1 text-sm text-text-light md:text-base">{t('eleves:importSubtitle')}</p>
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm xl:col-span-12">
        <div className="border-b border-light-gray px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-navy">{t('eleves:importGuideTitle')}</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {t('eleves:importGuideBody')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloading || busy}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
            >
              <Download size={16} aria-hidden />
              {downloading
                ? t('eleves:importTemplateDownloading')
                : t('eleves:importDownloadTemplate')}
            </button>
          </div>
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600 sm:text-sm">
            <li>{t('eleves:importGuidePoint1')}</li>
            <li>{t('eleves:importGuidePoint2')}</li>
            <li>{t('eleves:importGuidePoint3')}</li>
          </ul>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <FileUploadField
            label={t('eleves:importUploadLabel')}
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hint={t('eleves:importAcceptHint')}
            validateFn={(file) => validateImportFile(file, t)}
            disabled={busy}
            onChange={handleFileUpload}
          />
          {busy ? (
            <p className="mt-3 text-sm font-medium text-navy">{t('eleves:importBusy')}</p>
          ) : null}
          {status ? <ImportStatusBanner status={status} t={t} /> : null}
        </div>
      </section>
    </div>
  );
}

function ImportStatusBanner({ status, t }) {
  const cls =
    status.type === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
      : status.type === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-red-200 bg-red-50 text-red-900';

  return (
    <div className={`mt-4 min-w-0 max-w-full overflow-x-hidden rounded-lg border px-3 py-2 text-sm sm:px-4 ${cls}`}>
      <p className="break-words">{status.text}</p>
      {status.errors?.length > 0 && (
        <ul className="mt-2 max-h-48 list-inside list-disc overflow-y-auto break-words text-xs sm:max-h-56">
          {status.errors.slice(0, 15).map((err, idx) => (
            <li key={idx}>
              {t('eleves:importLineError', {
                line: err.ligne,
                message: err.message,
              })}
            </li>
          ))}
          {status.errors.length > 15 ? (
            <li>
              {t('eleves:importMoreErrors', {
                count: status.errors.length - 15,
              })}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
