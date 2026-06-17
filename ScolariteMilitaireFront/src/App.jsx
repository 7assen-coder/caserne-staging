import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import LoginRecoveryPage from './pages/LoginRecoveryPage';
import SetPasswordPage from './pages/SetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import GestionElevesPage from './pages/GestionElevesPage';
import ElevesPage from './pages/ElevesPage';
import ScolaritePage from './pages/ScolaritePage';
import EquipementPage from './pages/EquipementPage';
import SanctionsPage from './pages/SanctionsPage';
import DroitsPage from './pages/DroitsPage';
import DemandesPage from './pages/DemandesPage';
import SuiviMedicalPage from './pages/SuiviMedicalPage';
import PresencePlaceholderPage from './pages/PresencePlaceholderPage';
import JournalPage from './pages/JournalPage';
import NouvelEtudiantPage from './pages/NouvelEtudiantPage';
import ExportEtudiantsPage from './pages/ExportEtudiantsPage';
import ImportEtudiantsPage from './pages/ImportEtudiantsPage';
import MobilitePage from './pages/MobilitePage';
import NouvelUtilisateurPage from './pages/NouvelUtilisateurPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './hooks/useAuth';
import { FONCTIONS } from './utils/constants';

const ROLES_SCOLA = [FONCTIONS.TERRAIN, FONCTIONS.ENCADREMENT, FONCTIONS.COMMANDEMENT];

function AuthLoading({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center font-medium text-navy">
      {label}
    </div>
  );
}

function Protected({ children, roles, allowPasswordChangeRoute = false }) {
  const { isAuthenticated, fonction, bootstrapped, mustChangePassword } = useAuth();
  const location = useLocation();

  if (!bootstrapped) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: 'protected' }} />;

  if (
    mustChangePassword &&
    !allowPasswordChangeRoute &&
    location.pathname !== '/login/set-password'
  ) {
    return <Navigate to="/login/set-password" replace />;
  }

  if (roles && !roles.includes(fonction)) return <Navigate to="/dashboard" replace />;
  return children;
}

function ScolaRoute({ children }) {
  return <Protected roles={ROLES_SCOLA}>{children}</Protected>;
}

function HomeRedirect() {
  const { isAuthenticated, bootstrapped, mustChangePassword } = useAuth();
  if (!bootstrapped) return <AuthLoading label="Chargement…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/login/set-password" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/recovery" element={<LoginRecoveryPage />} />
      <Route
        path="/login/set-password"
        element={
          <Protected allowPasswordChangeRoute>
            <SetPasswordPage />
          </Protected>
        }
      />

      <Route
        element={
          <Protected>
            <MainLayout />
          </Protected>
        }
      >
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<ScolaRoute><DashboardPage /></ScolaRoute>} />
        <Route path="/gestion-eleves" element={<ScolaRoute><GestionElevesPage /></ScolaRoute>} />
        <Route path="/eleves" element={<ScolaRoute><ElevesPage /></ScolaRoute>} />
        <Route path="/scolarite" element={<ScolaRoute><ScolaritePage /></ScolaRoute>} />
        <Route path="/equipement" element={<ScolaRoute><EquipementPage /></ScolaRoute>} />
        <Route path="/sanctions" element={<ScolaRoute><SanctionsPage /></ScolaRoute>} />
        <Route path="/droits" element={<ScolaRoute><DroitsPage /></ScolaRoute>} />
        <Route path="/demandes" element={<ScolaRoute><DemandesPage /></ScolaRoute>} />
        <Route path="/suivi-medical" element={<ScolaRoute><SuiviMedicalPage /></ScolaRoute>} />
        <Route path="/presence" element={<ScolaRoute><PresencePlaceholderPage /></ScolaRoute>} />
        <Route path="/journal" element={<ScolaRoute><JournalPage /></ScolaRoute>} />
        <Route path="/eleves/export" element={<ScolaRoute><ExportEtudiantsPage /></ScolaRoute>} />
        <Route path="/eleves/import" element={<ScolaRoute><ImportEtudiantsPage /></ScolaRoute>} />
        <Route path="/eleves/nouveau" element={<ScolaRoute><NouvelEtudiantPage /></ScolaRoute>} />
        <Route path="/eleves/mobilite" element={<ScolaRoute><MobilitePage /></ScolaRoute>} />
        <Route path="/utilisateurs/nouveau" element={<ScolaRoute><NouvelUtilisateurPage /></ScolaRoute>} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
