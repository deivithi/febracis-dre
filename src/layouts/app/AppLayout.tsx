import { Bell, ChevronRight, LogOut } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { canAccessRoles, getDashboardScopeLabel, getScopeSummary } from '../../features/auth/access';
import { useAccessProfile } from '../../features/auth/useAccessProfile';
import { useAuth } from '../../features/auth/useAuth';
import './AppLayout.css';
import { navigationSections } from './navigation';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const accessProfileQuery = useAccessProfile();
  const location = useLocation();
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
        <p className="page-loading__text">
          Não foi possível carregar o contexto de navegação do seu usuário.
        </p>
        {detail ? <p className="page-loading__detail">{detail}</p> : null}
        <div className="page-loading__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void accessProfileQuery.refetch()}
          >
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
  const sections = navigationSections
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

  const pathLabelMap = new Map(
    sections.flatMap((section) => section.items.map((item) => [item.to, item.label] as const)),
  );

  const segmentLabelOverrides = new Map<string, string>([
    ['app', 'Portal'],
    ['forbidden', 'Acesso restrito'],
    ['submissions', 'Submissões'],
    ['franchises', 'Franquias'],
    ['workflow', 'Aprovações'],
    ['audit', 'Auditoria'],
    ['admin', 'Configurações'],
  ]);

  const breadcrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, segments) => {
      const pathname = `/${segments.slice(0, index + 1).join('/')}`;
      const fromNav = pathLabelMap.get(pathname);
      const fromOverride = segmentLabelOverrides.get(segment);
      const fallback = segment.charAt(0).toUpperCase() + segment.slice(1);
      return {
        key: pathname,
        label: fromNav ?? fromOverride ?? fallback,
      };
    });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar" id="sidebar">
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-febracis.png`}
              alt="Febracis"
              className="sidebar__logo-image"
            />
          </div>
          <div className="sidebar__logo-copy">
            <span className="sidebar__logo-text">FEBRACIS</span>
            <span className="sidebar__logo-subtitle">Portal gerencial</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {sections.map((section) => (
            <div key={section.label}>
              <span className="sidebar__section-label">{section.label}</span>
              {section.items.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">{userInitials}</div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{userName}</div>
              <div className="sidebar__user-role">
                {accessProfile.primaryRole?.name ?? 'Usuário'} •{' '}
                {getDashboardScopeLabel(accessProfile.dashboardScope)}
              </div>
            </div>
          </div>
          <div className="sidebar__scope">{getScopeSummary(accessProfile)}</div>
          <button
            className="sidebar__item sidebar__item--logout"
            onClick={handleSignOut}
            id="btn-logout"
          >
            <LogOut />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <header className="app-header">
        <div className="app-header__left">
          <nav className="app-header__breadcrumb" aria-label="Navegação estrutural">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.key}>
                {index > 0 && <ChevronRight size={14} className="app-header__breadcrumb-sep" />}
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? 'app-header__breadcrumb-current'
                      : ''
                  }
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
          <div className="app-header__scope" title={getScopeSummary(accessProfile)}>
            <span className="app-header__scope-label">Escopo ativo</span>
            <span className="app-header__scope-value">{getScopeSummary(accessProfile)}</span>
          </div>
        </div>

        <div className="app-header__right">
          <button className="app-header__icon-btn" id="btn-notifications" aria-label="Notificações">
            <Bell />
            <span className="app-header__notification-dot" />
          </button>
        </div>
      </header>

      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
