import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import { LEGACY_GUIDE_HASH_TO_PATH, GUIDE_HUB_PATH, guideBreadcrumbForPathname } from './guideNav';
import { GuideSubNav } from './GuideSubNav';
import { useGuideShellMeta } from './useGuideShellMeta';

import './GuidePage.css';

/**
 * Layout partilhado do Guia: breadcrumb estável por rota, subnavegação, sem TOC por scroll.
 */
export function GuideShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const segments = useMemo(() => guideBreadcrumbForPathname(location.pathname), [location.pathname]);
  useBreadcrumb(segments);
  useGuideShellMeta(location.pathname);

  /** Scroll suave para âncoras na página atual (ex.: `#fluxo-visual` após redirecionamento legado). */
  useEffect(() => {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return;
    const id = decodeURIComponent(raw);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [location.pathname, location.hash]);

  /** Compatibilidade com links antigos `/app/guide#secção`. */
  useEffect(() => {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return;
    const pathname = location.pathname.replace(/\/$/, '') || '/';
    if (pathname !== GUIDE_HUB_PATH && pathname !== `${GUIDE_HUB_PATH}/`) return;

    const target = LEGACY_GUIDE_HASH_TO_PATH[raw];
    if (!target) return;

    const next =
      target.hash !== undefined && target.hash !== ''
        ? `${target.path}#${target.hash}`
        : target.path;
    navigate(next, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  return (
    <div className="guide-layout guide-page guide-g03-root guide-shell">
      <GuideSubNav />
      <div className="guide-layout__content guide-shell__outlet">
        <Outlet />
      </div>
    </div>
  );
}
