import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import StudentLayout from './components/layout/StudentLayout';
import PageFallback from './components/common/PageFallback';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import LoginPage from './pages/LoginPage';
import LoginRecoveryPage from './pages/LoginRecoveryPage';
import NotFoundPage from './pages/NotFoundPage';
import A11yModalHarnessPage from './pages/A11yModalHarnessPage';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useAuth } from './hooks/useAuth';
import { AUDIT_VIEW_ROLES, OFFICER_ROLES, ROLES, getCanonicalRole } from './utils/userRole';
import { homePathForRole } from './utils/homePath';

/* Phase 28: route-level code splitting — auth pages stay eager */
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GestionElevesPage = lazy(() => import('./pages/GestionElevesPage'));
const GestionEtudiantsLayout = lazy(() => import('./pages/GestionEtudiantsLayout'));
const ScolaritePage = lazy(() => import('./pages/ScolaritePage'));
const EquipementPage = lazy(() => import('./pages/EquipementPage'));
const SanctionsPage = lazy(() => import('./pages/SanctionsPage'));
const DroitsPage = lazy(() => import('./pages/DroitsPage'));
const DemandesPage = lazy(() => import('./pages/DemandesPage'));
const SuiviMedicalPage = lazy(() => import('./pages/SuiviMedicalPage'));
const PresencePage = lazy(() => import('./pages/PresencePage'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const NouvelEtudiantPage = lazy(() => import('./pages/NouvelEtudiantPage'));
const ImportEtudiantsPage = lazy(() => import('./pages/ImportEtudiantsPage'));
const NouvelUtilisateurPage = lazy(() => import('./pages/NouvelUtilisateurPage'));
const StudentHomePage = lazy(() => import('./pages/etudiant/StudentHomePage'));
const StudentDossierPage = lazy(() => import('./pages/etudiant/StudentDossierPage'));
const StudentScolaritePage = lazy(() =>
  import('./pages/etudiant/StudentOpsPages').then((m) => ({ default: m.StudentScolaritePage })),
);
const StudentEquipementPage = lazy(() =>
  import('./pages/etudiant/StudentOpsPages').then((m) => ({ default: m.StudentEquipementPage })),
);
const StudentSanctionsPage = lazy(() =>
  import('./pages/etudiant/StudentOpsPages').then((m) => ({ default: m.StudentSanctionsPage })),
);
const StudentDemandesPage = lazy(() =>
  import('./pages/etudiant/StudentOpsPages').then((m) => ({ default: m.StudentDemandesPage })),
);
const StudentMedicalPage = lazy(() =>
  import('./pages/etudiant/StudentOpsPages').then((m) => ({ default: m.StudentMedicalPage })),
);
const StudentProfilPage = lazy(() =>
  import('./pages/etudiant/StudentOpsPages').then((m) => ({ default: m.StudentProfilPage })),
);

const ROLES_SCOLA = OFFICER_ROLES;

function AuthLoading({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center font-medium text-navy">
      {label}
    </div>
  );
}

function Protected({ children, roles, studentOnly = false }) {
  const { isAuthenticated, fonction, bootstrapped, mustChangePassword } = useAuth();
  const location = useLocation();

  if (!bootstrapped) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: 'protected' }} />;

  if (mustChangePassword) {
    return <Navigate to="/login" replace />;
  }

  const role = getCanonicalRole(fonction);

  if (studentOnly) {
    if (role !== ROLES.ETUDIANT) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  if (roles) {
    if (!roles.includes(role) && !roles.includes(fonction)) {
      if (role === ROLES.ETUDIANT) {
        return <Navigate to="/etudiant" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  } else if (
    role === ROLES.ETUDIANT &&
    !location.pathname.startsWith('/etudiant') &&
    location.pathname !== '/profile'
  ) {
    return <Navigate to="/etudiant" replace />;
  }

  return children;
}

function ScolaRoute({ children }) {
  return <Protected roles={ROLES_SCOLA}>{children}</Protected>;
}

function HomeRedirect() {
  const { isAuthenticated, bootstrapped, mustChangePassword, fonction } = useAuth();
  if (!bootstrapped) return <AuthLoading label="Chargement…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/login" replace />;
  return <Navigate to={homePathForRole(fonction)} replace />;
}

export default function App() {
  useDocumentTitle();
  return (
    <Suspense fallback={<PageFallback />}>
      <RouteErrorBoundary>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/recovery" element={<LoginRecoveryPage />} />
        <Route path="/__a11y__/modal" element={<A11yModalHarnessPage />} />
        <Route path="/login/set-password" element={<Navigate to="/login" replace />} />
        <Route
          path="/etudiant"
          element={
            <Protected studentOnly>
              <StudentLayout />
            </Protected>
          }
        >
          <Route index element={<StudentHomePage />} />
          <Route path="dossier" element={<StudentDossierPage />} />
          <Route path="scolarite" element={<StudentScolaritePage />} />
          <Route path="equipement" element={<StudentEquipementPage />} />
          <Route path="sanctions" element={<StudentSanctionsPage />} />
          <Route path="demandes" element={<StudentDemandesPage />} />
          <Route path="medical" element={<StudentMedicalPage />} />
          <Route path="profil" element={<StudentProfilPage />} />
        </Route>

        <Route
          element={
            <Protected roles={ROLES_SCOLA}>
              <MainLayout />
            </Protected>
          }
        >
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/audit"
            element={
              <Protected roles={AUDIT_VIEW_ROLES}>
                <AuditPage />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ScolaRoute>
                <DashboardPage />
              </ScolaRoute>
            }
          />

          <Route
            path="/eleves"
            element={
              <ScolaRoute>
                <GestionEtudiantsLayout />
              </ScolaRoute>
            }
          >
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
            <Route path="import" element={<ImportEtudiantsPage />} />
            <Route path="nouveau" element={<NouvelEtudiantPage />} />
          </Route>

          <Route
            path="/utilisateurs/nouveau"
            element={
              <ScolaRoute>
                <NouvelUtilisateurPage />
              </ScolaRoute>
            }
          />

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
      </RouteErrorBoundary>
    </Suspense>
  );
}
