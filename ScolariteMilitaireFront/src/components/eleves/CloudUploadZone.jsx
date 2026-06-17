import { useRef, useState } from 'react';
import { CloudUpload, FileCheck, Upload, X } from 'lucide-react';
import { validateUploadFile } from '../../utils/fileValidation';

export default function CloudUploadZone({
  label,
  hint,
  value,
  onChange,
  accept = '.pdf,image/*,application/pdf',
  className = '',
  kind = 'document',
  variant = 'dark',
}) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file) => {
    setError('');
    if (!file) {
      onChange(null);
      return;
    }
    const result = await validateUploadFile(file, kind);
    if (!result.ok) {
      setError(result.message);
      if (ref.current) ref.current.value = '';
      return;
    }
    onChange(file);
  };

  const isLight = variant === 'light';

  const idleClasses = isLight
    ? 'border-light-gray bg-slate-50 shadow-sm hover:border-gold/50 hover:bg-white'
    : 'border-white/15 bg-gradient-to-br from-slate-800/50 via-slate-900/70 to-slate-950/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md hover:border-gold/40 hover:shadow-[0_0_32px_rgba(253,185,19,0.14)]';

  const filledClasses = isLight
    ? 'border-emerald-400/60 bg-emerald-50 shadow-sm'
    : 'border-emerald-500/45 bg-emerald-950/25 shadow-[0_0_28px_rgba(52,211,153,0.14)]';

  const dragClasses = isLight
    ? 'scale-[1.01] border-gold/60 bg-amber-50/80 shadow-md'
    : 'scale-[1.01] border-gold/70 bg-gold/[0.12] shadow-[0_0_40px_rgba(253,185,19,0.2)]';

  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        type="file"
        accept={accept}
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
        className={`
          group relative flex min-h-[9.5rem] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border px-3 py-4 text-center transition-all duration-300
          ${drag ? dragClasses : ''}
          ${value && !drag ? filledClasses : ''}
          ${!value && !drag ? idleClasses : ''}
        `}
      >
        {!isLight ? (
          <>
            <div
              className="pointer-events-none absolute -top-10 left-1/2 h-28 w-[110%] -translate-x-1/2 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(253,185,19,0.18),transparent_65%)] opacity-80 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_60%_at_100%_100%,rgba(27,42,74,0.35),transparent_55%)]"
              aria-hidden
            />
          </>
        ) : null}

        {value ? (
          <>
            <FileCheck
              className={`relative z-10 h-9 w-9 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}
              strokeWidth={1.85}
              aria-hidden
            />
            <span className={`relative z-10 text-sm font-semibold ${isLight ? 'text-emerald-900' : 'text-emerald-100'}`}>
              {label}
            </span>
            <span className={`relative z-10 max-w-full truncate px-1 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {value instanceof File ? value.name : String(value)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
                if (ref.current) ref.current.value = '';
              }}
              className={`relative z-10 mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:text-red-600'
                  : 'border-white/15 bg-slate-900/80 text-slate-400 hover:border-red-400/50 hover:text-red-300'
              }`}
            >
              <X size={12} strokeWidth={2.5} aria-hidden />
              Retirer
            </button>
          </>
        ) : (
          <>
            <div
              className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm ${
                isLight
                  ? 'border-light-gray bg-white ring-1 ring-gold/25'
                  : 'border-white/15 bg-slate-800/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm ring-1 ring-gold/20'
              }`}
            >
              <CloudUpload className="h-5 w-5 text-gold" strokeWidth={1.85} aria-hidden />
            </div>
            <span className={`relative z-10 text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-50'}`}>
              {label}
            </span>
            <span
              className={`relative z-10 flex max-w-[16rem] items-center justify-center gap-1.5 text-[11px] leading-snug ${
                isLight ? 'text-text-light' : 'text-slate-400'
              }`}
            >
              <Upload className="h-3.5 w-3.5 shrink-0 text-gold/75" aria-hidden />
              {hint ?? 'Glisser-déposer ou cliquer · PDF, JPG, PNG'}
            </span>
          </>
        )}
      </div>
      {error ? (
        <p className="mt-2 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
