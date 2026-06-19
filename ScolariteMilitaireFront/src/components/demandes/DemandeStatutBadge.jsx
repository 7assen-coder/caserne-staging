import { demandeStatutLabel } from '../../data/demandeCatalog';

export default function DemandeStatutBadge({ statut }) {
  const styles = {
    en_cours: 'bg-amber-50 text-amber-900 ring-amber-200',
    acceptee: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    refusee: 'bg-red-50 text-red-700 ring-red-200',
    annulee: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        styles[statut] ?? styles.en_cours
      }`}
    >
      {demandeStatutLabel(statut)}
    </span>
  );
}
