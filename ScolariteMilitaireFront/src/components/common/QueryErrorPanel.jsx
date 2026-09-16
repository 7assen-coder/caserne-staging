import { RefreshCw } from 'lucide-react';
import Button from './Button';
import { formatApiError } from '../../utils/apiErrors';

/** Honest API/query failure panel with retry (Phase 29). */
export default function QueryErrorPanel({
  error,
  title = 'Impossible de charger les données.',
  onRetry,
  busy = false,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900 ${className}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{formatApiError(error)}</p>
      {typeof onRetry === 'function' ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          icon={RefreshCw}
          disabled={busy}
          onClick={onRetry}
        >
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
