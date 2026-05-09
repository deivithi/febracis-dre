/**
 * G03 — âncoras únicas da guia (TOC, IntersectionObserver em `useActiveSection`).
 * Cada id deve existir no DOM em um elemento observado.
 */
export const GUIDE_SECTION_IDS = [
  'hero',
  'fluxo-visual',
  'trilha',
  'pilares-plataforma',
  'matriz-acesso',
  'jornadas-detalhe',
  'roteiro-demo',
  'g07-formulas',
  'guia-cta-final',
] as const;

export type GuideSectionId = (typeof GUIDE_SECTION_IDS)[number];

export interface GuideSectionEntry {
  id: GuideSectionId;
  label: string;
}

export const GUIDE_SECTIONS: readonly GuideSectionEntry[] = [
  { id: 'hero', label: 'Visão geral' },
  { id: 'fluxo-visual', label: 'Fluxo visual' },
  { id: 'trilha', label: 'Trilha em 3 passos' },
  { id: 'pilares-plataforma', label: 'Pilares da plataforma' },
  { id: 'matriz-acesso', label: 'Matriz de acesso' },
  { id: 'jornadas-detalhe', label: 'Jornadas em detalhe' },
  { id: 'roteiro-demo', label: 'Roteiro da demo' },
  { id: 'g07-formulas', label: 'Lógica da DRE' },
  { id: 'guia-cta-final', label: 'Próximos passos' },
] as const;

export const GUIDE_SECTION_LABEL_BY_ID: Record<GuideSectionId, string> = GUIDE_SECTIONS.reduce(
  (acc, { id, label }) => {
    acc[id] = label;
    return acc;
  },
  {} as Record<GuideSectionId, string>,
);
