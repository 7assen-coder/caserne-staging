import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import LoginRecoveryPage from './pages/LoginRecoveryPage';
import DashboardPage from './pages/DashboardPage';
import ElevesPage from './pages/ElevesPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './hooks/useAuth';
import { FONCTIONS } from './utils/constants';

/* rôles ayant accès aux écrans scolarité (démo) */
const ROLES_SCOLA = [FONCTIONS.TERRAIN, FONCTIONS.ENCADREMENT, FONCTIONS.COMMANDEMENT];
function Protected({ children, roles }) {
  const { isAuthenticated, fonction } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(fonction)) return <Navigate to="/dashboard" replace />;
  return children;
}

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/recovery" element={<LoginRecoveryPage />} />

      <Route
        element={
          <Protected>
            <MainLayout />
          </Protected>
        }
      >
        <Route
          path="/dashboard"
          element={
            <Protected roles={ROLES_SCOLA}>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/eleves"
          element={
            <Protected roles={ROLES_SCOLA}>
              <ElevesPage />
            </Protected>
          }
        />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
