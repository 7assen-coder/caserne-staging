import { useEffect, useState } from 'react';
import { eleveService } from '../services/eleveService';
import { useAuth } from './useAuth';
import { formatApiError } from '../utils/apiErrors';

/** Load the authenticated student's own dossier (eleve_id from /me). */
export function useOwnEleve() {
  const { user } = useAuth();
  const [eleve, setEleve] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const id = user?.eleve_id;
        if (!id) {
          if (!cancelled) {
            setEleve(null);
            setError('Aucun dossier élève lié à ce compte.');
          }
          return;
        }
        const data = await eleveService.get(id);
        if (!cancelled) setEleve(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.eleve_id]);

  return { eleve, loading, error, eleveId: user?.eleve_id };
}
