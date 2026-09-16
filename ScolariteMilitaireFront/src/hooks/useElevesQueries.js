import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eleveService } from '../services/eleveService';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';

/** Paginated élèves list (server filters). */
export function useElevesPage(params, options = {}) {
  const { bootstrapped, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.eleves.list(params),
    queryFn: () => eleveService.listPage(params),
    enabled: bootstrapped && isAuthenticated && options.enabled !== false,
    ...options,
  });
}

export function useDashboardStats(options = {}) {
  const { bootstrapped, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.eleves.dashboardStats(),
    queryFn: () => eleveService.dashboardStats(),
    enabled: bootstrapped && isAuthenticated && options.enabled !== false,
    ...options,
  });
}

/** Invalidate all élève-related caches after create/update/delete. */
export function useInvalidateEleves() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.eleves.all });
}
