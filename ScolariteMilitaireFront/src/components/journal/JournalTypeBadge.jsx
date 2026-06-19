import { journalTypeLabel } from '../../data/journalCatalog';

const STYLES = {
  observation: 'bg-slate-100 text-slate-700 ring-slate-200',
  felicitation: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  incident: 'bg-red-50 text-red-800 ring-red-200',
  consigne: 'bg-amber-50 text-amber-900 ring-amber-200',
  encadrement: 'bg-sky-50 text-sky-900 ring-sky-200',
  divers: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export default function JournalTypeBadge({ type }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        STYLES[type] ?? STYLES.observation
      }`}
    >
      {journalTypeLabel(type)}
    </span>
  );
}
