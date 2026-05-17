import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_VISIBLE_COLONNE_IDS,
  ETUDIANT_COLONNES,
  loadVisibleColonneIds,
  saveVisibleColonneIds,
  sanitizeColonneIds,
} from '../data/etudiantColonnes';

export function useEtudiantColonnes() {
  const [visibleIds, setVisibleIds] = useState(() => loadVisibleColonneIds());

  useEffect(() => {
    saveVisibleColonneIds(visibleIds);
  }, [visibleIds]);

  const setVisible = useCallback((ids) => {
    setVisibleIds(sanitizeColonneIds(ids));
  }, []);

  const toggle = useCallback((id) => {
    setVisibleIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return sanitizeColonneIds(next.length ? next : DEFAULT_VISIBLE_COLONNE_IDS);
    });
  }, []);

  const reset = useCallback(() => {
    setVisibleIds([...DEFAULT_VISIBLE_COLONNE_IDS]);
  }, []);

  const selectAll = useCallback(() => {
    setVisibleIds(ETUDIANT_COLONNES.map((c) => c.id));
  }, []);

  return { visibleIds, setVisible, toggle, reset, selectAll };
}
