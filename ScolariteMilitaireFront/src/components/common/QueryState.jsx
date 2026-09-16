import EmptyState from './EmptyState';
import LoadingBlock from './LoadingBlock';
import QueryErrorPanel from './QueryErrorPanel';
import Button from './Button';

/**
 * Honesty rules (Phase 29):
 * - API down → error panel only (never empty list)
 * - Empty DB → empty without filter CTA
 * - Filters too strict → empty with clear filters
 * - Pending → loading only
 */
export default function QueryState({
  isPending = false,
  isError = false,
  error = null,
  isEmpty = false,
  hasActiveFilters = false,
  onRetry,
  onClearFilters,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyFilterTitle,
  emptyFilterDescription,
  loadingLabel,
  errorTitle,
  children,
  className = '',
}) {
  if (isPending) {
    return <LoadingBlock label={loadingLabel} className={className} />;
  }

  if (isError) {
    return (
      <div className={className ? `px-5 py-4 sm:px-6 ${className}` : 'px-5 py-4 sm:px-6'}>
        <QueryErrorPanel error={error} title={errorTitle} onRetry={onRetry} />
      </div>
    );
  }

  if (isEmpty) {
    const reason = hasActiveFilters ? 'filters' : 'empty';
    return (
      <EmptyState
        className={className}
        icon={emptyIcon}
        reason={reason}
        title={reason === 'filters' ? emptyFilterTitle ?? emptyTitle : emptyTitle}
        description={
          reason === 'filters' ? emptyFilterDescription ?? emptyDescription : emptyDescription
        }
        action={
          reason === 'filters' && typeof onClearFilters === 'function' ? (
            <Button type="button" variant="ghost" onClick={onClearFilters}>
              Effacer les filtres
            </Button>
          ) : null
        }
      />
    );
  }

  return children;
}
