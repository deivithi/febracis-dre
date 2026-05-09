import { useEffect } from 'react';

const GUIDE_TITLE = 'Guia · febracis-dre';
const GUIDE_DESCRIPTION =
  'Guia oficial do portal Febracis DRE: fluxo de dados, papéis, jornadas da franquia e controladoria, fórmulas da DRE e roteiro de demonstração.';

/**
 * Título, meta description (PT-BR) e noindex específicos da rota `/app/guide`.
 * Restaura valores anteriores ao desmontar (SPA).
 */
export function useGuidePageMeta() {
  useEffect(() => {
    const prevTitle = document.title;

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? null;

    document.title = GUIDE_TITLE;
    if (metaDesc) {
      metaDesc.setAttribute('content', GUIDE_DESCRIPTION);
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
  }, []);
}
