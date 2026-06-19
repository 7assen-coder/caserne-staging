import {
  validationSemestreLabel,
  validationSemestreShort,
  validationSemestreTone,
} from '../../data/scolariteSemestres';

const TONE_CLASS = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200',
  red: 'bg-red-50 text-red-800 ring-red-200',
  muted: 'bg-slate-100 text-slate-400 ring-slate-200',
};

export default function SemestreBadge({ value, compact = true, className = '' }) {
  const tone = validationSemestreTone(value);
  const label = compact ? validationSemestreShort(value) : validationSemestreLabel(value);
  const title = validationSemestreLabel(value);

  return (
    <span
      title={title}
      className={`inline-flex min-w-[2rem] justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${TONE_CLASS[tone] ?? TONE_CLASS.muted} ${className}`}
    >
      {label}
    </span>
  );
}
