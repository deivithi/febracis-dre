/**
 * Texto do glossário exibido no painel lateral do Guia (G11).
 * Alinhado ao repositório `docs/dre-glossario.md` e ao excerpt usado no Assistente DRE.
 */

export const GUIDE_GLOSSARY_PANEL_INTRO =
  'Glossário institucional (rascunho para revisão da controladoria). Linguagem alinhada às abas Submissões e ao Assistente DRE — ordem canónica da DRE corporativa em franquia.';

/** Concordante com `DreAssistantPanel` (trecho resumido) + expansão curta das referências do doc. */
export const GUIDE_GLOSSARY_SHEET_BLOCKS: { heading: string; body: string }[] = [
  {
    heading: 'Ordem oficial e referências',
    body:
      'Lei das S.A. 6.404/76 art. 187 define a ordem da DRA/DRE. NBC TG 26 (R5, CFC) e o Conceptual Framework IFRS fundamentam linguagem conceitual. Setoriais de franquia (IFB, SBVC e trade press) dão contexto para RBV, MC1/MC2, royalties e eventos.',
  },
  {
    heading: 'Fluxo didático rápido',
    body:
      'Receita bruta → deduções → custos variáveis e evento → marketing → inadimplência (bruto/recuperações) → folha → estrutura (CTO, utilities, gerais) → impostos → MC2 e EBITDA (calculados pelo motor — leitura no UI). Detalhes por linha (`line_code`) estão consolidados em `docs/dre-glossario.md` no repositório febracis-dre.',
  },
  {
    heading: 'Nota de curadoria',
    body:
      'Ajustes finais e uso externo permanecem com human-in-the-loop (Controladoria + Financeiro), conforme rodapé do documento institucional.',
  },
];
