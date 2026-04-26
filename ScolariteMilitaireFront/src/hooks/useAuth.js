import { useAuthContext } from '../context/authStore';

export function useAuth() {
  return useAuthContext();
}
