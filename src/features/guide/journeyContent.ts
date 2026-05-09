export type JourneyStepId = 'entender' | 'operar' | 'extrair';

export interface JourneyStepDefinition {
  id: JourneyStepId;
  stepNumber: number;
  title: string;
  shortDescription: string;
  /** Bullets shown on compact cards (exact product copy). */
  summaryBullets: string[];
  /** Long-form intro paragraph(s) for the detail sheet. */
  longParagraphs: string[];
  /** Detailed bullets for the sheet (full prior copy). */
  longBullets: string[];
}

export const JOURNEY_STEPS: JourneyStepDefinition[] = [
  {
    id: 'entender',
    stepNumber: 1,
    title: 'Entender o fluxo',
    shortDescription: 'Da submissão na unidade ao consolidado aprovado que o dashboard exibe.',
    summaryBullets: [
      'Submissões: franquia preenche apenas inputs',
      'Motor SQL recalcula MC1/MC2/EBITDA',
      'Dashboard lê apenas dados aprovados',
    ],
    longParagraphs: [
      'Você posiciona o portal: a DRE nasce na unidade, é recalculada no servidor e só então vira leitura executiva.',
    ],
    longBullets: [
      'Submissões: a franquia informa apenas as linhas de input; MC1, MC2 e EBITDA são recalculados pelo motor (SQL), não digitados à mão no dashboard.',
      'Controladoria valida no workflow: aprovar, devolver para ajuste ou acompanhar histórico — cada mudança de status fica auditável.',
      'O dashboard é a ponta final: mostra consolidado oficial por escopo, depois que o ciclo passou pela governança.',
      'Fórmulas detalhadas: seção Lógica da DRE (âncora no guia).',
    ],
  },
  {
    id: 'operar',
    stepNumber: 2,
    title: 'Operar no dia',
    shortDescription: 'Telas certas por papel, com assistente contextual na submissão.',
    summaryBullets: [
      'Franqueada: criar e enviar DRE',
      'Controladoria: revisar e aprovar',
      'Assistente: orientação contextual',
    ],
    longParagraphs: [
      'Você sabe qual tela usar e como o assistente se comporta conforme o seu papel.',
    ],
    longBullets: [
      'Franqueado (ou admin da unidade): Submissões → coligada, competência e evento → preencher linhas, preview ao vivo, salvar rascunho e enviar para revisão.',
      'Controladoria: fila em Aprovações → analisar DRE, validações e histórico → aprovar ou devolver com justificativa.',
      'Assistente DRE: quem opera a submissão pode receber sugestões que gravam campos; quem está só em leitura usa modo orientação (sem aplicar valores).',
    ],
  },
  {
    id: 'extrair',
    stepNumber: 3,
    title: 'Extrair valor',
    shortDescription: 'Cockpit oficial, trilha de auditoria e relatórios para apresentação.',
    summaryBullets: [
      'Cockpit consolidado por escopo',
      'Trilha de auditoria completa',
      'Exportar relatórios oficiais',
    ],
    longParagraphs: [
      'Você usa o dashboard e este Guia como referência estável — e tem um roteiro pronto para apresentar o produto.',
    ],
    longBullets: [
      'Dashboard: KPIs, DRE e status alinhados ao que foi validado; não é origem de edição da DRE.',
      'Guia: volte aqui para explicar papéis, jornadas e fórmulas em qualquer onboarding interno.',
      'Apresentação: siga o checklist do roteiro de demo na ordem sugerida (seção abaixo no guia).',
    ],
  },
];

const VIEWER_OPERAR_BULLET =
  'No perfil viewer: use o Dashboard e este Guia; Submissões e módulos operacionais não aparecem no menu — URLs diretas mostram acesso restrito.';

export function resolveJourneyStepDetail(
  step: JourneyStepDefinition,
  showViewerHint: boolean,
): JourneyStepDefinition {
  const longBullets =
    showViewerHint && step.id === 'operar'
      ? [VIEWER_OPERAR_BULLET, ...step.longBullets]
      : step.longBullets;
  return {
    ...step,
    longBullets,
  };
}
