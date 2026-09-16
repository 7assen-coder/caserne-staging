import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import FileUploadField from '../components/common/FileUploadField';
import { useToast } from '../context/ToastContext';
import { uploadFileToImportApi } from '../utils/importEtudiantsBulk';
import { isDocxFile, validateImportFile } from '../utils/validateImportFile';
import { humanizeError } from '../utils/apiErrors';

export default function ImportEtudiantsPage() {
  const { t } = useTranslation(['eleves']);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

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
          <h2 className="text-sm font-semibold text-navy">{t('eleves:importGuideTitle')}</h2>
          <dl className="mt-3 space-y-3 text-sm text-slate-700">
            <div>
              <dt className="font-semibold text-slate-900">{t('eleves:importCols3ALabel')}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {t('eleves:importCols3A')}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">{t('eleves:importCols4ALabel')}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {t('eleves:importCols4A')}
              </dd>
            </div>
          </dl>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <FileUploadField
            label={t('eleves:importUploadLabel')}
            accept=".xlsx,.xls,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
    <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>
      <p>{status.text}</p>
      {status.errors?.length > 0 && (
        <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs">
          {status.errors.slice(0, 15).map((err, idx) => (
            <li key={idx}>
              {t('eleves:importLineError', {
                line: err.ligne,
                message: err.message,
              })}
            </li>
          ))}
          {status.errors.length > 15 && (
            <li>
              {t('eleves:importMoreErrors', {
                count: status.errors.length - 15,
              })}
            </li>
          )}
          {status.errors.length >= 200 ? (
            <li className="list-none pt-1 text-slate-600">
              {t('eleves:importErrorsCapped')}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
