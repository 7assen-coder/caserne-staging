import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import LoginRecoveryPage from './pages/LoginRecoveryPage';
import DashboardPage from './pages/DashboardPage';
import ElevesPage from './pages/ElevesPage';
import NouvelEtudiantPage from './pages/NouvelEtudiantPage';
import ExportEtudiantsPage from './pages/ExportEtudiantsPage';
import ImportEtudiantsPage from './pages/ImportEtudiantsPage';
import MobilitePage from './pages/MobilitePage';
import NouvelUtilisateurPage from './pages/NouvelUtilisateurPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './hooks/useAuth';
import { FONCTIONS } from './utils/constants';

/* rôles ayant accès aux écrans scolarité (démo) */
const ROLES_SCOLA = [FONCTIONS.TERRAIN, FONCTIONS.ENCADREMENT, FONCTIONS.COMMANDEMENT];
function Protected({ children, roles }) {
  const { isAuthenticated, fonction, bootstrapped } = useAuth();
  if (!bootstrapped) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-medium text-navy">
        Chargement…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(fonction)) return <Navigate to="/dashboard" replace />;
  return children;
}

function HomeRedirect() {
  const { isAuthenticated, bootstrapped } = useAuth();
  if (!bootstrapped) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-medium text-navy">
        Chargement…
      </div>
    );
  }
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
          path="/eleves/export"
          element={
            <Protected roles={ROLES_SCOLA}>
              <ExportEtudiantsPage />
            </Protected>
          }
        />
        <Route
          path="/eleves/import"
          element={
            <Protected roles={ROLES_SCOLA}>
              <ImportEtudiantsPage />
            </Protected>
          }
        />
        <Route
          path="/eleves/nouveau"
          element={
            <Protected roles={ROLES_SCOLA}>
              <NouvelEtudiantPage />
            </Protected>
          }
        />
        <Route
          path="/eleves/mobilite"
          element={
            <Protected roles={ROLES_SCOLA}>
              <MobilitePage />
            </Protected>
          }
        />
        <Route
          path="/utilisateurs/nouveau"
          element={
            <Protected roles={ROLES_SCOLA}>
              <NouvelUtilisateurPage />
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
