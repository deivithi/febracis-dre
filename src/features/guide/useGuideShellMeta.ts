import { useEffect } from 'react';

import { GUIDE_HUB_PATH } from './guideNav';

const DESCRIPTION =
  'Guia oficial do portal Febracis DRE: fluxo de dados, papéis, jornadas da franquia e controladoria, fórmulas da DRE e roteiro de demonstração.';

const TITLE_BY_PATH_PREFIX: [string, string][] = [
  [GUIDE_HUB_PATH + '/logica-dre', 'Guia — Lógica da DRE · febracis-dre'],
  [GUIDE_HUB_PATH + '/demo', 'Guia — Roteiro da demo · febracis-dre'],
  [GUIDE_HUB_PATH + '/jornadas', 'Guia — Jornadas em detalhe · febracis-dre'],
  [GUIDE_HUB_PATH + '/acessos', 'Guia — Matriz de acesso · febracis-dre'],
  [GUIDE_HUB_PATH + '/pilares', 'Guia — Pilares da plataforma · febracis-dre'],
  [GUIDE_HUB_PATH + '/fluxo', 'Guia — Fluxo e trilha · febracis-dre'],
  [GUIDE_HUB_PATH, 'Guia — Visão geral · febracis-dre'],
];

function titleForPath(pathname: string): string {
  const p = pathname.replace(/\/$/, '') || '/';
  for (const [prefix, title] of TITLE_BY_PATH_PREFIX) {
    if (p === prefix || p.startsWith(prefix + '/')) {
      return title;
    }
  }
  return 'Guia · febracis-dre';
}

/**
 * Título da aba e metadados para todas as rotas sob `/app/guide/*`.
 */
export function useGuideShellMeta(pathname: string) {
  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? null;

    document.title = titleForPath(pathname);
    if (metaDesc) {
      metaDesc.setAttribute('content', DESCRIPTION);
    }

    const existingRobots = document.querySelector('meta[name="robots"]');
    const prevRobots = existingRobots?.getAttribute('content') ?? null;
    let robotsEl: HTMLMetaElement | null = existingRobots as HTMLMetaElement | null;
    let robotsCreated = false;
    if (!robotsEl) {
      robotsEl = document.createElement('meta');
      robotsEl.setAttribute('name', 'robots');
      document.head.appendChild(robotsEl);
      robotsCreated = true;
    }
    robotsEl.setAttribute('content', 'noindex');

    document.documentElement.classList.add('route-guide');

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc !== null) {
        metaDesc.setAttribute('content', prevDesc);
      }
      if (robotsCreated && robotsEl?.parentNode) {
        robotsEl.parentNode.removeChild(robotsEl);
      } else if (robotsEl) {
        if (prevRobots) {
          robotsEl.setAttribute('content', prevRobots);
        } else {
          robotsEl.removeAttribute('content');
        }
      }
      document.documentElement.classList.remove('route-guide');
    };
  }, [pathname]);
}
