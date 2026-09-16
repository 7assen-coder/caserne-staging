import { useCallback, useState } from 'react';
import VersionConflictModal from '../components/common/VersionConflictModal';
import { formatApiError, isVersionConflict } from '../utils/apiErrors';

/**
 * Capture 409 version_conflict and force reload (no silent merge).
 */
export function useVersionConflict({ onReload } = {}) {
  const [conflict, setConflict] = useState(null);

  const capture = useCallback((err) => {
    if (!isVersionConflict(err)) return false;
    setConflict(err.response?.data || { detail: formatApiError(err) });
    return true;
  }, []);

  const reload = useCallback(() => {
    setConflict(null);
    if (typeof onReload === 'function') onReload();
    else window.location.reload();
  }, [onReload]);

  const modal = (
    <VersionConflictModal
      open={!!conflict}
      message={conflict?.detail}
      onReload={reload}
      onClose={() => setConflict(null)}
    />
  );

  return { conflict, capture, modal, clear: () => setConflict(null) };
}
