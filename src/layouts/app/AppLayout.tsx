import { AnimatePresence, motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { KeyboardShortcutsDialog } from '../../components/KeyboardShortcutsDialog';
import { PullToRefreshHost } from '../../components/PullToRefreshHost';
import { GlobalCommandPalette } from '../../components/GlobalCommandPalette';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { DemoBanner } from '../../components/DemoBanner';
import { NotificationsBell } from '../../components/layout/NotificationsBell';
import { Sheet, SheetContent } from '../../components/ui/sheet';
import { SidebarDrawerProvider, useSidebarDrawer } from '../../contexts/SidebarDrawerContext';
import {
  canAccessRoles,
  getActiveScopeHeadline,
  getDashboardScopeLabel,
  getScopeSummary,
} from '../../features/auth/access';
import type { AccessProfile } from '../../features/auth/auth.types';
import { useAccessProfile } from '../../features/auth/useAccessProfile';
import { useAuth } from '../../features/auth/useAuth';
import { useAutoStartDashboardTour, usePlatformTourCleanup } from '../../features/tour/Tour';
import { useIsMobileMax767 } from '../../hooks/useMediaQuery';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAppShortcutController } from '../../hooks/useAppShortcutController';
import { useShortcutsEnabled } from '../../hooks/useShortcutsEnabled';
import type { FebracisTheme } from '../../lib/theme';
import { pushThemeToProfile } from '../../lib/themePersistence';
import { isDemoAppMode } from '../../lib/appMode';
import { readSidebarCollapsed } from '../../lib/shortcutsSettings';
import './AppLayout.css';
import { navigationSections } from './navigation';
import type { NavigationSection } from './navigation';
import { SidebarChrome } from './SidebarChrome';
import { BreadcrumbProvider, useHeaderBreadcrumbSegments } from './BreadcrumbContext';

type AppLayoutShellProps = {
  accessProfile: AccessProfile;
  sections: NavigationSection[];
  userName: string;
  userInitials: string;
};

function AppLayoutShell({ accessProfile, sections, userName, userInitials }: AppLayoutShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed());
  const { signOut, user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobileMax767();
  const prefersReducedMotion = useReducedMotion();
  const shortcutsEnabled = useShortcutsEnabled();
  const headerBreadcrumbSegments = useHeaderBreadcrumbSegments();
  const { open, setOpen } = useSidebarDrawer();
  const edgeX = useRef<number | null>(null);

  const hideHeaderScope = location.pathname.startsWith('/app/guide');
  const assistantHubMinimalHeader = location.pathname === '/app/assistant';

  usePlatformTourCleanup();

  const tourCompletedDre = user?.user_metadata?.tour_completed_dre === true;
  const tourUserRole = accessProfile.primaryRole?.code ?? 'viewer';

  useAutoStartDashboardTour({
    userLoaded: Boolean(!authLoading && user),
    tourCompleted: tourCompletedDre,
    accessProfile,
    pathname: location.pathname,
    navigate,
    userRole: tourUserRole,
  });

  const handleCycleResolvedTheme = useCallback(() => {
    const next: FebracisTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(next);
    void pushThemeToProfile(next);
  }, [resolvedTheme, setTheme]);

  useAppShortcutController({
    disabled: !shortcutsEnabled,
    pathname: location.pathname,
    navigate,
    roleCodes: accessProfile.roleCodes,
    canOperateSubmission: accessProfile.canOperateSubmission,
    canManageReview: accessProfile.canManageReview,
    commandPaletteOpen,
    setCommandPaletteOpen,
    keyboardHelpOpen,
    setKeyboardHelpOpen,
    onCycleResolvedTheme: handleCycleResolvedTheme,
    setSidebarCollapsed,
    breadcrumbSegments: headerBreadcrumbSegments,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const sidebarProps = {
    pathname: location.pathname,
    sections,
    accessProfile,
    userName,
    userInitials,
    onSignOut: handleSignOut,
  };

  const demoBannerActive = isDemoAppMode();

  return (
    <div
      className={`app-layout ${isMobile ? 'app-layout--mobile' : ''}${!isMobile && sidebarCollapsed ? ' app-layout--sidebar-collapsed' : ''}${demoBannerActive ? ' app-layout--demo-banner' : ''}`}
    >
      <a href="#main-content" className="skip-link">
        Ir para o conteúdo principal
      </a>
      {!isMobile ? (
        <aside className="sidebar" id="sidebar" aria-label="Febracis — Portal gerencial">
          <SidebarChrome {...sidebarProps} logoutButtonId="btn-logout" />
        </aside>
      ) : (
        <>
          <div
            className="app-layout__drawer-edge"
            aria-hidden
            onPointerDown={(e) => {
              if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                edgeX.current = e.clientX;
              }
            }}
            onPointerUp={(e) => {
              if (edgeX.current != null && e.clientX - edgeX.current > 48) {
                setOpen(true);
              }
              edgeX.current = null;
            }}
          />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent title="Menu de navegação" description="Links do portal Febracis DRE" side="left">
              <SidebarChrome {...sidebarProps} logoutButtonId="btn-logout-drawer" />
            </SheetContent>
          </Sheet>
        </>
      )}

      <DemoBanner />

      <header className="app-header">
        <div className="app-header__left">
          {isMobile ? (
            <button
              type="button"
              className="app-header__menu-btn"
              aria-label="Abrir menu de navegação"
              aria-expanded={open}
              aria-controls="sidebar-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} aria-hidden />
            </button>
          ) : null}

          {assistantHubMinimalHeader ? null : <Breadcrumb segments={headerBreadcrumbSegments} />}

          {hideHeaderScope || assistantHubMinimalHeader ? null : (
            <div
              className="app-header__scope"
              data-tour-id="app-header-scope"
              title={`${getScopeSummary(accessProfile)} — modo ${getDashboardScopeLabel(accessProfile.dashboardScope)}`}
            >
              <span className="app-header__scope-label">Escopo ativo</span>
              <span className="app-header__scope-value">{getActiveScopeHeadline(accessProfile)}</span>
            </div>
          )}
        </div>

        <div className="app-header__right">
          <NotificationsBell />

          {isMobile ? (
            <div
              className="app-header__user-chip app-header__touch-target"
              title={userName}
              aria-label={`Usuário: ${userName}`}
            >
              {userInitials}
            </div>
          ) : null}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="page-container">
        <PullToRefreshHost>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="page-container__motion"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 380, damping: 30 }
              }
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </PullToRefreshHost>
      </main>

      <GlobalCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        access={accessProfile}
      />

      <KeyboardShortcutsDialog
        open={keyboardHelpOpen}
        onOpenChange={setKeyboardHelpOpen}
        pathname={location.pathname}
        roleCodes={accessProfile.roleCodes}
        sheetContext={{
          canManageReview: accessProfile.canManageReview,
          canOperateSubmission: accessProfile.canOperateSubmission,
        }}
      />
    </div>
  );
}

export function AppLayout() {
  const { signOut, user } = useAuth();
  const accessProfileQuery = useAccessProfile();
  const navigate = useNavigate();

  if (accessProfileQuery.isLoading) {
    return (
      <div className="page-loading">
        <div className="page-loading__spinner" />
        <p className="page-loading__text">Carregando acesso do usuário...</p>
      </div>
    );
  }

  if (accessProfileQuery.error || !accessProfileQuery.data) {
    const detail =
      accessProfileQuery.error instanceof Error ? accessProfileQuery.error.message : null;
    return (
      <div className="page-loading page-loading--error">
        <p className="page-loading__text">Não foi possível carregar o contexto de navegação do seu usuário.</p>
        {detail ? <p className="page-loading__detail">{detail}</p> : null}
        <div className="page-loading__actions">
          <button type="button" className="btn btn--secondary" onClick={() => void accessProfileQuery.refetch()}>
            Tentar novamente
          </button>
          <button type="button" className="btn btn--gold" onClick={() => void signOut().then(() => navigate('/'))}>
            Sair e voltar ao login
          </button>
        </div>
      </div>
    );
  }

  const accessProfile = accessProfileQuery.data;
  const sections: NavigationSection[] = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoles(accessProfile.roleCodes, item.allowedRoles)),
    }))
    .filter((section) => section.items.length > 0);

  const userName =
    accessProfile.profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuário';

  const userInitials = userName
    .split(' ')
    .map((name: string) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarDrawerProvider>
      <BreadcrumbProvider>
        <AppLayoutShell
          accessProfile={accessProfile}
          sections={sections}
          userName={userName}
          userInitials={userInitials}
        />
      </BreadcrumbProvider>
    </SidebarDrawerProvider>
  );
}
