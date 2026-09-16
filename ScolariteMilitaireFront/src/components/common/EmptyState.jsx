/**
 * Honest empty list UI.
 * reason="filters" → copy about filters + clear action
 * reason="empty" → no data yet (never claim filters are the cause)
 */
export default function EmptyState({
  icon: Icon,
  reason = 'empty',
  title,
  description,
  action = null,
  className = '',
}) {
  const defaultTitle =
    reason === 'filters'
      ? 'Aucun résultat pour ces filtres'
      : 'Aucun dossier pour le moment';
  const defaultDescription =
    reason === 'filters'
      ? 'Modifiez ou effacez les filtres pour élargir la recherche.'
      : 'Les dossiers apparaîtront ici dès qu’ils seront disponibles.';

  return (
    <div className={`px-6 py-16 text-center ${className}`}>
      {Icon ? (
        <Icon size={40} className="mx-auto text-slate-300" strokeWidth={1.25} aria-hidden />
      ) : null}
      <p className="mt-3 text-sm font-medium text-slate-600">{title ?? defaultTitle}</p>
      {(description ?? defaultDescription) ? (
        <p className="mt-1 text-xs text-slate-500">{description ?? defaultDescription}</p>
      ) : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
