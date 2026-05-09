import type { BreadcrumbSegment } from '../../components/layout/Breadcrumb';

/** Hub do Guia (sem sub-rota). */
export const GUIDE_HUB_PATH = '/app/guide';

export type GuideNavItem = {
  path: string;
  /** Slug do segmento após `/guide/`; vazio = hub. */
  slug: string;
  label: string;
  /** Texto curto para cards no hub */
  description: string;
};

/** Navegação principal do Guia (subpáginas). */
export const GUIDE_NAV_ITEMS: GuideNavItem[] = [
  {
    path: GUIDE_HUB_PATH,
    slug: '',
    label: 'Visão geral',
    description: 'Introdução ao portal e próximos passos.',
  },
  {
    path: `${GUIDE_HUB_PATH}/fluxo`,
    slug: 'fluxo',
    label: 'Fluxo e trilha',
    description: 'Fluxo ponta a ponta e trilha em três passos.',
  },
  {
    path: `${GUIDE_HUB_PATH}/pilares`,
    slug: 'pilares',
    label: 'Pilares da plataforma',
    description: 'O que a plataforma garante por pilares.',
  },
  {
    path: `${GUIDE_HUB_PATH}/acessos`,
    slug: 'acessos',
    label: 'Matriz de acesso',
    description: 'Papéis, escopos e capacidades por perfil.',
  },
  {
    path: `${GUIDE_HUB_PATH}/jornadas`,
    slug: 'jornadas',
    label: 'Jornadas em detalhe',
    description: 'Franquia e controladoria passo a passo.',
  },
  {
    path: `${GUIDE_HUB_PATH}/demo`,
    slug: 'demo',
    label: 'Roteiro da demo',
    description: 'Sequência de telas para demonstração executiva.',
  },
  {
    path: `${GUIDE_HUB_PATH}/logica-dre`,
    slug: 'logica-dre',
    label: 'Lógica da DRE',
    description: 'Fórmulas, glossário e referência técnica.',
  },
];

const SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  GUIDE_NAV_ITEMS.filter((i) => i.slug).map((i) => [i.slug, i.label]),
);

/**
 * Breadcrumb estável: muda só com a rota (não com scroll).
 */
export function guideBreadcrumbForPathname(pathname: string): BreadcrumbSegment[] {
  const base: BreadcrumbSegment[] = [
    { label: 'Portal', href: '/app/dashboard' },
    { label: 'Guia', href: GUIDE_HUB_PATH },
  ];

  const normalized = pathname.replace(/\/$/, '') || '/';

  if (normalized === GUIDE_HUB_PATH || normalized.endsWith('/guide')) {
    return [...base, { label: 'Visão geral' }];
  }

  const m = normalized.match(/\/guide\/([^/]+)$/);
  const slug = m?.[1];
  if (!slug) {
    return [...base, { label: 'Visão geral' }];
  }

  const label = SLUG_TO_LABEL[slug] ?? 'Guia';
  return [...base, { label }];
}

/** Itens para o hub (cards), exclui o próprio hub na lista de destinos. */
export const GUIDE_HUB_CARD_ITEMS = GUIDE_NAV_ITEMS.filter((i) => i.slug !== '');

/**
 * Redireciona âncoras antigas da página única (`#hero`, `#fluxo-visual`, …) para sub-rotas.
 * Ver `guideSections.ts` para ids legados.
 */
export const LEGACY_GUIDE_HASH_TO_PATH: Record<string, { path: string; hash?: string }> = {
  /** Hub sem âncora — limpa hash legado */
  hero: { path: GUIDE_HUB_PATH },
  'fluxo-visual': { path: `${GUIDE_HUB_PATH}/fluxo`, hash: 'fluxo-visual' },
  trilha: { path: `${GUIDE_HUB_PATH}/fluxo`, hash: 'trilha' },
  'pilares-plataforma': { path: `${GUIDE_HUB_PATH}/pilares`, hash: 'pilares-plataforma' },
  'matriz-acesso': { path: `${GUIDE_HUB_PATH}/acessos`, hash: 'matriz-acesso' },
  'jornadas-detalhe': { path: `${GUIDE_HUB_PATH}/jornadas`, hash: 'jornadas-detalhe' },
  'roteiro-demo': { path: `${GUIDE_HUB_PATH}/demo`, hash: 'roteiro-demo' },
  'g07-formulas': { path: `${GUIDE_HUB_PATH}/logica-dre`, hash: 'g07-formulas' },
};
