import { lazy, Suspense, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppToastsProvider } from './components/ui/AppToasts';
import { TooltipProvider } from './components/ui/tooltip';
import { AuthProvider } from './features/auth/AuthProvider';
import { AppThemeProvider } from './providers/ThemeProvider';
import { ShortcutsProfileSync } from './providers/ShortcutsProfileSync';
import { ThemeProfileSync } from './providers/ThemeProfileSync';
import { ProtectedRoute } from './router/ProtectedRoute';
import { useAuth } from './features/auth/useAuth';
import { showAppToast } from './lib/appToast';
import { queryClient } from './lib/queryClient';

/** Code-splitting: cada rota /app/* baixa o respetivo chunk (ver `references/dashboard-perf-notes.md`). */
const LoginPage = lazy(async () => ({
  default: (await import('./features/auth/LoginPage')).LoginPage,
}));

const AppLayout = lazy(async () => ({
  default: (await import('./layouts/app/AppLayout')).AppLayout,
}));

const DashboardPage = lazy(async () => ({
  default: (await import('./features/dashboard/DashboardPage')).DashboardPage,
}));

const GuideShell = lazy(async () => ({
  default: (await import('./features/guide/GuideShell')).GuideShell,
}));

const GuideHubPage = lazy(async () => ({
  default: (await import('./features/guide/GuideHubPage')).GuideHubPage,
}));

const GuideFluxPage = lazy(async () => ({
  default: (await import('./features/guide/GuideFluxPage')).GuideFluxPage,
}));

const GuidePilaresPage = lazy(async () => ({
  default: (await import('./features/guide/GuidePilaresPage')).GuidePilaresPage,
}));

const GuideAcessosPage = lazy(async () => ({
  default: (await import('./features/guide/GuideAcessosPage')).GuideAcessosPage,
}));

const GuideJornadasPage = lazy(async () => ({
  default: (await import('./features/guide/GuideJornadasPage')).GuideJornadasPage,
}));

const GuideDemoPage = lazy(async () => ({
  default: (await import('./features/guide/GuideDemoPage')).GuideDemoPage,
}));

const GuideLogicaDrePage = lazy(async () => ({
  default: (await import('./features/guide/GuideLogicaDrePage')).GuideLogicaDrePage,
}));

const SubmissionsPage = lazy(async () => ({
  default: (await import('./features/submissions/SubmissionsPage')).SubmissionsPage,
}));

const AssistantPage = lazy(async () => ({
  default: (await import('./features/submissions/AssistantPage')).AssistantPage,
}));

const WorkflowPage = lazy(async () => ({
  default: (await import('./features/workflow/WorkflowPage')).WorkflowPage,
}));

const FranchisesPage = lazy(async () => ({
  default: (await import('./features/franchises/FranchisesPage')).FranchisesPage,
}));

const AuditPage = lazy(async () => ({
  default: (await import('./features/audit/AuditPage')).AuditPage,
}));

const AdminPage = lazy(async () => ({
  default: (await import('./features/admin/AdminPage')).AdminPage,
}));

const AccessDeniedPage = lazy(async () => ({
  default: (await import('./features/auth/AccessDeniedPage')).AccessDeniedPage,
}));

const NotificationsPage = lazy(async () => ({
  default: (await import('./features/notifications/NotificationsPage')).NotificationsPage,
}));

function RouteFallback() {
  return (
    <div className="page-loading">
      <div className="page-loading__spinner" />
      <p className="page-loading__text">Carregando módulo...</p>
    </div>
  );
}

let invalidGlobalRouteToastShown = false;

function InvalidRouteCatchAll() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!invalidGlobalRouteToastShown) {
      invalidGlobalRouteToastShown = true;
      showAppToast({ title: 'Rota inválida — voltámos ao painel.', variant: 'warning' });
    }
    navigate(session ? '/app/dashboard' : '/login', { replace: true });
  }, [loading, session, navigate]);

  return <RouteFallback />;
}

function App() {
  return (
    <AppToastsProvider>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          <AuthProvider>
            <ThemeProfileSync />
            <ShortcutsProfileSync />
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="guide" element={<GuideShell />}>
                  <Route index element={<GuideHubPage />} />
                  <Route path="fluxo" element={<GuideFluxPage />} />
                  <Route path="pilares" element={<GuidePilaresPage />} />
                  <Route path="acessos" element={<GuideAcessosPage />} />
                  <Route path="jornadas" element={<GuideJornadasPage />} />
                  <Route path="demo" element={<GuideDemoPage />} />
                  <Route path="logica-dre" element={<GuideLogicaDrePage />} />
                </Route>
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="forbidden" element={<AccessDeniedPage />} />
                <Route
                  path="submissions"
                  element={
                    <ProtectedRoute
                      allowedRoles={['franchise_user', 'regional_manager', 'finance_controller', 'executive', 'system_admin']}
                    >
                      <SubmissionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="assistant"
                  element={
                    <ProtectedRoute
                      allowedRoles={['franchise_user', 'regional_manager', 'finance_controller', 'executive', 'system_admin']}
                    >
                      <AssistantPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="workflow"
                  element={
                    <ProtectedRoute allowedRoles={['finance_controller', 'executive', 'system_admin']}>
                      <WorkflowPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="franchises"
                  element={
                    <ProtectedRoute
                      allowedRoles={['regional_manager', 'finance_controller', 'executive', 'system_admin']}
                    >
                      <FranchisesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <ProtectedRoute allowedRoles={['finance_controller', 'executive', 'system_admin']}>
                      <AuditPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <ProtectedRoute allowedRoles={['system_admin']}>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<InvalidRouteCatchAll />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </AppThemeProvider>
    </QueryClientProvider>
    </AppToastsProvider>
  );
}

export default App;
