import type { DreInputCatalogLine } from '../shared/portal.types.js';

import {
  submissionStatusLabelPt,
  type DreAgentConversationContext,
  type DreHistoricalDreSnapshot,
} from './dreAgentContext.js';
export interface DreAssistantCitation {
  title: string;
  source: string;
  excerpt: string;
}

export interface DreAssistantFieldUpdate {
  lineCode: string;
  valueCurrency: number;
  label: string;
}

export interface DreAssistantTurnResult {
  answer: string;
  citations: DreAssistantCitation[];
  fieldUpdates: DreAssistantFieldUpdate[];
  focusLineCode: string | null;
  nextPrompt: string | null;
  requestSave: boolean;
  requestSubmit: boolean;
  mode: 'fallback' | 'llm';
  /**
   * Quando true, o cliente só aplica `fieldUpdates` após `cmd:confirm_value`.
   * Proposta fica também em `state_json.proposed_value` (persistência).
   */
  requiresFieldConfirmation?: boolean;
  /** Opcional — preenchido pelo handler `api/dre-agent.ts` para telemetria e smoke (`model`/provider real). */
  telemetry?: {
    assistant_provider: string;
    assistant_model: string;
  };
  /** Persistência DRE-ISA (opcional — handler grava quando flag habilitado). */
  isaPayload?: {
    marketing_pct_rbv_target: number;
    ebitda_target_pct_of_gross: number;
    updated_via: string;
  };
  /** Curadoria interna quando `cmd:turn_feedback`. */
  feedbackTelemetry?: { mood: 'positivo' | 'negativo'; reason?: string };
}

export interface DreAssistantFieldGuide {
  lineCode: string;
  label: string;
  aliases: string[];
  question: string;
  help: string;
  example: string;
}

const FIELD_GUIDES: Record<string, Omit<DreAssistantFieldGuide, 'lineCode' | 'label'>> = {
  gross_revenue: {
    aliases: ['rbv', 'receita bruta', 'receita bruta de vendas', 'faturamento'],
    question: 'Qual foi a Receita Bruta de Vendas (RBV) desta unidade no periodo?',
    help: 'Use o total bruto vendido no periodo, antes das deducoes. Esse campo e a base de toda a DRE. Ver glossario: docs/dre-glossario.md (revisao controladoria).',
    example: 'Exemplo: 560000 ou 560 mil.',
  },
  discounts_returns: {
    aliases: ['descontos', 'devolucoes'],
    question: 'Qual foi o total de descontos e devolucoes do periodo?',
    help: 'Informe descontos comerciais e devolucoes efetivamente concedidos no periodo.',
    example: 'Exemplo: 9000.',
  },
  split_holding: {
    aliases: ['split', 'split holding', 'repasse holding'],
    question: 'Qual foi o valor de Split Holding repassado no periodo?',
    help: 'Use o repasse da unidade para a holding que deve entrar como deducao operacional.',
    example: 'Exemplo: 16500.',
  },
  cispay: {
    aliases: ['cispay', 'plataforma cispay'],
    question: 'Quanto a unidade pagou de Cispay no periodo?',
    help: 'Informe o custo total da plataforma Cispay considerado na DRE do periodo.',
    example: 'Exemplo: 6000.',
  },
  ed_commission: {
    aliases: ['comissao ed', 'comissao executivos', 'comissao desenvolvimento'],
    question: 'Qual foi o total da comissao ED no periodo?',
    help: 'Use o total pago aos executivos de desenvolvimento relacionado ao periodo informado.',
    example: 'Exemplo: 12500.',
  },
  franchise_fee: {
    aliases: ['royalties', 'taxa franquia', 'franchise fee'],
    question: 'Qual foi o total da taxa de franquia no periodo?',
    help: 'Informe a taxa de franquia ou royalty reconhecida na unidade no periodo.',
    example: 'Exemplo: 15000.',
  },
  event_trainer_cost: {
    aliases: ['treinador', 'facilitador', 'custo treinador'],
    question: 'Quanto foi gasto com treinador ou facilitador do evento?',
    help: 'Use o custo do treinador principal ou facilitador vinculado ao evento do periodo.',
    example: 'Exemplo: 18000.',
  },
  variable_card_fees: {
    aliases: ['taxa cartao', 'cartoes', 'adquirencia'],
    question: 'Qual foi o total de taxas com cartoes e meios de pagamento?',
    help: 'Esse campo cobre taxas variaveis de adquirencia, gateways e operacoes de cartao.',
    example: 'Exemplo: 4200.',
  },
  variable_logistics: {
    aliases: ['logistica variavel', 'fretes variaveis', 'custo logistico'],
    question: 'Qual foi o custo logistico variavel fora do bloco do evento?',
    help: 'Use custos variaveis de logistica do periodo que nao ficaram dentro da despesa de evento.',
    example: 'Exemplo: 2800.',
  },
  variable_room_rent: {
    aliases: ['locacao sala', 'aluguel sala'],
    question: 'Qual foi o total de locacao de sala complementar no periodo?',
    help: 'Informe locacoes variaveis adicionais de sala ou estrutura complementar.',
    example: 'Exemplo: 3500.',
  },
  marketing_digital: {
    aliases: ['marketing digital', 'trafego', 'midia digital'],
    question: 'Quanto foi investido em marketing digital no periodo?',
    help: 'Use o total investido em campanhas digitais, trafego pago e midia online.',
    example: 'Exemplo: 12000.',
  },
  marketing_gifts: {
    aliases: ['brindes marketing', 'brindes promocionais'],
    question: 'Qual foi o total de brindes e materiais promocionais de marketing?',
    help: 'Esse campo registra brindes, kits promocionais e materiais de ativacao ligados ao marketing.',
    example: 'Exemplo: 1500.',
  },
  marketing_regional: {
    aliases: ['marketing regional', 'acao regional'],
    question: 'Quanto foi destinado ao marketing regional no periodo?',
    help: 'Use a parcela de marketing compartilhada ou regional reconhecida nesta unidade.',
    example: 'Exemplo: 3000.',
  },
  marketing_offline: {
    aliases: ['marketing offline', 'midia local', 'ativacao fisica'],
    question: 'Qual foi o valor de marketing offline no periodo?',
    help: 'Inclua acoes offline, midia local, eventos promocionais e ativacoes fisicas.',
    example: 'Exemplo: 2200.',
  },
  default_gross: {
    aliases: ['inadimplencia bruta', 'default bruto'],
    question: 'Qual foi a inadimplencia bruta do periodo?',
    help: 'Use o valor bruto inadimplente antes de recuperacoes ou renegociacoes.',
    example: 'Exemplo: 8000.',
  },
  default_recovery: {
    aliases: ['recuperacao inadimplencia', 'default recovery'],
    question: 'Quanto foi recuperado da inadimplencia no periodo?',
    help: 'Informe o valor recuperado de inadimplencia para o sistema calcular a inadimplencia liquida.',
    example: 'Exemplo: 2500.',
  },
  people_total: {
    aliases: ['pessoas', 'folha', 'time'],
    question: 'Qual foi o total de despesas de pessoas no periodo?',
    help: 'Inclua folha, encargos e demais custos de pessoas reconhecidos na unidade.',
    example: 'Exemplo: 95000.',
  },
  cto_total: {
    aliases: ['cto', 'tecnologia', 'sistemas'],
    question: 'Qual foi o total de CTO ou tecnologia no periodo?',
    help: 'Use o total de tecnologia, sistemas, ferramentas e custos correlatos do periodo.',
    example: 'Exemplo: 8000.',
  },
  utilities_services_total: {
    aliases: ['utilities', 'servicos', 'agua', 'energia', 'internet'],
    question: 'Quanto a unidade gastou com utilities e servicos no periodo?',
    help: 'Esse campo agrupa agua, energia, internet, servicos recorrentes e utilidades da operacao.',
    example: 'Exemplo: 12000.',
  },
  general_expenses_total: {
    aliases: ['despesas gerais', 'gerais', 'administrativas'],
    question: 'Qual foi o total de despesas gerais no periodo?',
    help: 'Use despesas administrativas e gerais nao classificadas em outros blocos operacionais.',
    example: 'Exemplo: 14000.',
  },
  taxes: {
    aliases: ['impostos', 'taxas fiscais', 'tributos'],
    question: 'Qual foi o total de impostos do periodo?',
    help: 'Informe o valor total de impostos para o sistema calcular o EBITDA 2 oficial.',
    example: 'Exemplo: 18000.',
  },
};

/** Fases guiadas (UI + comandos): 10 passos conforme fluxo oficial Febracis / IFRS BRC. */
export const DRE_PHASE_COUNT = 10;

export interface DreAssistantPhaseMeta {
  id: number;
  title: string;
  /** Filtro: linhas de entrada desta fase (por line_code quando definido). */
  lineCodes?: string[];
}

export interface ProposedAssistantValue {
  line_code: string;
  amount: number;
}

export type AssistantAcceptanceState = 'none' | 'pending' | 'accepted';

export const KNOWN_AGENT_COMMAND_NAMES = [
  'start',
  'explain_field',
  'next_field',
  'prev_field',
  'skip_field',
  'phase_summary',
  'list_phase',
  'explain_phase',
  'where_am_i',
  'propose_value',
  'confirm_value',
  'reject_value',
  'save_draft',
  'restart',
  'compare_with_prev_month',
  'summarize_franchise_history',
  'set_ideal_state',
  'turn_feedback',
] as const;

export type AgentCommandName = (typeof KNOWN_AGENT_COMMAND_NAMES)[number];

export type ParsedAgentMessage =
  | { kind: 'free'; raw: string }
  | { kind: 'cmd'; name: AgentCommandName; args: string[] };

export interface DeterministicCommandSessionPatch {
  dre_phase?: number | null;
  proposed_value?: ProposedAssistantValue | null;
  acceptance_state?: AssistantAcceptanceState;
  skipped_line_codes?: string[];
}

export interface RunDeterministicCommandResult {
  result: DreAssistantTurnResult;
  sessionPatch: DeterministicCommandSessionPatch;
}

const PHASE_DEFINITIONS: readonly DreAssistantPhaseMeta[] = [
  { id: 1, title: 'Receita bruta', lineCodes: undefined },
  { id: 2, title: 'Deduções RBV', lineCodes: undefined },
  { id: 3, title: 'Despesas de evento', lineCodes: undefined },
  { id: 4, title: 'Despesas variáveis', lineCodes: undefined },
  { id: 5, title: 'Marketing', lineCodes: undefined },
  { id: 6, title: 'Inadimplência', lineCodes: undefined },
  { id: 7, title: 'Folha CLT', lineCodes: ['people_total'] },
  {
    id: 8,
    title: 'Estrutura / Adm.',
    lineCodes: ['cto_total', 'utilities_services_total', 'general_expenses_total'],
  },
  { id: 9, title: 'Impostos', lineCodes: ['taxes'] },
  { id: 10, title: 'MC2 · EBITDA · Encerramento', lineCodes: undefined },
];

export function getDrePhaseMetas(): readonly DreAssistantPhaseMeta[] {
  return PHASE_DEFINITIONS;
}

export function phaseTitle(phaseId: number): string {
  return PHASE_DEFINITIONS.find((phase) => phase.id === phaseId)?.title ?? `Fase ${phaseId}`;
}

/**
 * Mapa editorial 1–10: RBV → … → resultado.
 * Para fases que partilham section_code (`structure`), usa line_code para segmentar Folha vs demais custos estruturais.
 */
export function mapLineToPhase(line: DreInputCatalogLine): number {
  switch (line.section_code) {
    case 'rbv':
      return 1;
    case 'deductions':
      return 2;
    case 'event_expenses':
      return 3;
    case 'variable_expenses':
      return 4;
    case 'marketing':
      return 5;
    case 'default':
      return 6;
    case 'structure': {
      if (line.line_code === 'people_total') {
        return 7;
      }
      return 8;
    }
    case 'taxes':
      return 9;
    case 'result':
      return 10;
    default:
      return Math.min(
        10,
        Math.max(1, Math.round(line.section_order / 10)),
      );
  }
}

export function getPhaseProgress(
  phaseId: number,
  lines: DreInputCatalogLine[],
  currentValues: Record<string, string>,
  skippedLineCodes?: Set<string>,
): { filled: number; total: number } {
  const targetLines = lines.filter((line) => mapLineToPhase(line) === phaseId);
  const guided = targetLines.filter((line) => line.input_mode === 'currency');
  const countable = guided.filter((line) => {
    const raw = currentValues[line.line_code] ?? '';
    const numeric = raw.trim().length > 0;
    const skipped = skippedLineCodes?.has(line.line_code);
    return numeric || skipped;
  });
  return { filled: countable.length, total: Math.max(guided.length, 1) };
}

export function listLinesInPhase(phaseId: number, lines: DreInputCatalogLine[]): DreInputCatalogLine[] {
  return lines.filter((line) => mapLineToPhase(line) === phaseId);
}

export function findFirstLineOfPhase(
  phaseId: number,
  lines: DreInputCatalogLine[],
  currentValues: Record<string, string>,
  skippedLineCodes?: Set<string>,
): DreInputCatalogLine | null {
  const inPhase = listLinesInPhase(phaseId, lines);
  return (
    inPhase.find((line) => {
      if (skippedLineCodes?.has(line.line_code)) {
        return false;
      }
      return (currentValues[line.line_code] ?? '').trim().length === 0;
    }) ?? inPhase[0] ?? null
  );
}

/**
 * Extrai comandos determinísticos `cmd:*` (UI e testes).
 */
export function parseAgentCommand(rawMessage: string): ParsedAgentMessage {
  const trimmed = rawMessage.trim();
  if (!/^cmd:/i.test(trimmed)) {
    return { kind: 'free', raw: trimmed };
  }

  const rest = trimmed.slice(4).trim();
  if (rest.length === 0) {
    return { kind: 'free', raw: trimmed };
  }

  const tokens = rest.split(/\s+/).filter(Boolean);
  const head = tokens[0]?.toLowerCase() ?? '';
  const normalizedName = head.replace(/-/g, '_');
  const isKnown = (KNOWN_AGENT_COMMAND_NAMES as readonly string[]).includes(normalizedName);

  if (!isKnown) {
    return { kind: 'free', raw: trimmed };
  }

  return {
    kind: 'cmd',
    name: normalizedName as AgentCommandName,
    args: tokens.slice(1),
  };
}

const FALLBACK_KNOWLEDGE_SNIPPET: DreAssistantCitation[] = [
  {
    title: 'Fluxo oficial da DRE',
    source: 'docs/logica-da-dre-e-do-workflow.md',
    excerpt:
      'O dado nasce em Submissoes, e a unidade preenche somente as linhas editaveis. O sistema recalcula DRE e KPIs antes de envio e revisao.',
  },
];

function emptyPack(
  overrides: Partial<DreAssistantTurnResult>,
  sessionPatch: DeterministicCommandSessionPatch = {},
): RunDeterministicCommandResult {
  return {
    result: {
      answer: '',
      citations: FALLBACK_KNOWLEDGE_SNIPPET,
      fieldUpdates: [],
      focusLineCode: null,
      nextPrompt: null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
      ...overrides,
    },
    sessionPatch,
  };
}

/** Texto fixo para o franqueado — sem códigos internos. */
export const ASSISTANT_REPLY_FORMAT_HINT =
  'Na próxima mensagem manda só o valor em reais (ex.: 1.234,56 ou 25000).';

export const ASSISTANT_FALLBACK_COPY_VARIANTS = {
  explain_continue_anchor_focus: [
    'Posso abrir {{field}} com clareza, ou qualquer outro campo. É só você dizer qual.',
    'Vamos por {{field}} primeiro e seguimos no que falta. Me avisa onde quer ir depois.',
    'Se quiser, começo em {{field}} e você me puxa para o próximo ponto.',
  ],
  explain_continue_anchor_loose: [
    'Me diz qual linha da DRE quer ver, ou pede um resumo de onde estamos na fase.',
    'Pode citar o nome do campo ou só perguntar “onde estamos” no roteiro.',
    'Ou você escolhe uma linha, ou a gente faz o panorama da fase atual.',
  ],
  explain_off_topic_realign_loose: [
    'Pode perguntar por um campo da lista ou pelo caminho até enviar a DRE.',
    'Ou é dúvida numa linha específica, ou no passo a passo até a revisão.',
    'Estou aqui para campo a campo ou para o fluxo inteiro até a controladoria.',
  ],
  explain_off_topic_realign_focus: [
    'Se fizer sentido, a gente mergulha em {{field}}. Explico direto, sem enrolação.',
    'Quer que eu detalhe {{field}}? Posso, ou mudamos para outra linha.',
    'Caraca, {{field}} é um bom foco. Te explico direto.',
    'Prefere que eu foque em {{field}} agora ou já puxamos outro ponto da planilha?',
  ],
  explain_need_submission: [
    'Para eu te orientar linha a linha, preciso de uma submissão aberta neste recorte. Neste modo eu não altero valor; só explico.',
    'Abre uma submissão válida aqui ao lado. Aí eu consigo te guiar no fluxo sem gravar nada por você.',
    'Escolhe ou cria a submissão deste período e da franquia. Daí em diante explico campos e fases, sem tocar nos números.',
  ],
  full_need_submission: [
    'Para conduzir campo a campo, preciso de um rascunho aberto. No topo da página use “Criar rascunho” ou “Abrir rascunho” e volta aqui; aí a gente segue a conversa.',
    'Primeiro passo: abrir um rascunho válido (botões “Criar rascunho” / “Abrir rascunho”). Sem isso eu não consigo encaixar o roteiro no chat.',
    'Quando tiver submissão editável aberta ao lado, retomamos com valores e confirmações. Até lá fico no aguardo.',
  ],
  full_save_panel_hint: [
    'Anotado: você quer salvar. No painel à direita use “Salvar rascunho” para gravar no sistema com data e versão certas.',
    'Beleza, vamos gravar. O passo oficial é “Salvar rascunho” na barra lateral; ali fecha a versão.',
    'Combinado. Confirma com “Salvar rascunho” no painel ao lado para o registro ficar redondo antes de novos valores.',
  ],
  full_submit_panel_hint: [
    'O envio para a controladoria é pelo botão “Enviar para revisão” na lateral. Antes disso posso te ajudar a conferir número por número.',
    'Revisão formal sai pelo botão da barra lateral. Daqui eu alinho dúvidas e valores; a decisão de enviar é sua no painel.',
    'Quando os números estiverem ok na planilha, é “Enviar para revisão” à direita. Se quiser, revisamos juntos antes.',
  ],
  full_skip_need_focus: [
    'Ainda não tenho campo em foco. Clica em “Olá” para começar o roteiro, ou manda direto o valor em reais da próxima linha.',
    'Preciso de uma referência: “Olá” ou já manda um valor de uma linha e a gente trata de pular o que for preciso.',
    'Para pular linha faz sentido depois de iniciarmos. “Olá” ou o primeiro valor que você quer tratar nesta sessão.',
  ],
  full_skip_leave_blank: [
    'Sem problema. Deixamos {{field}} em branco por enquanto. Quando quiser voltar, me chama.',
    'Combinado: {{field}} fica vazio agora. Quando for retomar, é só avisar.',
    'Tranquilo. {{field}} espera sua decisão; retomamos quando couber no roteiro.',
  ],
  full_field_answer_suffix: [
    '{{hint}}',
    'Para responder aqui no chat: {{hint}}',
    'Na sua próxima mensagem: {{hint}}',
  ],
  full_numeric_proposal: [
    'Proposta: {{amount}} em {{field}}. Se estiver certo, confirma no mini-card (“Confirmar”) ou manda cmd:confirm_value. Aí o sistema recalcula MC1, MC2 e EBITDA.',
    'Registrei {{amount}} em {{field}}. Confere no cartão rápido ou com cmd:confirm_value; os totais grandes atualizam depois da confirmação oficial.',
    'Anotei {{amount}} na linha {{field}}. Valida pelo card ou cmd:confirm_value para fechar no fluxo; só então os indicadores grandes viram no painel.',
  ],
  explain_off_topic: [
    'Meu foco aqui é a DRE deste período: o que cada linha pede, a ordem e o padrão Febracis. {{realign}}',
    'Vamos direto à planilha: o que preencher, onde e por quê. Assim eu te ajudo de verdade. {{realign}}',
    'Prefiro manter a conversa na DRE desta competência; é onde eu consigo ser mais útil. {{realign}}',
  ],
  /** Ponte curta após `guide.help` em off-topic com campo em evidência — evita copy que só convida sem entregar texto. */
  explain_off_topic_hint_after_substance: [
    'Isto é o que a linha pede neste período para «{{field}}». Se precisar, puxamos outra linha do roteiro.',
    'Posso ficar só neste ponto ou alinhar o próximo campo — você escolhe o ritmo.',
    'Se ficou ponta solta sobre «{{field}}», diz qual ângulo que eu aprofundo.',
  ],
  explain_continue_guided: [
    'Combinado. {{anchor}}',
    'Bora. {{anchor}}',
    'Yes. {{anchor}}',
    'Fechado, seguimos. {{anchor}}',
  ],
  explain_greeting: [
    'Sou o apoio à DRE Febracis. Neste modo você só olha: eu explico campos, fases e envio. Quem grava número na submissão é quem tem permissão na unidade; daqui eu não altero valor nem salvo rascunho.',
    'Olá. Estou para orientar na DRE: o que cada linha cobra e como segue o fluxo. Explicação é comigo; os valores na planilha entram com quem opera a unidade.',
    'Oi. Aqui eu esclareço linha por linha e o caminho até o envio. Rascunho e gravação ficam com o time que tem edição na unidade.',
  ],
  explain_save_readonly: [
    'Neste modo leitura eu não salvo nem envio. Quem edita usa “Salvar rascunho” e “Enviar para revisão” no painel ao lado.',
    'Gravar ou enviar é com quem opera a submissão. Eu fico na orientação, sem acionar botão de gravação.',
    'Salvar e enviar continuam na lateral (“Salvar rascunho” / “Enviar para revisão”). Pelo chat, em modo orientação, eu não disparo isso.',
  ],
  explain_skip_readonly: [
    'Pular ou mudar o que já foi preenchido na prática só quem opera a submissão. Eu te explico o que cada campo significa.',
    'Para avançar ou pular “de verdade” precisa do perfil que edita. Eu consigo só contar o que a linha representa.',
    'Avançar, voltar ou pular campo exige edição na submissão. Até lá explico o conceito antes de alguém preencher.',
  ],
  explain_currency_readonly: [
    'Entendi o valor, mas neste modo orientação eu não aplico na submissão. Repassa pra quem edita ou pede só a explicação do campo.',
    'Número recebido; em modo leitura ele não entra na planilha. Quem edita coloca na grelha; se for dúvida conceitual, eu detalho a linha.',
    'Valor anotado, mas aqui é só leitura: não gravo na DRE. Ou passa para o time com edição, ou perguntamos só o significado do campo.',
  ],
  explain_fallback: [
    'Fico na DRE: campos, fluxo e validação. {{hint}} Eu não altero dado nem recalculo MC1, MC2 e EBITDA; isso aparece no painel depois da gravação na unidade.',
    'Posso falar da planilha, do passo a passo e do que cada linha significa. {{hint}} Os totais você vê ao lado quando quem opera salvar.',
    'Meu trabalho aqui é dúvida de campo e roteiro Febracis. {{hint}} MC1, MC2 e EBITDA vêm do motor oficial a cada gravação no painel.',
  ],
  explain_field_tail: [
    'No seu perfil, número entra por quem opera a unidade. Ao lado o painel mostra MC1, MC2 e EBITDA depois de cada gravação.',
    'Quando a unidade confirma na planilha, os totais atualizam sozinhos. Aqui eu alinho só o significado das linhas.',
    'Sem perfil de edição eu não mexo em número; com gravação oficial lá ao lado MC1, MC2 e EBITDA acompanham.',
  ],
  full_off_topic: [
    'Voltando pra DRE deste período. {{anchor}}',
    'Continuamos na planilha. {{anchor}}',
    'Sem drama, retomo o roteiro com você. {{anchor}}',
  ],
  full_continue_guided: [
    'Combinado, seguimos no roteiro. {{anchor}}',
    'Yes — vamos em frente. {{anchor}}',
    'Ótimo, próximo passo. {{anchor}}',
    'Perfeito. {{anchor}}',
  ],
  full_greeting_with_franchise: [
    '{{identity}}Vamos na DRE{{period}}{{city}} da unidade {{trade}}, com calma. Um campo de cada vez em reais; MC1, MC2 e EBITDA o sistema recalcula quando você confirma.',
    '{{identity}}Estou com você na DRE{{period}}{{city}}, unidade {{trade}}. Um número por vez em reais; os totais grandes fecham no motor oficial após suas confirmações.',
    '{{identity}}DRE{{period}}{{city}} para {{trade}}, sem correria: campo a campo em reais. MC1, MC2 e EBITDA acompanham o fluxo oficial depois das confirmações.',
  ],
  full_greeting_generic: [
    '{{identity}}Foco no preenchimento da DRE deste período. Um valor por vez em reais; MC1, MC2 e EBITDA atualizam quando você confirma. Pode mandar o próximo número ou pedir ajuda num campo.',
    '{{identity}}A ideia é ir campo a campo em reais, sem pressa. Os indicadores consolidados aparecem no painel após confirmar; manda valor ou nomeia a linha.',
    '{{identity}}Vamos pela DRE do período, campo a campo, sempre em reais. Os totais grandes ficam ao lado quando você fecha pelo fluxo habitual.',
  ],
  full_default_guided: [
    'Seguimos a ordem da planilha. {{hint}} O que você mandar entra na DRE e o painel ao lado mostra o efeito.',
    'Te guio pelo roteiro oficial da DRE. {{hint}} Usa a mensagem para valor em reais ou pergunta onde travou.',
    'O catálogo Febracis manda no roteiro. {{hint}} Manda valor aqui ou pede explicação no ponto difícil.',
  ],
  ui_realign_banner: [
    'Sugestão de roteiro: {{step}}',
    'Podemos ir por aqui: {{step}}',
    'Retomo o passo da planilha: {{step}}',
  ],
  ui_realign_banner_no_step: [
    'Quando quiser retomamos o roteiro da DRE pelo painel ao lado.',
    'Fica à vontade pra voltar ao passo a passo quando fizer sentido.',
    'O painel aponta o próximo campo; me avisa se quiser alinhar o chat também.',
  ],
} as const;

export type DreAssistantFallbackCopyIntent = keyof typeof ASSISTANT_FALLBACK_COPY_VARIANTS;

function hashFallbackSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Escolhe uma variante de copy humana de forma determinística (reprodutível em testes).
 * `seed` típico: `buildFallbackCopySeed(userMessage, intent, currentLineCode)`.
 * Placeholders: `{{chave}}` substituídos por `vars`.
 */
export function pickFallbackCopy(
  intent: DreAssistantFallbackCopyIntent,
  seed: string,
  vars: Record<string, string> = {},
): string {
  const list = ASSISTANT_FALLBACK_COPY_VARIANTS[intent] as readonly string[];
  const idx = list.length > 0 ? hashFallbackSeed(`${seed}|${intent}`) % list.length : 0;
  let out = list[idx] ?? '';
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

/** Semente estável para variantes de copy (mensagem + intent + linha em foco). */
export function buildFallbackCopySeed(
  userMessage: string,
  intent: string,
  currentLineCode: string | null | undefined,
): string {
  return `${normalizeText(userMessage)}|${intent}|${currentLineCode ?? ''}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove códigos internos (line_code) do texto mostrado ao utilizador.
 */
export function stripInternalLineCodesFromUserText(
  text: string,
  lineCodes: readonly string[],
): string {
  let out = text;
  const sorted = [...lineCodes].sort((left, right) => right.length - left.length);
  for (const code of sorted) {
    const escaped = escapeRegExp(code);
    out = out.replace(new RegExp(`\\s*\\(${escaped}\\)`, 'gi'), '');
    out = out.replace(new RegExp(`\\s*\\[${escaped}\\]`, 'gi'), '');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '');
  }
  out = out.replace(/\s*\([a-z][a-z0-9_]*(?:_[a-z0-9_]+)+\)/gi, '');
  return out.replace(/\s{2,}/g, ' ').trim();
}

function normalizeHintComparableText(value: string): string {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evita faixa de status redundante quando a última bolha do assistente já traz o mesmo passo sugerido.
 */
export function bubbleCoversAssistantStepHint(bubbleContent: string, stepText: string | null | undefined): boolean {
  if (!stepText || stepText.trim().length < 6) {
    return false;
  }
  const bubble = normalizeHintComparableText(bubbleContent);
  const step = normalizeHintComparableText(stepText);
  if (!bubble || !step) {
    return false;
  }
  if (bubble.includes(step)) {
    return true;
  }
  const tokens = step.split(/\s+/).filter((word) => word.length >= 4);
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every((word) => bubble.includes(word));
}

/**
 * Indica quando a última bolha já é uma resposta «onde estamos» / cmd:where_am_i (determinística).
 * Usado pela faixa amarela de realinhamento: checkpoint `off_topic` obsoleto não deve empurrar o próximo campo.
 */
export function bubbleLooksLikeGuidedWhereAmIAnswer(bubbleContent: string): boolean {
  const b = normalizeHintComparableText(bubbleContent);
  if (b.length < 50) {
    return false;
  }
  const hasRoadmapEvidence = /\bem evidencia\b/.test(b) && /\broteiro\b/.test(b);
  if (hasRoadmapEvidence && /\bestamos na fase \d+ de \d+/.test(b)) {
    return true;
  }
  if (hasRoadmapEvidence && /\bcampos com valor\b/.test(b)) {
    return true;
  }
  if (/\bsem catalogo de linhas suficiente\b/.test(b) && /\bmedir etapa\b/.test(b)) {
    return true;
  }
  return false;
}

/** Copy curta para faixa de realinhamento na UI (tom acolhedor, sem repetir a bolha). */
export function pickUiRealignBannerHint(stepText: string | null | undefined, seed: string): string {
  const trimmed = stepText?.trim() ?? '';
  if (!trimmed) {
    return pickFallbackCopy('ui_realign_banner_no_step', seed, {});
  }
  return pickFallbackCopy('ui_realign_banner', seed, { step: trimmed });
}

/**
 * Prioriza excertos do catálogo + docs estáticos com base na mensagem e no campo em foco
 * (relevância lexical — não é RAG vetorial).
 */
export function retrieveRelevantAssistantKnowledge(
  lines: DreInputCatalogLine[],
  userMessage: string,
  currentLineCode: string | null,
  maxItems: number,
): DreAssistantCitation[] {
  const all = buildAssistantKnowledge(lines);
  const normalizedUser = normalizeText(userMessage);
  const userTokens = normalizedUser.split(/\s+/).filter((token) => token.length > 2);
  const focusLine = currentLineCode
    ? lines.find((line) => line.line_code === currentLineCode) ?? null
    : null;
  const focusGuide = focusLine ? getFieldGuide(focusLine) : null;
  const focusHaystack = focusGuide
    ? normalizeText(`${focusGuide.label} ${focusGuide.help} ${focusLine?.section_name ?? ''}`)
    : '';

  const scored = all.map((citation, index) => {
    const haystack = normalizeText(`${citation.title} ${citation.source} ${citation.excerpt}`);
    let score = 0;
    if (focusLine && citation.source.includes(focusLine.line_code)) {
      score += 6;
    }
    if (focusGuide && haystack.includes(normalizeText(focusGuide.label))) {
      score += 4;
    }
    for (const token of userTokens) {
      if (haystack.includes(token)) {
        score += 1;
      }
    }
    if (focusHaystack) {
      const focusTokens = focusHaystack.split(/\s+/).filter((t) => t.length > 3);
      for (const token of focusTokens) {
        if (haystack.includes(token)) {
          score += 0.5;
        }
      }
    }
    if (citation.source.startsWith('docs/')) {
      score += 0.35;
    }
    score -= index * 0.01;
    return { citation, score };
  });

  scored.sort((left, right) => right.score - left.score);
  const picked = scored.slice(0, maxItems).map((row) => row.citation);
  return picked.length > 0 ? picked : all.slice(0, maxItems);
}

const STATIC_KNOWLEDGE: DreAssistantCitation[] = [
  {
    title: 'Fluxo oficial da DRE',
    source: 'docs/logica-da-dre-e-do-workflow.md',
    excerpt:
      'O dado nasce em Submissoes, e a unidade preenche somente as linhas editaveis. O sistema recalcula DRE e KPIs antes de envio e revisao.',
  },
  {
    title: 'Regra de governanca',
    source: 'docs/logica-da-dre-e-do-workflow.md',
    excerpt:
      'Depois de submitted, a unidade nao pode editar, reenviar ou criar nova versao por conta propria. A unica excecao operacional e pending_adjustment.',
  },
  {
    title: 'Motor oficial da DRE',
    source: 'docs/logica-da-dre-e-do-workflow.md',
    excerpt:
      'EBITDA 1 e EBITDA 2 sao sempre derivados da cadeia oficial de calculo e nunca digitados manualmente.',
  },
  {
    title: 'Regimes tributários (visão rápida)',
    source: 'docs/dre-glossario.md',
    excerpt:
      'Lucro presumido usa base legal enquadrado; lucro real acompanha contabilidade competitiva completa; Simples nacional tem sublimites por atividade.',
  },
  {
    title: 'Evento cancelado / estorno tardio',
    source: 'docs/dre-glossario.md',
    excerpt:
      'Descontos e devoluções aparecem no mesmo período do fato gerador segundo orientação financeira registrada pela unidade.',
  },
  {
    title: 'Comissões revisadas no mês seguinte',
    source: 'docs/dre-glossario.md',
    excerpt:
      'Ajustes de comissões reconhecidos no período em que ficaram liquidados pela controladoria evitam “varredura MC” no assistente.',
  },
  {
    title: 'RL × RBV (coerência de narrativa)',
    source: 'docs/dre-glossario.md',
    excerpt:
      'RBV neste fluxo refere-se ao cabeçalho comercial oficial da unidade; receita líquida usada pela controladoria aparece deduzida no bloco seguinte quando aplicável.',
  },
];

/** Subconjunto institucional mínimo para modo bitterPrompt (compacto para modelo forte). */
export function compactStaticKnowledgeForBitterMode(): DreAssistantCitation[] {
  return STATIC_KNOWLEDGE.slice(0, 4);
}

const STATIC_KNOWLEDGE_DOC_SOURCES = new Set(STATIC_KNOWLEDGE.map((c) => c.source));

export function mergeCitationsForBitterPrompt(citations: DreAssistantCitation[]): DreAssistantCitation[] {
  const nonStatic = citations.filter((c) => !STATIC_KNOWLEDGE_DOC_SOURCES.has(c.source));
  const mergedOrdered: DreAssistantCitation[] = [];
  const seenKey = new Set<string>();
  for (const chunk of [...compactStaticKnowledgeForBitterMode(), ...nonStatic]) {
    const k = `${chunk.source}::${chunk.title}`;
    if (!seenKey.has(k)) {
      seenKey.add(k);
      mergedOrdered.push(chunk);
    }
  }
  return mergedOrdered.slice(0, 8);
}

export interface PersonaMemoryCandidate {
  kind: 'preference' | 'fact' | 'recurrent_doubt' | 'pace' | 'dre_ideal_state';
  key: string;
  value: Record<string, unknown>;
  confidence: number;
}

const PERSONA_KIND_ALLOWLIST = new Set<PersonaMemoryCandidate['kind']>([
  'pace',
  'preference',
  'recurrent_doubt',
]);

const PERSONA_KEYS_BY_KIND: Partial<Record<PersonaMemoryCandidate['kind'], Set<string>>> = {
  pace: new Set(['ritmo_inferido']),
  preference: new Set(['linguagem']),
  recurrent_doubt: new Set(['auto_tag']),
};

function constrainPersonaValue(kind: PersonaMemoryCandidate['kind'], value: Record<string, unknown>) {
  if (kind === 'pace') {
    const text =
      typeof value.text === 'string' ? value.text.trim().slice(0, 200) : null;
    const raw =
      typeof value.raw === 'string' ? value.raw.trim().slice(0, 240) : null;
    const out: Record<string, unknown> = {};
    if (text?.length) {
      out.text = text;
    }
    if (raw?.length) {
      out.raw = raw;
    }
    return out;
  }
  const texto = typeof value.texto === 'string' ? value.texto.trim().slice(0, 300) : null;
  return texto?.length ? { texto } : {};
}

/**
 * Extrai poucos candidates heurísticos (sem LLM) para memória persona.
 * Produção faz merge com TTL + filtragem servidor.
 */
export function extractPersonaCandidatesFromTurn(userMessage: string): PersonaMemoryCandidate[] {
  const n = normalizeText(userMessage);
  if (n.length < 24) {
    return [];
  }
  const picksRaw: PersonaMemoryCandidate[] = [];

  const paceMatch = /\b(costumo|prefiro)\s+preencher\s+([\wÀ-ú\s]+)/i.exec(userMessage);
  if (paceMatch?.[2]) {
    picksRaw.push({
      kind: 'pace',
      key: 'ritmo_inferido',
      value: { text: paceMatch[2].trim(), raw: userMessage.slice(0, 240) },
      confidence: 0.55,
    });
  }

  if (n.includes('prefiro')) {
    picksRaw.push({
      kind: 'preference',
      key: 'linguagem',
      value: { texto: userMessage.trim().slice(0, 300) },
      confidence: 0.52,
    });
  }

  if (/\b(sempre|toda vez|recorrentemente)\s+(tenho duvida)\b/i.test(n)) {
    picksRaw.push({
      kind: 'recurrent_doubt',
      key: 'auto_tag',
      value: { texto: userMessage.trim().slice(0, 300) },
      confidence: 0.5,
    });
  }

  const sanitized: PersonaMemoryCandidate[] = [];
  for (const cand of picksRaw) {
    if (!PERSONA_KIND_ALLOWLIST.has(cand.kind)) {
      continue;
    }
    const allowedKeys = PERSONA_KEYS_BY_KIND[cand.kind];
    if (!allowedKeys?.has(cand.key)) {
      continue;
    }
    const value = constrainPersonaValue(cand.kind, cand.value);
    if (!Object.keys(value).length) {
      continue;
    }
    sanitized.push({ ...cand, value });
  }

  return sanitized.slice(0, 4);
}

const PHASE_PEDAGOGY: Record<number, string> = {
  1: 'Primeiro seguramos RBV porque ela ordena todas as margens seguintes dentro da Lei das S.A. articuladas com NBC TG 26.',
  2: 'Deduções e devoluções reduzem RBV até a base comercial oficial da unidade antes de custos diretos típicos de CMV/MC1.',
  3: 'Eventos alto impacto ficam segregados aqui para evitar contaminar estruturas fixas e marketing médio.',
  4: 'Variáveis operacionais acompanham volume sem ser evento próprio nem marketing institucional.',
  5: 'Marketing aparece granular (digital/regional/brindes) para auditar política rede vs unidade.',
  6: 'Inadimplência bruto + recuperações em campos paralelos aumenta transparência com controladoria.',
  7: 'Folha CLT aparece antes do bloco genérico de estruturas para destacar política trabalhista local.',
  8: 'CTO/utilidades/generais fecha custos estruturais antes do bloco tributário obrigatório ao EBITDA 2.',
  9: 'Impostos encerrados aqui porque alimentam o EBITDA 2 perseguido no board Febracis.',
  10: 'MC2 e EBITDA seguem apenas leitura no painel oficial — conferência regressiva para marketing e tributos.',
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function parseAssistantCurrencyReply(rawValue: string) {
  const normalized = normalizeText(rawValue);
  const match = normalized.match(/-?\d[\d.,]*/);

  if (!match) {
    return null;
  }

  const rawNumber = match[0];
  let numericValue = rawNumber;

  if (rawNumber.includes('.') && rawNumber.includes(',')) {
    numericValue = rawNumber.replace(/\./g, '').replace(',', '.');
  } else if (rawNumber.includes(',')) {
    numericValue = rawNumber.replace(',', '.');
  }

  const parsed = Number(numericValue);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const multiplier = normalized.includes('milhao') || normalized.includes('milhoes')
    ? 1_000_000
    : normalized.includes('mil')
      ? 1_000
      : 1;

  return Math.round(parsed * multiplier * 100) / 100;
}

export function getFieldGuide(line: DreInputCatalogLine): DreAssistantFieldGuide {
  const knownGuide = FIELD_GUIDES[line.line_code];
  const label = line.line_name;

  if (knownGuide) {
    return {
      lineCode: line.line_code,
      label,
      ...knownGuide,
    };
  }

  return {
    lineCode: line.line_code,
    label,
    aliases: [normalizeText(label), normalizeText(line.section_name)],
    question: `Qual e o valor de ${label} no periodo atual?`,
    help: line.description ?? `Informe o valor de ${label} para que o motor oficial recalcule a DRE.`,
    example: 'Exemplo: 15000.',
  };
}

export function buildAssistantKnowledge(lines: DreInputCatalogLine[]) {
  const lineKnowledge = lines.map((line) => {
    const guide = getFieldGuide(line);

    return {
      title: guide.label,
      source: `${line.section_name} • ${line.line_code}`,
      excerpt: `${guide.help} ${guide.example}`,
    } satisfies DreAssistantCitation;
  });

  return [...STATIC_KNOWLEDGE, ...lineKnowledge];
}

export function findLineByPrompt(
  lines: DreInputCatalogLine[],
  userMessage: string,
) {
  const normalizedMessage = normalizeText(userMessage);

  return lines.find((line) => {
    const guide = getFieldGuide(line);
    const candidates = [
      guide.label,
      line.line_code.replace(/_/g, ' '),
      ...guide.aliases,
    ].map(normalizeText);

    return candidates.some((candidate) => normalizedMessage.includes(candidate));
  }) ?? null;
}

export function findNextGuidedLine(
  lines: DreInputCatalogLine[],
  currentValues: Record<string, string>,
  currentLineCode?: string | null,
  options?: { skippedLineCodes?: Set<string> },
) {
  const skipped = options?.skippedLineCodes;
  const currentIndex = currentLineCode
    ? lines.findIndex((line) => line.line_code === currentLineCode)
    : -1;

  const orderedLines = currentIndex >= 0
    ? [...lines.slice(currentIndex + 1), ...lines.slice(0, currentIndex + 1)]
    : [...lines];

  return (
    orderedLines.find((line) => {
      if (skipped?.has(line.line_code)) {
        return false;
      }
      const rawValue = currentValues[line.line_code] ?? '';
      return rawValue.trim().length === 0;
    }) ??
    lines[(currentIndex + 1) % Math.max(lines.length, 1)] ??
    null
  );
}

/** Linha imediatamente anterior na ordem do catálogo (roteiro oficial). */
export function findPreviousGuidedLine(
  lines: DreInputCatalogLine[],
  currentLineCode?: string | null,
): DreInputCatalogLine | null {
  if (!currentLineCode || lines.length === 0) {
    return null;
  }
  const idx = lines.findIndex((line) => line.line_code === currentLineCode);
  if (idx <= 0) {
    return null;
  }
  return lines[idx - 1] ?? null;
}

export function buildQuestionForLine(line: DreInputCatalogLine) {
  const guide = getFieldGuide(line);
  return `${guide.question} ${guide.example} ${ASSISTANT_REPLY_FORMAT_HINT}`;
}

/**
 * Resposta determinística tipo `cmd:where_am_i`: fase atual (1–10), campo em evidência no roteiro
 * e progresso global — usada quando o utilizador pede etapa/passagem em linguagem natural.
 */
export function composeGuidedWhereAmIAnswer(input: {
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  guidedLineCode: string | null;
  skippedLineCodes?: Set<string> | Iterable<string> | readonly string[];
}): {
  answer: string;
  focusLineCode: string | null;
  nextPrompt: string | null;
  drePhase: number | null;
} {
  const iterable = input.skippedLineCodes ?? [];
  const skipped =
    iterable instanceof Set ? iterable : new Set(Array.from(iterable as Iterable<string>));
  const skipOpts = { skippedLineCodes: skipped };
  const { lines, currentValues } = input;
  const guidedLineCode = input.guidedLineCode;
  const explicit =
    guidedLineCode !== null && guidedLineCode.length > 0
      ? (lines.find((line) => line.line_code === guidedLineCode) ?? null)
      : null;
  const focus =
    explicit ?? findNextGuidedLine(lines, currentValues, null, skipOpts) ?? lines[0] ?? null;
  const total = Math.max(lines.length, 1);
  const filled = countFilledInputs(lines, currentValues);
  const pct = Math.round((filled / total) * 100);
  const phase = focus ? mapLineToPhase(focus) : null;
  const phaseLabel = phase !== null ? phaseTitle(phase) : '';
  const answer = focus
    ? phase !== null
      ? `Estamos na fase ${phase} de ${DRE_PHASE_COUNT} (${phaseLabel}). O roteiro está com «${focus.line_name}» em evidência neste período. No conjunto da DRE já temos ${filled} de ${total} campos com valor informado (~${pct}%).`
      : `O roteiro está com «${focus.line_name}» em evidência. No conjunto da DRE temos ${filled} de ${total} campos com valor (~${pct}%).`
    : `Sem catálogo de linhas suficiente para medir etapa aqui (${filled}/${total} valores). Abra uma submissão válida ou use “Olá” no painel guiado quando estiver disponível.`;
  const nextPrompt = focus ? buildQuestionForLine(focus) : null;
  return {
    answer,
    focusLineCode: focus?.line_code ?? null,
    nextPrompt,
    drePhase: phase,
  };
}

/** Pergunta «onde estamos» / «qual etapa» — mesma carga útil que `cmd:where_am_i`, para chat em linguagem natural. */
export function runGuidedFlowStatusQuestionTurn(input: {
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  guidedLineCode: string | null;
  skippedLineCodes?: Set<string> | readonly string[];
}): { turn: DreAssistantTurnResult; drePhase: number | null } {
  const w = composeGuidedWhereAmIAnswer(input);
  return {
    turn: {
      answer: w.answer,
      citations: FALLBACK_KNOWLEDGE_SNIPPET,
      fieldUpdates: [],
      focusLineCode: w.focusLineCode,
      nextPrompt: w.nextPrompt,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    },
    drePhase: w.drePhase,
  };
}

export interface DeterministicCommandInput {
  cmd: ParsedAgentMessage & { kind: 'cmd' };
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  currentLineCode: string | null;
  explainOnly: boolean;
  skippedLineCodes: readonly string[];
  proposedValueFromSession: ProposedAssistantValue | null;
  drePhaseFromSession: number | null;
  /** Contexto Humano+/temporal quando `DRE_AGENT_CONTEXT_V2` habilitado. */
  conversationContext?: DreAgentConversationContext | null;
  /** Séries KPI de competências passadas já filtradas (RLS) — comandos determinísticos. */
  deterministicHistoricalSnapshots?: DreHistoricalDreSnapshot[] | null;
}

function citationForLine(line: DreInputCatalogLine): DreAssistantCitation {
  const guide = getFieldGuide(line);
  return {
    title: guide.label,
    source: `${line.section_name} • ${line.line_code}`,
    excerpt: guide.help,
  };
}

function formatMoneyBr(amount: number): string {
  return `R$ ${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Executa comandos `cmd:*` sem LLM. */
export function runDeterministicCommand(input: DeterministicCommandInput): RunDeterministicCommandResult {
  const { cmd, lines, currentValues } = input;
  const skipped = new Set(input.skippedLineCodes);
  const skipOpts = { skippedLineCodes: skipped };

  const focusFromSession =
    input.currentLineCode !== null ? lines.find((line) => line.line_code === input.currentLineCode) ?? null : null;

  switch (cmd.name) {
    case 'start': {
      const focus =
        findNextGuidedLine(lines, currentValues, input.currentLineCode, skipOpts) ?? lines[0] ?? null;
      const phase = focus ? mapLineToPhase(focus) : null;
      return {
        result: {
          answer: explainStartMessage(input.explainOnly, input.conversationContext),
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focus?.line_code ?? null,
          nextPrompt: focus ? buildQuestionForLine(focus) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: {
          dre_phase: phase,
          acceptance_state: 'none',
          proposed_value: null,
        },
      };
    }

    case 'explain_field': {
      const focus =
        focusFromSession ??
        findNextGuidedLine(lines, currentValues, null, skipOpts) ??
        lines[0] ??
        null;
      if (!focus) {
        return emptyPack({
          answer: 'Sem catálogo de linhas neste contexto.',
        });
      }
      const guide = getFieldGuide(focus);
      return {
        result: {
          answer: `${guide.help} ${guide.example} (${focus.section_name} — campo “${guide.label}”.)`,
          citations: [citationForLine(focus)],
          fieldUpdates: [],
          focusLineCode: focus.line_code,
          nextPrompt: input.explainOnly
            ? 'Quer explicação sobre outro campo ou avançar com “cmd:next_field”?'
            : buildQuestionForLine(focus),
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: mapLineToPhase(focus) },
      };
    }

    case 'next_field': {
      const focus =
        findNextGuidedLine(lines, currentValues, input.currentLineCode, skipOpts) ?? lines[0] ?? null;
      if (!focus) {
        return emptyPack({ answer: 'Não há próximo campo vazio neste roteiro.' });
      }
      return {
        result: {
          answer: `Seguimos com “${focus.line_name}” (${focus.section_name}).`,
          citations: [citationForLine(focus)],
          fieldUpdates: [],
          focusLineCode: focus.line_code,
          nextPrompt: input.explainOnly ? null : buildQuestionForLine(focus),
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: mapLineToPhase(focus) },
      };
    }

    case 'prev_field': {
      const anchor = focusFromSession;
      const prev =
        anchor ? findPreviousGuidedLine(lines, anchor.line_code) : lines[Math.max(lines.length - 1, 0)];
      if (!prev) {
        return emptyPack({ answer: 'Já estamos na primeira linha do roteiro.' });
      }
      return {
        result: {
          answer: `Retrocedemos para “${prev.line_name}” (${prev.section_name}).`,
          citations: [citationForLine(prev)],
          fieldUpdates: [],
          focusLineCode: prev.line_code,
          nextPrompt: buildQuestionForLine(prev),
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: mapLineToPhase(prev) },
      };
    }

    case 'skip_field': {
      if (input.explainOnly) {
        return emptyPack({
          answer:
            'No modo orientação não marco saltos na submissão. Peça ao operador para pular pela conversa com perfil de edição ou use apenas “cmd:next_field” para estudar outro campo.',
        });
      }
      const focus =
        focusFromSession ?? findNextGuidedLine(lines, currentValues, null, skipOpts) ?? lines[0] ?? null;
      if (!focus) {
        return emptyPack({ answer: 'Não há campo em foco para pular.' });
      }
      const nextSkipped = Array.from(new Set([...skipped, focus.line_code]));
      const nextLine = findNextGuidedLine(
        lines,
        currentValues,
        focus.line_code,
        { skippedLineCodes: new Set(nextSkipped) },
      );
      return {
        result: {
          answer: `Campo “${focus.line_name}” fica marcado como pulado nesta sessão. ${nextLine ? `Próximo: “${nextLine.line_name}”.` : 'Não há outro campo vazio na ordem — pode usar “Salvar rascunho” no painel.'}`,
          citations: [citationForLine(focus)],
          fieldUpdates: [],
          focusLineCode: nextLine?.line_code ?? null,
          nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: {
          skipped_line_codes: nextSkipped,
          dre_phase: nextLine ? mapLineToPhase(nextLine) : input.drePhaseFromSession,
          proposed_value: null,
          acceptance_state: 'none',
        },
      };
    }

    case 'phase_summary': {
      const rawArg = cmd.args[0]?.trim();
      const defaultPhase = focusFromSession
        ? mapLineToPhase(focusFromSession)
        : lines[0]
          ? mapLineToPhase(lines[0])
          : 1;
      const phaseIdNum = rawArg ? parseInt(rawArg, 10) : Number(input.drePhaseFromSession ?? defaultPhase);
      const phaseId = Number.isFinite(phaseIdNum) ? phaseIdNum : defaultPhase;
      if (!Number.isFinite(phaseId) || phaseId < 1 || phaseId > DRE_PHASE_COUNT) {
        return emptyPack({ answer: `Fase inválida. Informe um número entre 1 e ${DRE_PHASE_COUNT} (cmd:phase_summary <n>).` });
      }
      const inPhase = listLinesInPhase(phaseId, lines);
      if (inPhase.length === 0) {
        return emptyPack({
          answer: `Fase ${phaseId} (${phaseTitle(phaseId)}): não há linhas neste catálogo.`,
        });
      }
      const rows = inPhase.map((line) => {
        const raw = currentValues[line.line_code] ?? '';
        const amt = raw.trim().length === 0 ? '— vazio —' : raw;
        return `• ${line.line_name}: ${amt}`;
      });
      const prog = getPhaseProgress(phaseId, lines, currentValues, skipped);
      return {
        result: {
          answer: `${phaseTitle(phaseId)} — progresso nesta fase: ${prog.filled}/${prog.total}.\n${rows.join('\n')}`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focusFromSession?.line_code ?? inPhase[0]?.line_code ?? null,
          nextPrompt: focusFromSession ? buildQuestionForLine(focusFromSession) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: phaseId },
      };
    }

    case 'list_phase': {
      const rawArg = cmd.args[0]?.trim();
      const basePhase = lines[0] ? mapLineToPhase(lines[0]) : 1;
      const phaseIdNum = rawArg ? parseInt(rawArg, 10) : Number(input.drePhaseFromSession ?? basePhase);
      const phaseId = Number.isFinite(phaseIdNum) ? phaseIdNum : basePhase;
      if (!Number.isFinite(phaseId) || phaseId < 1 || phaseId > DRE_PHASE_COUNT) {
        return emptyPack({ answer: `Fase inválida (${phaseId}).` });
      }
      const inPhase = listLinesInPhase(phaseId, lines);
      const table = inPhase.map((line) => `${line.line_name} (${line.section_name})`).join(' | ');
      return {
        result: {
          answer: `${phaseTitle(phaseId)} — campos ordenados nesta etapa:\n${table}`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focusFromSession?.line_code ?? null,
          nextPrompt: null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: phaseId },
      };
    }

    case 'explain_phase': {
      const rawArg = cmd.args[0]?.trim();
      const defaultPhase = focusFromSession
        ? mapLineToPhase(focusFromSession)
        : lines[0]
          ? mapLineToPhase(lines[0])
          : 1;
      const phaseIdNum = rawArg ? parseInt(rawArg, 10) : Number(input.drePhaseFromSession ?? defaultPhase);
      const phaseId = Number.isFinite(phaseIdNum) ? phaseIdNum : defaultPhase;
      if (!Number.isFinite(phaseId) || phaseId < 1 || phaseId > DRE_PHASE_COUNT) {
        return emptyPack({ answer: `Fase inválida. Informe um número entre 1 e ${DRE_PHASE_COUNT} (cmd:explain_phase <n>).` });
      }
      const pedagogia = PHASE_PEDAGOGY[phaseId] ?? 'Fase alinhada ao roteiro oficial Febracis / IFRS operacional.';
      const inPhase = listLinesInPhase(phaseId, lines);
      const exemplo = inPhase.slice(0, 4).map((l) => l.line_name).join(', ');
      return {
        result: {
          answer: `Fase ${phaseId}: ${phaseTitle(phaseId)} — ${pedagogia} Linhas emblemáticas: ${exemplo || '(ver catálogo)'}. Comandos irmãos: cmd:list_phase ${phaseId} e cmd:phase_summary ${phaseId}.`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focusFromSession?.line_code ?? inPhase[0]?.line_code ?? null,
          nextPrompt: focusFromSession ? buildQuestionForLine(focusFromSession) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: phaseId },
      };
    }

    case 'where_am_i': {
      const w = composeGuidedWhereAmIAnswer({
        lines,
        currentValues,
        guidedLineCode: input.currentLineCode ?? null,
        skippedLineCodes: skipped,
      });
      return {
        result: {
          answer: w.answer,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: w.focusLineCode,
          nextPrompt: w.nextPrompt,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: w.drePhase },
      };
    }

    case 'propose_value': {
      if (input.explainOnly) {
        return emptyPack({
          answer: 'Modo orientação: não aplico valores. Use apenas explicações ou navegação até alguém com permissão de edição propor o número.',
        });
      }
      const lineCode = cmd.args[0]?.trim();
      const amountJoined = cmd.args.slice(1).join(' ').trim();
      if (!lineCode || !amountJoined) {
        return emptyPack({
          answer: 'Uso: cmd:propose_value <line_code> <valor em reais> (ex.: cmd:propose_value gross_revenue 50000).',
        });
      }
      const line = lines.find((row) => row.line_code === lineCode) ?? null;
      if (!line) {
        return emptyPack({
          answer: `Não encontramos a linha “${lineCode}” nesta submissão.`,
        });
      }
      const parsed = parseAssistantCurrencyReply(amountJoined);
      if (parsed === null) {
        return emptyPack({
          answer: 'Não consegui ler o valor. Use só números (ex.: 50000 ou 1.234,56).',
        });
      }
      const nextFocus =
        findNextGuidedLine(
          lines,
          { ...currentValues, [lineCode]: parsed.toLocaleString('pt-BR') },
          lineCode,
          skipOpts,
        ) ?? focusFromSession ?? line;
      return {
        result: {
          answer: `Proposta: ${formatMoneyBr(parsed)} em “${line.line_name}”. Confirme com “cmd:confirm_value”, edite com “cmd:reject_value” ou ajuste pelo teclado numérico.`,
          citations: [citationForLine(line)],
          fieldUpdates: [
            {
              lineCode: line.line_code,
              valueCurrency: parsed,
              label: line.line_name,
            },
          ],
          focusLineCode: nextFocus.line_code,
          nextPrompt: buildQuestionForLine(nextFocus),
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
          requiresFieldConfirmation: true,
        },
        sessionPatch: {
          proposed_value: { line_code: line.line_code, amount: parsed },
          acceptance_state: 'pending',
          dre_phase: mapLineToPhase(line),
        },
      };
    }

    case 'confirm_value': {
      if (input.explainOnly) {
        return emptyPack({ answer: 'Modo orientação: não há valores a confirmar.' });
      }
      const proposal = input.proposedValueFromSession;
      if (!proposal) {
        return emptyPack({
          answer: 'Não há proposta pendente — use primeiro “cmd:propose_value” ou aguarde o assistente propor um valor.',
        });
      }
      const line = lines.find((row) => row.line_code === proposal.line_code) ?? null;
      if (!line) {
        return emptyPack(
          {
            answer: `A proposta refere-se à linha “${proposal.line_code}”, ausente nesta submissão. Use “cmd:reject_value”.`,
          },
          {
            proposed_value: null,
            acceptance_state: 'none',
          },
        );
      }
      const simulated = {
        ...currentValues,
        [proposal.line_code]: proposal.amount.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      };
      const nextLine = findNextGuidedLine(lines, simulated, proposal.line_code, skipOpts);
      return {
        result: {
          answer: `Confirmado ${formatMoneyBr(proposal.amount)} para “${line.line_name}”. ${nextLine ? `Próximo: “${nextLine.line_name}”.` : ''}`,
          citations: [citationForLine(line)],
          fieldUpdates: [
            {
              lineCode: line.line_code,
              valueCurrency: proposal.amount,
              label: line.line_name,
            },
          ],
          focusLineCode: nextLine?.line_code ?? null,
          nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
          requiresFieldConfirmation: false,
        },
        sessionPatch: {
          proposed_value: null,
          acceptance_state: 'accepted',
          dre_phase: nextLine ? mapLineToPhase(nextLine) : mapLineToPhase(line),
        },
      };
    }

    case 'reject_value': {
      const focus =
        focusFromSession ?? findNextGuidedLine(lines, currentValues, null, skipOpts) ?? lines[0] ?? null;
      return {
        result: {
          answer: `Proposta descartada. ${focus ? `Continuamos com “${focus.line_name}” — use Explicar, Inserir valor ou cmd:next_field.` : ''}`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focus?.line_code ?? null,
          nextPrompt: focus ? buildQuestionForLine(focus) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
          requiresFieldConfirmation: false,
        },
        sessionPatch: {
          proposed_value: null,
          acceptance_state: 'none',
        },
      };
    }

    case 'save_draft': {
      return {
        result: {
          answer:
            'Quando você estiver editando esta submissão, use também o botão “Salvar rascunho” no painel à direita — confirmo aqui como lembrete operacional.',
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: input.currentLineCode,
          nextPrompt: null,
          requestSave: !input.explainOnly,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: {},
      };
    }

    case 'compare_with_prev_month': {
      const snaps = [...(input.deterministicHistoricalSnapshots ?? [])].sort((a, b) => {
        const [ay, am] = a.periodYm.split('-').map((x) => Number(x));
        const [by, bm] = b.periodYm.split('-').map((x) => Number(x));
        if (ay !== by) return (by ?? 0) - (ay ?? 0);
        return (bm ?? 0) - (am ?? 0);
      });
      const prev = snaps[0];
      if (!prev || prev.periodYm.length === 0) {
        return emptyPack({
          answer:
            'Não há DRE anterior aprovada da mesma unidade no histórico devolvido agora pelo motor para comparar RBV/MC/EBITDA. Seguimos o rascunho atual.',
        });
      }

      const currentGrossParsed = parseAssistantCurrencyReply(currentValues.gross_revenue ?? '');
      const prevGross = typeof prev.gross_revenue === 'number' ? prev.gross_revenue : null;
      let deltaRb = '';
      if (prevGross !== null && prevGross > 0 && currentGrossParsed !== null && currentGrossParsed > 0) {
        const ratio = Math.round(((currentGrossParsed - prevGross) / prevGross) * 100);
        deltaRb =
          ` RBV atual no rascunho (${formatMoneyBr(currentGrossParsed)}) vs competência anterior ${prev.periodLabelPtBr} (${formatMoneyBr(prevGross)}): delta aproximado ${ratio >= 0 ? '+' : ''}${ratio}% sobre a RBV aprovada do mês anterior.`;
      } else {
        deltaRb = ` Competência anterior aprovada: ${prev.periodLabelPtBr} com RBV ${
          prev.gross_revenue !== null ? formatMoneyBr(prev.gross_revenue) : 'sem KPI no conjunto atual'
        }. Envie RBV atual para eu citar variações numéricas.`;
      }

      let marketingCue = '';
      const prevMk = typeof prev.marketing_total_approx === 'number' ? prev.marketing_total_approx : null;
      if (prevMk !== null) {
        marketingCue += ` Marketing total memorando ${prev.periodLabelPtBr}: ${formatMoneyBr(prevMk)} — use só como contexto oficial interno (nunca como ordem de preenchimento).`;
      }

      const nextGuide =
        focusFromSession ??
        findNextGuidedLine(lines, currentValues, null, skipOpts) ??
        lines[0] ??
        null;

      return {
        result: {
          answer:
            `Comparativo rápido (somente registos aprovados da mesma unidade dentro do escrow RLS atual): ${deltaRb}${marketingCue}`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: nextGuide?.line_code ?? null,
          nextPrompt: nextGuide ? buildQuestionForLine(nextGuide) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: nextGuide ? mapLineToPhase(nextGuide) : undefined },
      };
    }

    case 'summarize_franchise_history': {
      const snaps = [...(input.deterministicHistoricalSnapshots ?? [])].sort((a, b) => {
        const [ay, am] = a.periodYm.split('-').map((x) => Number(x));
        const [by, bm] = b.periodYm.split('-').map((x) => Number(x));
        if (ay !== by) return (by ?? 0) - (ay ?? 0);
        return (bm ?? 0) - (am ?? 0);
      });
      if (snaps.length === 0) {
        return emptyPack({
          answer:
            'Ainda não aparece competência prévia aprovada ao assistente dentro da janela consultada pela função oficial. Voltamos ao preenchimento desta competência.',
        });
      }

      const linesSummary = snaps
        .slice(0, Math.min(snaps.length, 4))
        .map((s) => {
          const rg =
            typeof s.gross_revenue === 'number' ? formatMoneyBr(s.gross_revenue) : 'RBV indisponível no snapshot';
          const e1 =
            typeof s.ebitda_1 === 'number' ? formatMoneyBr(s.ebitda_1) : 'EBITDA 1 não presente nos dados brutos devolvidos';
          return `• ${s.periodLabelPtBr}: RBV ${rg}; EBITDA 1 ${e1}.`;
        })
        .join('\n');

      const nextGuide =
        focusFromSession ?? findNextGuidedLine(lines, currentValues, null, skipOpts) ?? lines[0] ?? null;

      return {
        result: {
          answer: `Resumo dos últimos meses já aprovados desta mesma franquia (não extrapole para mensagens vindas por fora):\n${linesSummary}`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: nextGuide?.line_code ?? null,
          nextPrompt: nextGuide ? buildQuestionForLine(nextGuide) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: { dre_phase: nextGuide ? mapLineToPhase(nextGuide) : undefined },
      };
    }

    case 'set_ideal_state': {
      const mkArg = cmd.args[0]?.replace(',', '.');
      const ebArg = cmd.args[1]?.replace(',', '.');

      const marketingPctRaw = mkArg !== undefined ? Number(mkArg) : Number.NaN;
      const ebitdaPctRaw = ebArg !== undefined ? Number(ebArg) : Number.NaN;

      if (!Number.isFinite(marketingPctRaw) || !Number.isFinite(ebitdaPctRaw)) {
        return emptyPack({
          answer:
            'Uso: cmd:set_ideal_state <pct_marketing_rb> <pct_ebitda_rb>. Exemplo: cmd:set_ideal_state 8 22.',
        });
      }

      if (marketingPctRaw < 0 || marketingPctRaw > 150 || ebitdaPctRaw < 0 || ebitdaPctRaw > 150) {
        return emptyPack({
          answer: 'Percentuais devem ficar dentro de valores plausíveis (0‑150%).',
        });
      }

      const isa = {
        marketing_pct_rbv_target: Number(marketingPctRaw.toFixed(3)),
        ebitda_target_pct_of_gross: Number(ebitdaPctRaw.toFixed(3)),
        updated_via: 'cmd:set_ideal_state',
      };

      const snapsSorted = [...(input.deterministicHistoricalSnapshots ?? [])].sort((a, b) => {
        if (a.periodYm !== b.periodYm) {
          return a.periodYm < b.periodYm ? 1 : -1;
        }
        return 0;
      });

      let comparative = '';
      const recent = snapsSorted[0];
      if (recent && typeof recent.gross_revenue === 'number' && recent.gross_revenue > 0) {
        const mkImp =
          typeof recent.marketing_total_approx === 'number'
            ? (recent.marketing_total_approx / recent.gross_revenue) * 100
            : null;
        const ebImp =
          typeof recent.ebitda_1 === 'number'
            ? (recent.ebitda_1 / recent.gross_revenue) * 100
            : null;
        comparative = `\n\nReferência apenas para calibrar expectativas (${recent.periodLabelPtBr}, submissão aprovada já consolidada pelo motor oficial): sobre a RBV do snapshot, marketing somou cerca de ${
          mkImp !== null && Number.isFinite(mkImp)
            ? `${mkImp.toFixed(1)}%`
            : '—'
        } do bruto; EBITDA 1 representou ~${
          ebImp !== null && Number.isFinite(ebImp)
            ? `${ebImp.toFixed(1)}%`
            : '—'
        } sobre a mesma base. São números do passado já auditados — seus alvos DRE‑ISA ficam apenas como norte editorial até alinhar oficialmente à controladoria.\n`;
      }

      return {
        result: {
          answer:
            `DRE‑ISA anotado: marketing alvo sobre RBV ≈ ${isa.marketing_pct_rbv_target}%; EBITDA alvo sobre RBV ≈ ${isa.ebitda_target_pct_of_gross}% — trato isto apenas como norte editorial interno até alinhar oficialmente à controladora.${comparative}`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focusFromSession?.line_code ?? null,
          nextPrompt:
            focusFromSession ? buildQuestionForLine(focusFromSession) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
          isaPayload: isa,
        },
        sessionPatch: { dre_phase: focusFromSession ? mapLineToPhase(focusFromSession) : undefined },
      };
    }

    case 'turn_feedback': {
      const mood = cmd.args[0]?.trim()?.toLowerCase();
      const reason = cmd.args.slice(1).join(' ').trim();
      if (!mood || (mood !== 'positivo' && mood !== 'negativo')) {
        return emptyPack({
          answer: 'Informe humor + texto opcional. Exemplo: cmd:turn_feedback positivo útil OU cmd:turn_feedback negativo faltou comparação M-1.',
        });
      }

      const detail = reason?.length ? ` Motivo relatado (curto): ${reason.slice(0, 240)}` : '';

      return {
        result: {
          answer: `Obrigado pelo feedback (${mood}) — apenas para curadoria interna.${detail}`,
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focusFromSession?.line_code ?? null,
          nextPrompt:
            focusFromSession ? buildQuestionForLine(focusFromSession) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
          feedbackTelemetry: {
            mood: mood as 'positivo' | 'negativo',
            reason: reason?.slice(0, 240) || undefined,
          },
        },
        sessionPatch: {},
      };
    }

    case 'restart': {
      const focus =
        findNextGuidedLine(lines, currentValues, null, {
          skippedLineCodes: new Set(),
        }) ?? lines[0] ?? null;
      return {
        result: {
          answer:
            'Fluxo guiado reiniciado: limpei saltos apenas na memória da sessão; os valores na planilha permanecem exatamente como estavam. Seguimos a partir da próxima linha recomendada.',
          citations: FALLBACK_KNOWLEDGE_SNIPPET,
          fieldUpdates: [],
          focusLineCode: focus?.line_code ?? null,
          nextPrompt: focus ? buildQuestionForLine(focus) : null,
          requestSave: false,
          requestSubmit: false,
          mode: 'fallback',
        },
        sessionPatch: {
          skipped_line_codes: [],
          proposed_value: null,
          acceptance_state: 'none',
          dre_phase: focus ? mapLineToPhase(focus) : null,
        },
      };
    }

    default: {
      return emptyPack({
        answer: `Comando “${cmd.name}” não implementado nesta versão local.`,
      });
    }
  }
}

function localityHintPt(ctx?: DreAgentConversationContext | null): string {
  if (!ctx) {
    return '';
  }
  const bits: string[] = [];
  if (ctx.city) {
    bits.push(ctx.city);
  }
  if (ctx.regionalName) {
    bits.push(`regional ${ctx.regionalName}`);
  }
  return bits.length > 0 ? ` · ${bits.join(' · ')}` : '';
}

export function explainStartMessage(
  explainOnly: boolean,
  ctx?: DreAgentConversationContext | null,
): string {
  const greetingName = ctx?.userFirstName ? `Olá, ${ctx.userFirstName}!` : 'Olá!';
  const franchise = ctx?.franchiseTradeName ? `"${ctx.franchiseTradeName}"` : 'esta unidade Febracis';
  const when = ctx?.periodLabelPtBr ? ` (${ctx.periodLabelPtBr})` : '';
  const scope = localityHintPt(ctx);

  if (explainOnly) {
    return `${greetingName} Modo orientação sobre a DRE de ${franchise}${when}${scope}: explico campos segundo Lei das S.A., NBC TG 26 e o glossário institucional, sem mexer valores. Status da submissão agora (operacional interno): ${submissionStatusLabelPt(ctx?.submissionStatus)}. Para editar, quem pode operar valores é o perfil com permissões ativas nesta mesma sessão oficial.`;
  }

  return `${greetingName} Aqui é o assistente Febracis guiando seu rascunho da DRE para ${franchise}${when}${scope}. Eu peço sempre um campo por vez, em reais; o sistema recalcula MC1, MC2 e EBITDA após as confirmações oficiais. Status da sua submissão neste servidor: ${submissionStatusLabelPt(ctx?.submissionStatus)}.`;
}

/** Lista ordenada (planilha / catálogo) para o prompt do modelo — sem expor line_code ao utilizador final. */
export function buildOrderedFieldFlowForPrompt(lines: DreInputCatalogLine[]) {
  return lines
    .map((line, index) => {
      const guide = getFieldGuide(line);
      return `${index + 1}. ${line.section_name} — ${line.line_name}. Pergunta-alvo: ${guide.question}`;
    })
    .join('\n');
}

function isGreetingOrStartFlow(normalizedMessage: string) {
  if (normalizedMessage.length > 120) {
    return false;
  }

  if (/^(ola|oi|bom dia|boa tarde|boa noite)\b/.test(normalizedMessage)) {
    return true;
  }

  if (normalizedMessage.includes('comecar preenchimento')) {
    return true;
  }

  if (normalizedMessage.includes('comecar') && normalizedMessage.includes('dre')) {
    return true;
  }

  if (normalizedMessage.includes('vamos comecar') || normalizedMessage.includes('quero comecar')) {
    return true;
  }

  return false;
}

/** Limite de mensagens recentes enviadas ao modelo (histórico no prompt). */
export const AGENT_MESSAGE_HISTORY_LIMIT = 32;

/**
 * Mensagens curtas de continuidade no fluxo guiado (evita disparar o guarda de “fora do tema”).
 */
export function isGuidedFlowContinuationMessage(rawMessage: string): boolean {
  const n = normalizeText(rawMessage);
  if (n.length > 72) {
    return false;
  }

  const trimmed = n.replace(/[?!.]+$/u, '').trim();

  if (/^(ok|sim|blz|beleza|bora|dale|vamos|uhum|aham)\s*$/u.test(trimmed)) {
    return true;
  }
  if (/^(ok|sim)\s+(vamos|bora)\s*$/u.test(trimmed)) {
    return true;
  }

  const phrases = [
    'vamos continuar',
    'vamos seguir',
    'podemos continuar',
    'pode continuar',
    'seguimos',
    'sigamos',
    'proximo passo',
    'próximo passo',
    'proximos passos',
    'next step',
    'lets go',
    'seguir em frente',
    'em frente',
    'avancar',
    'avançar',
    'prosseguir',
    'vamos la',
    'vamos lá',
    'manda ver',
    'pode seguir',
    'continua ai',
    'continua aí',
    'seguimos assim',
    'seguir assim',
  ];

  if (phrases.some((phrase) => n.includes(phrase))) {
    return true;
  }

  if (/^continuar\s*[?!.]?$/u.test(n) || n === 'continuar') {
    return true;
  }

  return false;
}

/**
 * Perguntas explícitas pelo contexto do roteiro (equivale a `cmd:where_am_i` em linguagem natural).
 * Atualizar com cuidado para não colidir com perguntas sobre "fase" macroeconómica/outros domínios.
 */
export function isGuidedFlowStatusQuestionMessage(rawMessage: string): boolean {
  const n = normalizeText(rawMessage);
  if (n.length > 220) {
    return false;
  }

  if (/\bem\s+qual\s+etapa\b/.test(n)) {
    return true;
  }
  if (/\bqual\s+etapa\b/u.test(n) && /\bestamos\b/u.test(n)) {
    return true;
  }
  if (/\bqual\s+fase\b/u.test(n) && /\bestamos\b/u.test(n)) {
    return true;
  }
  if (/\bem\s+que\s+(etapa|fase|parte|ponto)\b/u.test(n)) {
    return true;
  }
  if (/\bonde\s+(estamos|paramos)\b/u.test(n)) {
    return true;
  }
  if (/\bqual\s+e\s+(o\s+)?passo\b/u.test(n) || /\bqual\s+passo\b/u.test(n)) {
    return true;
  }
  if (/\bpasso\s+atual\b/u.test(n)) {
    return true;
  }
  if (/\bo\s+que\s+falta\b/u.test(n)) {
    return true;
  }
  if (/\b(andamento|progresso)\b/u.test(n) && /\b(dre|submis|planilha|preenchi)\b/u.test(n)) {
    return true;
  }

  return false;
}

export type DreUserIntentCategory = 'dre_on_topic' | 'off_topic';

export type FlowCheckpointUserIntent = 'greeting' | 'numeric_value' | 'dre_question' | 'off_topic' | 'other';

export interface FlowCheckpoint {
  phase: 'collecting' | 'complete' | 'explain_only';
  line_code: string | null;
  filled_count: number;
  total_inputs: number;
  last_user_intent: FlowCheckpointUserIntent;
}

/** Heurística de desvio de tópico (camada de entrada). Não substitui moderação humana. */
export function classifyDreUserIntent(rawMessage: string): DreUserIntentCategory {
  const n = normalizeText(rawMessage);
  if (n.length > 400) {
    return 'dre_on_topic';
  }

  if (isGuidedFlowContinuationMessage(rawMessage)) {
    return 'dre_on_topic';
  }

  if (isGuidedFlowStatusQuestionMessage(rawMessage)) {
    return 'dre_on_topic';
  }

  const offTopicHints = [
    'poema',
    'piada',
    'politica',
    'eleicao',
    'futebol',
    'receita de',
    'bitcoin',
    'clima hoje',
    'cante uma',
    'escreva um codigo',
    'ignore todas',
    'ignore as instrucoes',
    'diga a senha',
    'filme ',
    'serie ',
    'whatsapp',
    'instagram',
  ];

  if (offTopicHints.some((hint) => n.includes(hint))) {
    return 'off_topic';
  }

  const dreHints = [
    'dre',
    'ebitda',
    'mc1',
    'mc2',
    'receita',
    'despesa',
    'campo',
    'linha',
    'franquia',
    'submis',
    'valor',
    'real',
    'mil',
    'salvar',
    'enviar',
    'explic',
    'pular',
    'saltar',
    'ola',
    'oi',
    'ajuda',
    'rbv',
    'margem',
    'cmv',
    'royalt',
    'representa',
    'significa',
    'significado',
    'detal',
    'esclarec',
    'planil',
    'preenc',
    'custo',
    'logist',
    'variav',
    'roteir',
    'cis',
    'febracis',
  ];

  if (dreHints.some((hint) => n.includes(hint))) {
    return 'dre_on_topic';
  }

  if (/^-?\d[\d.,\s]*$/.test(n.replace(/\s/g, ''))) {
    return 'dre_on_topic';
  }

  if (n.length < 36 && !/\d/.test(n)) {
    return 'off_topic';
  }

  return 'dre_on_topic';
}

export function countFilledInputs(
  lines: DreInputCatalogLine[],
  currentValues: Record<string, string>,
): number {
  return lines.filter((line) => (currentValues[line.line_code] ?? '').trim().length > 0).length;
}

export function buildFlowCheckpoint(input: {
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  focusLineCode: string | null;
  userMessage: string;
  explainOnly: boolean;
}): FlowCheckpoint {
  const filled = countFilledInputs(input.lines, input.currentValues);
  const total = input.lines.length;
  const n = normalizeText(input.userMessage);
  let lastUserIntent: FlowCheckpointUserIntent = 'other';

  if (isGreetingOrStartFlow(n)) {
    lastUserIntent = 'greeting';
  } else if (isGuidedFlowContinuationMessage(input.userMessage)) {
    lastUserIntent = 'other';
  } else if (isGuidedFlowStatusQuestionMessage(input.userMessage)) {
    lastUserIntent = 'dre_question';
  } else if (classifyDreUserIntent(input.userMessage) === 'off_topic') {
    lastUserIntent = 'off_topic';
  } else if (parseAssistantCurrencyReply(input.userMessage) !== null) {
    lastUserIntent = 'numeric_value';
  } else if (
    n.includes('explic') ||
    n.includes('o que e') ||
    n.includes('para que') ||
    n.includes('duvida')
  ) {
    lastUserIntent = 'dre_question';
  }

  const phase = input.explainOnly
    ? 'explain_only'
    : filled >= total && total > 0
      ? 'complete'
      : 'collecting';

  return {
    phase,
    line_code: input.focusLineCode,
    filled_count: filled,
    total_inputs: total,
    last_user_intent: lastUserIntent,
  };
}

const FLOW_CHECKPOINT_PHASES: FlowCheckpoint['phase'][] = ['collecting', 'complete', 'explain_only'];
const FLOW_CHECKPOINT_INTENTS: FlowCheckpointUserIntent[] = [
  'greeting',
  'numeric_value',
  'dre_question',
  'off_topic',
  'other',
];

/** Lê `flow_checkpoint` persistido em `state_json` da sessão do agente (validação defensiva). */
export function parseFlowCheckpointFromState(state: unknown): FlowCheckpoint | null {
  if (!state || typeof state !== 'object') {
    return null;
  }
  const raw = (state as Record<string, unknown>).flow_checkpoint;
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const phase = o.phase;
  const lastUserIntent = o.last_user_intent;
  if (typeof phase !== 'string' || !FLOW_CHECKPOINT_PHASES.includes(phase as FlowCheckpoint['phase'])) {
    return null;
  }
  if (
    typeof lastUserIntent !== 'string' ||
    !FLOW_CHECKPOINT_INTENTS.includes(lastUserIntent as FlowCheckpointUserIntent)
  ) {
    return null;
  }
  const lineCode: string | null =
    o.line_code === null ? null : typeof o.line_code === 'string' ? o.line_code : null;
  const filledCount = typeof o.filled_count === 'number' && Number.isFinite(o.filled_count) ? o.filled_count : 0;
  const totalInputs = typeof o.total_inputs === 'number' && Number.isFinite(o.total_inputs) ? o.total_inputs : 0;

  return {
    phase: phase as FlowCheckpoint['phase'],
    line_code: lineCode,
    filled_count: filledCount,
    total_inputs: totalInputs,
    last_user_intent: lastUserIntent as FlowCheckpointUserIntent,
  };
}

export function parseProposedAssistantValueFromState(state: unknown): ProposedAssistantValue | null {
  if (!state || typeof state !== 'object') {
    return null;
  }
  const raw = (state as Record<string, unknown>).proposed_value;
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const payload = raw as Record<string, unknown>;
  const lineCode = payload.line_code;
  const amount = payload.amount;
  if (typeof lineCode !== 'string' || typeof amount !== 'number' || !Number.isFinite(amount)) {
    return null;
  }
  return { line_code: lineCode, amount };
}

export function parseSkippedLineCodesFromState(state: unknown): string[] {
  if (!state || typeof state !== 'object') {
    return [];
  }
  const raw = (state as Record<string, unknown>).skipped_line_codes;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((code): code is string => typeof code === 'string');
}

export function parseDrePhaseFromState(state: unknown): number | null {
  if (!state || typeof state !== 'object') {
    return null;
  }
  const value = (state as Record<string, unknown>).dre_phase;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  if (value < 1 || value > DRE_PHASE_COUNT) {
    return null;
  }
  return value;
}

export function parseAssistantAcceptanceStateFromState(state: unknown): AssistantAcceptanceState {
  if (!state || typeof state !== 'object') {
    return 'none';
  }
  const value = (state as Record<string, unknown>).acceptance_state;
  if (value === 'pending' || value === 'accepted' || value === 'none') {
    return value;
  }
  return 'none';
}

export function validateAssistantFieldUpdates(
  updates: DreAssistantFieldUpdate[],
  knownLineCodes: Set<string>,
): DreAssistantFieldUpdate[] {
  return updates.filter((u) => {
    if (!knownLineCodes.has(u.lineCode)) {
      return false;
    }
    if (!Number.isFinite(u.valueCurrency)) {
      return false;
    }
    if (Math.abs(u.valueCurrency) > 1e16) {
      return false;
    }
    return true;
  });
}

/**
 * Remove afirmações com valores numéricos para MC/EBITDA na resposta (o motor oficial calcula).
 */
export function stripCalculatedMetricClaimsFromAnswer(answer: string): string {
  const blocks = answer.split(/\n\n+/);
  const metricStart = /^\s*(MC1|MC2|EBITDA\s*1|EBITDA\s*2|EBITDA)\b/i;
  const hasMoney = /R\$\s*[\d.\s]+|[\d]{1,3}(\.[\d]{3})+(,\d{2})?\b|\d+,\d{2}\b/;

  const kept = blocks.filter((block) => {
    const lines = block.split('\n');
    return !lines.some((line) => metricStart.test(line) && hasMoney.test(line));
  });

  let out = kept.join('\n\n').trim();
  if (out.length < 24 && answer.trim().length > 24) {
    out = `${answer.split('\n')[0]}\n\nOs totais MC1, MC2 e EBITDA são sempre recalculados pelo sistema no painel lateral — aqui não exibimos números calculados.`;
  }
  return out.length > 0 ? out : answer;
}

export function buildConversationSummaryFromMessages(
  messages: Array<{ role: string; content: string }>,
): string | null {
  const assistantBodies = messages
    .filter((m) => m.role === 'assistant')
    .slice(-3)
    .map((m) => m.content.replace(/\s+/g, ' ').trim().slice(0, 180));

  if (assistantBodies.length === 0) {
    return null;
  }

  return `Resumo do que o assistente disse recentemente: ${assistantBodies.join(' | ')}`;
}

/** Mensagens que podem ser respondidas só com a lógica local (sem LLM) — ex.: saudação, off-topic curto. */
export function shouldUseDeterministicAssistantTurn(message: string): boolean {
  const trimmed = message.trim();
  const n = normalizeText(trimmed);
  if (isGreetingOrStartFlow(n)) {
    return true;
  }
  if (isGuidedFlowContinuationMessage(trimmed)) {
    return true;
  }
  if (isGuidedFlowStatusQuestionMessage(trimmed)) {
    return true;
  }
  if (classifyDreUserIntent(trimmed) === 'off_topic') {
    return true;
  }
  return false;
}

function runLocalAssistantTurnExplainOnly(input: {
  message: string;
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  currentLineCode?: string | null;
  skippedLineCodes?: Set<string> | readonly string[];
}): DreAssistantTurnResult {
  const normalizedMessage = normalizeText(input.message);
  const focusLine = input.currentLineCode
    ? input.lines.find((line) => line.line_code === input.currentLineCode) ?? null
    : null;
  const nextLine =
    findNextGuidedLine(input.lines, input.currentValues, input.currentLineCode ?? undefined) ??
    input.lines[0] ??
    null;

  if (isGreetingOrStartFlow(normalizedMessage)) {
    const seed = buildFallbackCopySeed(input.message, 'explain_greeting', input.currentLineCode);
    return {
      answer: pickFallbackCopy('explain_greeting', seed, {}),
      citations: STATIC_KNOWLEDGE.slice(0, 2),
      fieldUpdates: [],
      focusLineCode: nextLine?.line_code ?? null,
      nextPrompt: nextLine
        ? `Quer que eu explique o campo “${nextLine.line_name}” ou outro da lista?`
        : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  /** Antes de “vamos continuar”: mensagens que também perguntam etapa/paragem devem usar o bloco completo tipo `where_am_i`. */
  if (isGuidedFlowStatusQuestionMessage(input.message)) {
    const { turn } = runGuidedFlowStatusQuestionTurn({
      lines: input.lines,
      currentValues: input.currentValues,
      guidedLineCode: input.currentLineCode ?? null,
      skippedLineCodes: input.skippedLineCodes,
    });
    return turn;
  }

  if (isGuidedFlowContinuationMessage(input.message)) {
    const helpLine = focusLine ?? nextLine;
    const contSeed = buildFallbackCopySeed(input.message, 'explain_continue_guided', helpLine?.line_code ?? null);
    const anchorKey: DreAssistantFallbackCopyIntent = helpLine
      ? 'explain_continue_anchor_focus'
      : 'explain_continue_anchor_loose';
    const anchorText = pickFallbackCopy(
      anchorKey,
      `${contSeed}|explain_continue_anchor`,
      helpLine ? { field: helpLine.line_name } : {},
    );
    const ackHead = pickFallbackCopy('explain_continue_guided', `${contSeed}|explain_continue_guided_wrap`, {
      anchor: anchorText,
    });
    /** Com campo em vista, não fica só no “combinado”: entrega já o texto do catálogo (evita prometer explicação e não cumprir). */
    if (helpLine) {
      const guide = getFieldGuide(helpLine);
      const tailSeed = buildFallbackCopySeed(input.message, 'explain_field_tail', helpLine.line_code);
      const tail = pickFallbackCopy('explain_field_tail', tailSeed, {});
      return {
        answer: `${ackHead}\n\n${guide.help} ${guide.example}\n\n${tail}`,
        citations: [
          {
            title: guide.label,
            source: `${helpLine.section_name} • ${helpLine.line_code}`,
            excerpt: guide.help,
          },
        ],
        fieldUpdates: [],
        focusLineCode: helpLine.line_code,
        nextPrompt: `Quer aprofundar outro campo da DRE?`,
        requestSave: false,
        requestSubmit: false,
        mode: 'fallback',
      };
    }

    return {
      answer: ackHead,
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: null,
      nextPrompt: null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (normalizedMessage.includes('salvar') || normalizedMessage.includes('enviar')) {
    const seed = buildFallbackCopySeed(input.message, 'explain_save_readonly', input.currentLineCode);
    return {
      answer: pickFallbackCopy('explain_save_readonly', seed, {}),
      citations: STATIC_KNOWLEDGE.slice(1, 2),
      fieldUpdates: [],
      focusLineCode: focusLine?.line_code ?? null,
      nextPrompt: null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (normalizedMessage.includes('pular') || normalizedMessage.includes('saltar')) {
    const seed = buildFallbackCopySeed(input.message, 'explain_skip_readonly', input.currentLineCode);
    return {
      answer: pickFallbackCopy('explain_skip_readonly', seed, {}),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: focusLine?.line_code ?? null,
      nextPrompt: focusLine ? `Quer explicação sobre “${focusLine.line_name}”?` : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  const mentionedLine = findLineByPrompt(input.lines, input.message);
  const fieldQuestionLike =
    normalizedMessage.includes('serve') ||
    normalizedMessage.includes('o que e') ||
    normalizedMessage.includes('representa') ||
    normalizedMessage.includes('significa') ||
    normalizedMessage.includes('significado') ||
    normalizedMessage.includes('para que') ||
    normalizedMessage.includes('duvida') ||
    normalizedMessage.includes('explicar') ||
    normalizedMessage.includes('detal') ||
    normalizedMessage.includes('esclarec') ||
    Boolean(mentionedLine);

  if (fieldQuestionLike) {
    const helpLine = mentionedLine ?? focusLine ?? nextLine;
    if (helpLine) {
      const guide = getFieldGuide(helpLine);
      const tailSeed = buildFallbackCopySeed(input.message, 'explain_field_tail', helpLine.line_code);
      const tail = pickFallbackCopy('explain_field_tail', tailSeed, {});
      return {
        answer: `${guide.help} ${guide.example} ${tail}`,
        citations: [
          {
            title: guide.label,
            source: `${helpLine.section_name} • ${helpLine.line_code}`,
            excerpt: guide.help,
          },
        ],
        fieldUpdates: [],
        focusLineCode: helpLine.line_code,
        nextPrompt: `Quer detalhes sobre outro campo da DRE?`,
        requestSave: false,
        requestSubmit: false,
        mode: 'fallback',
      };
    }
  }

  if (classifyDreUserIntent(input.message) === 'off_topic') {
    const anchor = focusLine ?? nextLine;
    /** Com linha guiada definida: resposta primeiro com conteúdo real do campo (templates “Quer que eu detalhe?” sozinhos viram looping). */
    if (anchor) {
      const guide = getFieldGuide(anchor);
      const tailSeed = buildFallbackCopySeed(input.message, 'explain_field_tail', anchor.line_code);
      const tail = pickFallbackCopy('explain_field_tail', tailSeed, {});
      const seedShort = buildFallbackCopySeed(input.message, 'explain_off_topic_hint_after_substance', anchor.line_code);
      const bridge = pickFallbackCopy('explain_off_topic_hint_after_substance', seedShort, {
        field: anchor.line_name,
      });
      return {
        answer: `${guide.help} ${guide.example}\n\n${bridge}\n\n${tail}`,
        citations: [
          {
            title: guide.label,
            source: `${anchor.section_name} • ${anchor.line_code}`,
            excerpt: guide.help,
          },
        ],
        fieldUpdates: [],
        focusLineCode: anchor.line_code,
        nextPrompt: `Quer aprofundar outro campo da DRE?`,
        requestSave: false,
        requestSubmit: false,
        mode: 'fallback',
      };
    }

    const seed = buildFallbackCopySeed(input.message, 'explain_off_topic', null);
    const realignKey: DreAssistantFallbackCopyIntent = 'explain_off_topic_realign_loose';
    const realign = pickFallbackCopy(realignKey, `${seed}|explain_off_topic_realign`, {});
    return {
      answer: pickFallbackCopy('explain_off_topic', `${seed}|explain_off_topic_body`, { realign }),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: null,
      nextPrompt: null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (parseAssistantCurrencyReply(input.message) !== null) {
    const seed = buildFallbackCopySeed(input.message, 'explain_currency_readonly', input.currentLineCode);
    return {
      answer: pickFallbackCopy('explain_currency_readonly', seed, {}),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: focusLine?.line_code ?? nextLine?.line_code ?? null,
      nextPrompt: focusLine ? `Quer explicação sobre “${focusLine.line_name}”?` : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  const fbSeed = buildFallbackCopySeed(input.message, 'explain_fallback', input.currentLineCode);
  return {
    answer: pickFallbackCopy('explain_fallback', fbSeed, { hint: ASSISTANT_REPLY_FORMAT_HINT }),
    citations: STATIC_KNOWLEDGE.slice(0, 2),
    fieldUpdates: [],
    focusLineCode: nextLine?.line_code ?? null,
    nextPrompt: nextLine ? `Quer explicação sobre “${nextLine.line_name}”?` : null,
    requestSave: false,
    requestSubmit: false,
    mode: 'fallback',
  };
}

export function runLocalAssistantTurn(input: {
  message: string;
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  currentLineCode?: string | null;
  /** Linhas saltadas pelo roteiro (paridade com comando `skip_field` persistido na sessão). */
  skippedLineCodes?: Set<string> | readonly string[];
  /** Só explicação: sem fieldUpdates nem pedidos de gravação. */
  explainOnly?: boolean;
  /** Contexto humano/temporal (Feature flag servidor). */
  conversationContext?: DreAgentConversationContext | null;
}): DreAssistantTurnResult {
  if (input.explainOnly) {
    if (!input.lines.length) {
      const needSeed = buildFallbackCopySeed(normalizeText(input.message), 'explain_need_submission', '');
      return {
        answer: pickFallbackCopy('explain_need_submission', needSeed, {}),
        citations: STATIC_KNOWLEDGE.slice(0, 1),
        fieldUpdates: [],
        focusLineCode: null,
        nextPrompt: null,
        requestSave: false,
        requestSubmit: false,
        mode: 'fallback',
      };
    }
    return runLocalAssistantTurnExplainOnly(input);
  }

  const normalizedMessage = normalizeText(input.message);
  const focusLine = input.currentLineCode
    ? input.lines.find((line) => line.line_code === input.currentLineCode) ?? null
    : null;

  if (!input.lines.length) {
    const needSeed = buildFallbackCopySeed(normalizeText(input.message), 'full_need_submission', '');
    return {
      answer: pickFallbackCopy('full_need_submission', needSeed, {}),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: null,
      nextPrompt: null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (isGreetingOrStartFlow(normalizedMessage)) {
    const nextLine =
      findNextGuidedLine(input.lines, input.currentValues, input.currentLineCode ?? undefined) ??
      input.lines[0] ??
      null;

    const ctx = input.conversationContext ?? null;
    const identity = 'Sou o agente de apoio à DRE da Febracis. ';
    const greetSeed = buildFallbackCopySeed(input.message, 'full_greeting', input.currentLineCode);
    const intro = ctx?.franchiseTradeName
      ? pickFallbackCopy('full_greeting_with_franchise', greetSeed, {
          identity,
          period: ctx.periodLabelPtBr ? ` de ${ctx.periodLabelPtBr}` : '',
          city: ctx.city ? ` em ${ctx.city}` : '',
          trade: ctx.franchiseTradeName,
        })
      : pickFallbackCopy('full_greeting_generic', greetSeed, { identity });

    return {
      answer: intro,
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: nextLine?.line_code ?? null,
      nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (isGuidedFlowStatusQuestionMessage(input.message)) {
    const { turn } = runGuidedFlowStatusQuestionTurn({
      lines: input.lines,
      currentValues: input.currentValues,
      guidedLineCode: input.currentLineCode ?? null,
      skippedLineCodes: input.skippedLineCodes,
    });
    return turn;
  }

  if (isGuidedFlowContinuationMessage(input.message)) {
    const anchor =
      focusLine ??
      findNextGuidedLine(input.lines, input.currentValues, input.currentLineCode ?? undefined) ??
      input.lines[0] ??
      null;
    const contSeed = buildFallbackCopySeed(input.message, 'full_continue_guided', anchor?.line_code ?? null);
    const anchorText = anchor
      ? buildQuestionForLine(anchor)
      : 'Envie o próximo valor em reais ou diga qual campo quer tratar.';
    return {
      answer: pickFallbackCopy('full_continue_guided', contSeed, { anchor: anchorText }),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: anchor?.line_code ?? null,
      nextPrompt: anchor ? buildQuestionForLine(anchor) : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (normalizedMessage.includes('salvar')) {
    const saveSeed = buildFallbackCopySeed(normalizedMessage, 'full_save_panel', focusLine?.line_code ?? null);
    return {
      answer: pickFallbackCopy('full_save_panel_hint', saveSeed, {}),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: focusLine?.line_code ?? null,
      nextPrompt: null,
      requestSave: true,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (normalizedMessage.includes('enviar')) {
    const submitSeed = buildFallbackCopySeed(normalizedMessage, 'full_submit_panel', focusLine?.line_code ?? null);
    return {
      answer: pickFallbackCopy('full_submit_panel_hint', submitSeed, {}),
      citations: STATIC_KNOWLEDGE.slice(1, 2),
      fieldUpdates: [],
      focusLineCode: focusLine?.line_code ?? null,
      nextPrompt: null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (normalizedMessage.includes('pular') || normalizedMessage.includes('saltar')) {
    const anchor = focusLine ?? findNextGuidedLine(input.lines, input.currentValues);
    if (!anchor) {
      const skipNeedSeed = buildFallbackCopySeed(normalizedMessage, 'full_skip_need_focus', null);
      return {
        answer: pickFallbackCopy('full_skip_need_focus', skipNeedSeed, {}),
        citations: STATIC_KNOWLEDGE.slice(0, 1),
        fieldUpdates: [],
        focusLineCode: null,
        nextPrompt: null,
        requestSave: false,
        requestSubmit: false,
        mode: 'fallback',
      };
    }

    const nextLine = findNextGuidedLine(input.lines, input.currentValues, anchor.line_code);
    const skipBlankSeed = buildFallbackCopySeed(normalizedMessage, 'full_skip_leave_blank', anchor.line_code);

    return {
      answer: pickFallbackCopy('full_skip_leave_blank', skipBlankSeed, { field: anchor.line_name }),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: nextLine?.line_code ?? null,
      nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  const mentionedLine = findLineByPrompt(input.lines, input.message);

  if (
    normalizedMessage.includes('serve') ||
    normalizedMessage.includes('o que e') ||
    normalizedMessage.includes('representa') ||
    normalizedMessage.includes('significa') ||
    normalizedMessage.includes('significado') ||
    normalizedMessage.includes('para que') ||
    normalizedMessage.includes('duvida') ||
    normalizedMessage.includes('explicar') ||
    normalizedMessage.includes('detal') ||
    normalizedMessage.includes('esclarec') ||
    mentionedLine
  ) {
    const helpLine = mentionedLine ?? focusLine ?? findNextGuidedLine(input.lines, input.currentValues);

    if (helpLine) {
      const guide = getFieldGuide(helpLine);
      const suffixSeed = buildFallbackCopySeed(input.message, 'full_field_answer_suffix', helpLine.line_code);
      const suffix = pickFallbackCopy('full_field_answer_suffix', suffixSeed, {
        hint: ASSISTANT_REPLY_FORMAT_HINT,
      });
      return {
        answer: `${guide.help} ${guide.example} ${suffix}`,
        citations: [
          {
            title: guide.label,
            source: `${helpLine.section_name} • ${helpLine.line_code}`,
            excerpt: guide.help,
          },
        ],
        fieldUpdates: [],
        focusLineCode: helpLine.line_code,
        nextPrompt: buildQuestionForLine(helpLine),
        requestSave: false,
        requestSubmit: false,
        mode: 'fallback',
      };
    }
  }

  if (classifyDreUserIntent(input.message) === 'off_topic') {
    const anchor = focusLine ?? findNextGuidedLine(input.lines, input.currentValues, input.currentLineCode ?? undefined);
    const otSeed = buildFallbackCopySeed(input.message, 'full_off_topic', anchor?.line_code ?? null);
    const anchorText = anchor
      ? `Seguimos com «${anchor.line_name}»: ${buildQuestionForLine(anchor)}`
      : 'Envie o próximo valor em reais ou peça «Explicar campo».';
    return {
      answer: pickFallbackCopy('full_off_topic', otSeed, { anchor: anchorText }),
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: anchor?.line_code ?? null,
      nextPrompt: anchor ? buildQuestionForLine(anchor) : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  const parsedValue = parseAssistantCurrencyReply(input.message);
  const valueTargetLine = focusLine ?? (parsedValue !== null ? findNextGuidedLine(input.lines, input.currentValues) : null);

  if (parsedValue !== null && valueTargetLine) {
    const nextLine = findNextGuidedLine(input.lines, {
      ...input.currentValues,
      [valueTargetLine.line_code]: String(parsedValue),
    }, valueTargetLine.line_code);

    const proposalSeed = buildFallbackCopySeed(input.message, 'full_numeric_proposal', valueTargetLine.line_code);

    return {
      answer: pickFallbackCopy('full_numeric_proposal', proposalSeed, {
        amount: formatMoneyBr(parsedValue),
        field: valueTargetLine.line_name,
      }),
      citations: [
        {
          title: valueTargetLine.line_name,
          source: `${valueTargetLine.section_name} • ${valueTargetLine.line_code}`,
          excerpt: getFieldGuide(valueTargetLine).help,
        },
      ],
      fieldUpdates: [
        {
          lineCode: valueTargetLine.line_code,
          valueCurrency: parsedValue,
          label: valueTargetLine.line_name,
        },
      ],
      focusLineCode: nextLine?.line_code ?? null,
      nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
      requiresFieldConfirmation: true,
    };
  }

  const nextLine = findNextGuidedLine(input.lines, input.currentValues, focusLine?.line_code);
  const defSeed = buildFallbackCopySeed(input.message, 'full_default_guided', focusLine?.line_code ?? null);

  return {
    answer: pickFallbackCopy('full_default_guided', defSeed, { hint: ASSISTANT_REPLY_FORMAT_HINT }),
    citations: STATIC_KNOWLEDGE.slice(0, 2),
    fieldUpdates: [],
    focusLineCode: nextLine?.line_code ?? null,
    nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
    requestSave: false,
    requestSubmit: false,
    mode: 'fallback',
  };
}
