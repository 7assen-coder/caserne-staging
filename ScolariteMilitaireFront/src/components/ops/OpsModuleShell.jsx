import OpsModuleHeader from './OpsModuleHeader';
import OpsStatCard from './OpsStatCard';
import OpsFilterSection from './OpsFilterSection';
import QueryState from '../common/QueryState';
import { hasActiveFilters as defaultHasActive } from './opsListUtils';

/**
 * Shared ops list layout: header → KPIs → filters → QueryState list body.
 * When `fiche` is set, only the fiche is rendered (fullscreen swap).
 */
export default function OpsModuleShell({
  title,
  subtitle,
  icon,
  headerActions = null,
  stats = [],
  filters = {},
  emptyFilters,
  onFiltersChange,
  filterSummary = null,
  filterFields = null,
  query = {},
  listHeader = { title: 'Dossiers étudiants' },
  columnHeader = null,
  emptyIcon,
  emptyTitle = 'Aucun dossier pour le moment',
  emptyDescription,
  emptyFilterTitle,
  emptyFilterDescription,
  errorTitle = 'Impossible de charger la liste.',
  loadingLabel = 'Chargement…',
  wrapList = true,
  fiche = null,
  children,
}) {
  if (fiche) return fiche;

  const {
    isPending = false,
    isError = false,
    error = null,
    refetch,
    isEmpty = false,
  } = query;

  const active = defaultHasActive(filters);
  const countLabel =
    listHeader.countLabel ??
    (isPending
      ? 'Chargement…'
      : `${typeof listHeader.count === 'number' ? listHeader.count : 0} résultat${
          (listHeader.count ?? 0) > 1 ? 's' : ''
        }`);

  return (
    <div className="space-y-5">
      <OpsModuleHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        actions={headerActions}
      />

      {stats.length > 0 && !isError ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {stats.map((s) => (
            <OpsStatCard key={s.label} {...s} />
          ))}
        </div>
      ) : null}

      <OpsFilterSection
        hasActiveFilters={active}
        onReset={
          emptyFilters && onFiltersChange
            ? () => onFiltersChange({ ...emptyFilters })
            : undefined
        }
        filterSummary={filterSummary}
      >
        {filterFields}
      </OpsFilterSection>

      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-light-gray px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">{listHeader.title}</h2>
          <span className="text-xs text-slate-500">{countLabel}</span>
        </div>

        <QueryState
          isPending={isPending}
          isError={isError}
          error={error}
          isEmpty={isEmpty}
          hasActiveFilters={active}
          onRetry={refetch}
          onClearFilters={
            emptyFilters && onFiltersChange
              ? () => onFiltersChange({ ...emptyFilters })
              : undefined
          }
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyFilterTitle={emptyFilterTitle}
          emptyFilterDescription={emptyFilterDescription}
          errorTitle={errorTitle}
          loadingLabel={loadingLabel}
        >
          {columnHeader}
          {wrapList ? (
            <ul className="divide-y divide-slate-100">{children}</ul>
          ) : (
            children
          )}
        </QueryState>
      </section>
    </div>
  );
}
