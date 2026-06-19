import { sanctionStatutLabel } from '../../data/sanctionCatalog';

export default function SanctionStatutBadge({ statut }) {
  const styles = {
    en_cours: 'bg-amber-50 text-amber-900 ring-amber-200',
    cloturee: 'bg-slate-100 text-slate-600 ring-slate-200',
    annulee: 'bg-red-50 text-red-700 ring-red-200',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        styles[statut] ?? styles.en_cours
      }`}
    >
      {sanctionStatutLabel(statut)}
    </span>
  );
}
