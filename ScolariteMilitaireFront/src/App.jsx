import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import LoginRecoveryPage from './pages/LoginRecoveryPage';
import SetPasswordPage from './pages/SetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import GestionElevesPage from './pages/GestionElevesPage';
import GestionEtudiantsLayout from './pages/GestionEtudiantsLayout';
import ScolaritePage from './pages/ScolaritePage';
import EquipementPage from './pages/EquipementPage';
import SanctionsPage from './pages/SanctionsPage';
import DroitsPage from './pages/DroitsPage';
import DemandesPage from './pages/DemandesPage';
import SuiviMedicalPage from './pages/SuiviMedicalPage';
import PresencePage from './pages/PresencePage';
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

        <Route path="/eleves" element={<ScolaRoute><GestionEtudiantsLayout /></ScolaRoute>}>
          <Route index element={<Navigate to="dossiers" replace />} />
          <Route path="dossiers" element={<GestionElevesPage />} />
          <Route path="scolarite" element={<ScolaritePage />} />
          <Route path="equipement" element={<EquipementPage />} />
          <Route path="sanctions" element={<SanctionsPage />} />
          <Route path="droits" element={<DroitsPage />} />
          <Route path="demandes" element={<DemandesPage />} />
          <Route path="suivi-medical" element={<SuiviMedicalPage />} />
          <Route path="presence" element={<PresencePage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="export" element={<ExportEtudiantsPage />} />
          <Route path="import" element={<ImportEtudiantsPage />} />
          <Route path="nouveau" element={<NouvelEtudiantPage />} />
          <Route path="mobilite" element={<MobilitePage />} />
        </Route>

        <Route path="/utilisateurs/nouveau" element={<ScolaRoute><NouvelUtilisateurPage /></ScolaRoute>} />

        <Route path="/gestion-eleves" element={<Navigate to="/eleves/dossiers" replace />} />
        <Route path="/scolarite" element={<Navigate to="/eleves/scolarite" replace />} />
        <Route path="/equipement" element={<Navigate to="/eleves/equipement" replace />} />
        <Route path="/sanctions" element={<Navigate to="/eleves/sanctions" replace />} />
        <Route path="/droits" element={<Navigate to="/eleves/droits" replace />} />
        <Route path="/demandes" element={<Navigate to="/eleves/demandes" replace />} />
        <Route path="/suivi-medical" element={<Navigate to="/eleves/suivi-medical" replace />} />
        <Route path="/presence" element={<Navigate to="/eleves/presence" replace />} />
        <Route path="/journal" element={<Navigate to="/eleves/journal" replace />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
