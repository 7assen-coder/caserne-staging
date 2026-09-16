import { RotateCcw } from 'lucide-react';

/** Filter card with reset + active summary (Phase 30). */
export default function OpsFilterSection({
  hasActiveFilters = false,
  onReset,
  filterSummary = null,
  children,
}) {
  return (
    <section className="rounded-2xl border border-light-gray bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-light-gray px-5 py-3 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Recherche et filtres
        </p>
        {hasActiveFilters && typeof onReset === 'function' ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
          >
            <RotateCcw size={12} aria-hidden />
            Réinitialiser
          </button>
        ) : null}
      </div>
      <div className="px-5 py-4 sm:px-6">{children}</div>
      {filterSummary ? (
        <div className="border-t border-light-gray bg-off-white/60 px-5 py-2.5 text-xs text-slate-600 sm:px-6">
          Filtres actifs : <span className="font-medium text-navy">{filterSummary}</span>
        </div>
      ) : null}
    </section>
  );
}
