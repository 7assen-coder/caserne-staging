import { useRef, useState } from 'react';
import { CloudUpload, FileCheck, Upload, X } from 'lucide-react';
import {
  MAX_EQUIPEMENT_PDF_SIZE,
  validateUploadFile,
} from '../../utils/fileValidation';

/** Zone d'upload PDF équipement — max 5 Mo, PDF uniquement. */
export default function EquipementPdfUpload({
  label = 'Pièce jointe PDF',
  hint = 'Glisser-déposer ou cliquer · PDF uniquement · max 5 Mo',
  value,
  onChange,
  className = '',
  variant = 'light',
}) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  const displayName =
    value instanceof File
      ? value.name
      : value?.name
        ? value.name
        : null;

  const pick = async (file) => {
    setError('');
    if (!file) {
      onChange(null);
      return;
    }
    const result = await validateUploadFile(file, 'document', {
      pdfOnly: true,
      maxSize: MAX_EQUIPEMENT_PDF_SIZE,
    });
    if (!result.ok) {
      setError(result.message);
      if (ref.current) ref.current.value = '';
      return;
    }
    onChange(file);
  };

  const isLight = variant === 'light';
  const idleClasses = isLight
    ? 'border-light-gray bg-slate-50 hover:border-gold/50 hover:bg-white'
    : 'border-white/15 bg-slate-900/40 hover:border-gold/40';
  const filledClasses = isLight
    ? 'border-emerald-400/60 bg-emerald-50'
    : 'border-emerald-500/45 bg-emerald-950/25';

  return (
    <div className={className}>
      <input
        ref={ref}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-[7rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-center transition ${
          drag ? 'border-gold/60 bg-amber-50/80' : displayName ? filledClasses : idleClasses
        }`}
      >
        {displayName ? (
          <>
            <FileCheck className="h-7 w-7 text-emerald-600" strokeWidth={1.85} aria-hidden />
            <span className="text-xs font-semibold text-emerald-900">{label}</span>
            <span className="max-w-full truncate text-[11px] text-slate-600">{displayName}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
                if (ref.current) ref.current.value = '';
              }}
              className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-red-600"
            >
              <X size={11} aria-hidden />
              Retirer
            </button>
          </>
        ) : (
          <>
            <CloudUpload className="h-6 w-6 text-gold" strokeWidth={1.85} aria-hidden />
            <span className="text-xs font-semibold text-slate-800">{label}</span>
            <span className="flex max-w-[14rem] items-center gap-1 text-[10px] text-slate-500">
              <Upload className="h-3 w-3 shrink-0" aria-hidden />
              {hint}
            </span>
          </>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
