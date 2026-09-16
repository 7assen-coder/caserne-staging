import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { homePathForRole } from '../../utils/homePath';

/** ErrorBoundary that resets when the route pathname changes. */
export default function RouteErrorBoundary({ children, title }) {
  const location = useLocation();
  const { fonction } = useAuth();
  return (
    <ErrorBoundary
      resetKeys={[location.pathname]}
      homeTo={homePathForRole(fonction)}
      title={title}
    >
      {children}
    </ErrorBoundary>
  );
}
