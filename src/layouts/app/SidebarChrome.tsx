import { LogOut, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { SidebarBrand } from '../../components/layout/SidebarBrand';
import { useAuth } from '../../features/auth/useAuth';
import { getActiveScopeHeadline, getDashboardScopeLabel } from '../../features/auth/access';
import type { AccessProfile } from '../../features/auth/auth.types';
import { buildPinnedViewLocation } from '../../features/saved-views/SavedViewsBar';
import { usePinnedSavedViews } from '../../hooks/useSavedViews';
import type { NavigationSection } from './navigation';

type SidebarChromeProps = {
  pathname: string;
  sections: NavigationSection[];
  accessProfile: AccessProfile;
  userName: string;
  userInitials: string;
  onSignOut: () => void;
  logoutButtonId?: string;
};

/**
 * Conteúdo compartilhado entre a coluna fixa (desktop) e o sheet móvel (≤767px).
 */
export function SidebarChrome({
  pathname,
  sections,
  accessProfile,
  userName,
  userInitials,
  onSignOut,
  logoutButtonId = 'btn-logout',
}: SidebarChromeProps) {
  const location = useLocation();
  const { user } = useAuth();
  const pinnedViewsQuery = usePinnedSavedViews(user?.id);

  return (
    <>
      <div className="sidebar__logo">
        <SidebarBrand />
      </div>

      <nav className="sidebar__nav" id="sidebar-navigation">
        {sections.map((section) => (
          <div key={section.label}>
            <span className="sidebar__section-label">{section.label}</span>
            {section.items.map((item) => {
              const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                >
                  <Icon aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
        <div className="sidebar__pinned-views">
          <span className="sidebar__section-label">Minhas vistas</span>
          {!user?.id ? (
            <span className="sidebar__muted">Inicie sessão para usar vistas.</span>
          ) : pinnedViewsQuery.isLoading ? (
            <span className="sidebar__muted">A carregar…</span>
          ) : !pinnedViewsQuery.data?.length ? (
            <span className="sidebar__muted">Sem vistas fixadas. Use “Fixar” na barra de vistas.</span>
          ) : (
            pinnedViewsQuery.data.map((row) => {
              const loc = buildPinnedViewLocation(row);
              const to = `${loc.pathname}${loc.search}`;
              const active = location.pathname === loc.pathname && location.search === loc.search;
              return (
                <Link
                  key={row.id}
                  to={to}
                  className={`sidebar__item sidebar__item--pinned${active ? ' sidebar__item--active' : ''}`}
                  title={to}
                >
                  <Star size={16} aria-hidden />
                  <span className="sidebar__item-label">{row.name}</span>
                  <span className="sidebar__pinned-count" aria-hidden>
                    —
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </nav>

      <div className="sidebar__footer" role="contentinfo">
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
        <div className="sidebar__scope">{getActiveScopeHeadline(accessProfile)}</div>
        <button className="sidebar__item sidebar__item--logout" onClick={onSignOut} id={logoutButtonId} type="button">
          <LogOut aria-hidden />
          <span>Sair</span>
        </button>
      </div>
    </>
  );
}
