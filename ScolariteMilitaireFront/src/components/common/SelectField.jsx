import { ChevronDown } from 'lucide-react';

export default function SelectField({ label, value, onChange, options, required, id, error }) {
  const selectId = id ?? (label ? `select-${String(label).replace(/\s+/g, '-').slice(0, 24)}` : undefined);
  return (
    <label className="form-field-contained min-w-0 max-w-full" htmlFor={selectId}>
      {label != null && label !== '' && (
        <span className="label text-sm leading-tight break-words">
          {label}
          {required && <span className="text-brand-red"> *</span>}
        </span>
      )}
      <div className="relative min-w-0 max-w-full">
        <select
          id={selectId}
          className={`input w-full max-w-full min-w-0 cursor-pointer appearance-none pr-11 ${error ? 'ring-2 ring-brand-red/40' : ''}`}
          value={value ?? ''}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      {error ? <p className="mt-1.5 text-sm font-medium leading-snug text-brand-red">{error}</p> : null}
    </label>
  );
}
