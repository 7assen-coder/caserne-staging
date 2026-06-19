import { useRef, useState } from 'react';
import { Upload, X, FileCheck } from 'lucide-react';
import { validateUploadFile } from '../../utils/fileValidation';

/**
 * Zone de téléversement réutilisable avec validation et messages clairs.
 */
export default function FileUploadField({
  label,
  hint,
  value,
  onChange,
  accept = '.pdf,image/*,application/pdf',
  kind = 'document',
  className = '',
  disabled = false,
  validateFn,
}) {
  const ref = useRef(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const pick = async (file) => {
    setError('');
    if (!file) {
      onChange?.(null);
      return;
    }
    setChecking(true);
    try {
      const validator = validateFn ?? ((f) => validateUploadFile(f, kind));
      const result = await validator(file);
      if (!result.ok) {
        setError(result.message);
        if (ref.current) ref.current.value = '';
        return;
      }
      onChange?.(file);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={className}>
      {label ? <span className="label mb-1.5 block">{label}</span> : null}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || checking}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        onClick={() => !disabled && !checking && ref.current?.click()}
        className={`flex min-h-[7rem] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
            : 'cursor-pointer border-slate-300 bg-white hover:border-navy/40 hover:bg-slate-50'
        } ${value ? 'border-emerald-400 bg-emerald-50/40' : ''}`}
      >
        {value ? (
          <>
            <FileCheck className="h-8 w-8 text-emerald-600" aria-hidden />
            <span className="max-w-full truncate text-sm font-semibold text-slate-800">
              {value instanceof File ? value.name : String(value)}
            </span>
            {!disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pick(null);
                  if (ref.current) ref.current.value = '';
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-600"
              >
                <X size={12} aria-hidden />
                Retirer
              </button>
            ) : null}
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-navy/70" aria-hidden />
            <span className="text-sm font-medium text-slate-700">
              {checking ? 'Vérification du fichier…' : 'Cliquer ou glisser-déposer'}
            </span>
            <span className="text-xs text-slate-500">
              {hint ?? 'PDF, JPG, PNG ou WebP · max. 1 Mo (documents)'}
            </span>
          </>
        )}
      </div>
      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
