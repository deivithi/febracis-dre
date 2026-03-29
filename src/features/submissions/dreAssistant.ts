import type { DreInputCatalogLine } from '../shared/portal.types.js';

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
    help: 'Use o total bruto vendido no periodo, antes das deducoes. Esse campo e a base de toda a DRE.',
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

/** Texto fixo para o franqueado — sem códigos internos. */
export const ASSISTANT_REPLY_FORMAT_HINT =
  'Envie só o valor em reais nesta mensagem (ex.: 1.234,56 ou 25000).';

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
];

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
) {
  const currentIndex = currentLineCode
    ? lines.findIndex((line) => line.line_code === currentLineCode)
    : -1;

  const orderedLines = currentIndex >= 0
    ? [...lines.slice(currentIndex + 1), ...lines.slice(0, currentIndex + 1)]
    : [...lines];

  return (
    orderedLines.find((line) => {
      const rawValue = currentValues[line.line_code] ?? '';
      return rawValue.trim().length === 0;
    }) ??
    lines[(currentIndex + 1) % Math.max(lines.length, 1)] ??
    null
  );
}

export function buildQuestionForLine(line: DreInputCatalogLine) {
  const guide = getFieldGuide(line);
  return `${guide.question} ${guide.example} ${ASSISTANT_REPLY_FORMAT_HINT}`;
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
}): DreAssistantTurnResult {
  const normalizedMessage = normalizeText(input.message);
  const focusLine = input.currentLineCode
    ? input.lines.find((line) => line.line_code === input.currentLineCode) ?? null
    : null;
  const nextLine =
    findNextGuidedLine(input.lines, input.currentValues, input.currentLineCode ?? undefined) ??
    input.lines[0] ??
    null;

  if (classifyDreUserIntent(input.message) === 'off_topic') {
    const anchor = focusLine ?? nextLine;
    return {
      answer: `Posso ajudar só com a DRE deste período: campos, ordem de preenchimento e regras da Febracis. ${anchor ? `Voltando ao contexto: ${anchor.line_name} — posso explicar o que esse campo representa.` : 'Pergunte sobre um campo da DRE ou sobre o fluxo de submissão.'}`,
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: anchor?.line_code ?? null,
      nextPrompt: anchor ? `Quer uma explicação sobre “${anchor.line_name}”?` : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (isGreetingOrStartFlow(normalizedMessage)) {
    return {
      answer:
        'Olá! Você está no modo orientação: posso explicar campos da DRE, a ordem da planilha e as regras de envio. Quem digita os valores na submissão é o franqueado (ou administrador da unidade) com permissão de operação — daqui não altero números nem salvo rascunho.',
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

  if (normalizedMessage.includes('salvar') || normalizedMessage.includes('enviar')) {
    return {
      answer:
        'No modo leitura eu não disparei gravação nem envio. Quem pode editar deve usar os botões “Salvar rascunho” e “Enviar para revisão” no painel lateral.',
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
    return {
      answer:
        'Pular ou alterar campos na conversa só está disponível para quem opera a submissão. Aqui posso só orientar sobre o que cada linha significa.',
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
  if (
    normalizedMessage.includes('serve') ||
    normalizedMessage.includes('o que e') ||
    normalizedMessage.includes('para que') ||
    normalizedMessage.includes('duvida') ||
    normalizedMessage.includes('explicar') ||
    mentionedLine
  ) {
    const helpLine = mentionedLine ?? focusLine ?? nextLine;
    if (helpLine) {
      const guide = getFieldGuide(helpLine);
      return {
        answer: `${guide.help} ${guide.example} No seu perfil, os valores são preenchidos pelo responsável da unidade na mesma tela — o painel ao lado mostra MC1, MC2 e EBITDA recalculados pelo sistema após cada gravação.`,
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

  if (parseAssistantCurrencyReply(input.message) !== null) {
    return {
      answer:
        'Recebi um valor em reais, mas no modo orientação eu não aplico números na submissão. Peça ao franqueado (perfil com operação na submissão) para informar esse valor na conversa ou na planilha, ou use “Explicar campo” se quiser só entender a linha.',
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: focusLine?.line_code ?? nextLine?.line_code ?? null,
      nextPrompt: focusLine ? `Quer explicação sobre “${focusLine.line_name}”?` : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  return {
    answer: `Modo orientação: falo só sobre a DRE, campos e fluxo. ${ASSISTANT_REPLY_FORMAT_HINT} Não altero dados nem calculo MC1, MC2 ou EBITDA — isso aparece no painel depois que a unidade salva.`,
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
  /** Só explicação: sem fieldUpdates nem pedidos de gravação. */
  explainOnly?: boolean;
}): DreAssistantTurnResult {
  if (input.explainOnly) {
    if (!input.lines.length) {
      return {
        answer:
          'Abra uma submissão neste recorte para eu explicar os campos da DRE e o fluxo. No modo orientação não altero valores.',
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
    return {
      answer:
        'Para eu te guiar campo a campo, preciso de um rascunho de submissão aberto. Use “Criar rascunho” ou “Abrir rascunho” no topo da página e volte aqui — a partir daí eu conduzo toda a conversa.',
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: null,
      nextPrompt: null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (classifyDreUserIntent(input.message) === 'off_topic') {
    const anchor = focusLine ?? findNextGuidedLine(input.lines, input.currentValues, input.currentLineCode ?? undefined);
    return {
      answer: `Foco na DRE deste período. ${anchor ? `Seguimos com “${anchor.line_name}”: ${buildQuestionForLine(anchor)}` : 'Envie o próximo valor em reais ou peça “Explicar campo”.'}`,
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: anchor?.line_code ?? null,
      nextPrompt: anchor ? buildQuestionForLine(anchor) : null,
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

    return {
      answer: `Olá! Fico feliz em te ajudar com a DRE deste período. Vamos com calma: eu vou te pedir um número de cada vez, sempre em reais, e o sistema recalcula MC1, MC2 e EBITDA sozinho. Quando estiver pronto, é só responder com o valor.`,
      citations: STATIC_KNOWLEDGE.slice(0, 1),
      fieldUpdates: [],
      focusLineCode: nextLine?.line_code ?? null,
      nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
      requestSave: false,
      requestSubmit: false,
      mode: 'fallback',
    };
  }

  if (normalizedMessage.includes('salvar')) {
    return {
      answer:
        'Perfeito, anotei que você quer salvar o rascunho. No painel à direita, use “Salvar rascunho” para gravar tudo no sistema oficial com a data e a versão corretas.',
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
    return {
      answer:
        'O envio formal para a controladoria continua sendo pelo botão “Enviar para revisão” no painel lateral. Antes disso, posso te ajudar a conferir os valores um a um.',
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
      return {
        answer:
          'Ainda não tenho um campo em foco. Toque em “Olá” para começarmos o roteiro, ou envie diretamente o valor em reais do próximo item que quiser preencher.',
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

    return {
      answer: `Sem problema — deixamos "${anchor.line_name}" em branco por enquanto. Quando quiser retomar, é só me dizer.`,
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
    normalizedMessage.includes('para que') ||
    normalizedMessage.includes('duvida') ||
    normalizedMessage.includes('explicar') ||
    mentionedLine
  ) {
    const helpLine = mentionedLine ?? focusLine ?? findNextGuidedLine(input.lines, input.currentValues);

    if (helpLine) {
      const guide = getFieldGuide(helpLine);
      return {
        answer: `${guide.help} ${guide.example} Para me responder, envie só o valor em reais nesta caixa (por exemplo 15000 ou 1.234,56).`,
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

  const parsedValue = parseAssistantCurrencyReply(input.message);
  const valueTargetLine = focusLine ?? (parsedValue !== null ? findNextGuidedLine(input.lines, input.currentValues) : null);

  if (parsedValue !== null && valueTargetLine) {
    const nextLine = findNextGuidedLine(input.lines, {
      ...input.currentValues,
      [valueTargetLine.line_code]: String(parsedValue),
    }, valueTargetLine.line_code);

    return {
      answer: `Registrei ${valueTargetLine.line_name} como R$ ${parsedValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}. O sistema já pode recalcular MC1, MC2 e EBITDA com esse número — não preciso somar nada manualmente aqui. Quando quiser, seguimos para o próximo item.`,
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
    };
  }

  const nextLine = findNextGuidedLine(input.lines, input.currentValues, focusLine?.line_code);

  return {
    answer: `Estou no modo guiado local: vou seguir a ordem oficial da planilha. ${ASSISTANT_REPLY_FORMAT_HINT} Tudo o que você informar entra nos mesmos campos da DRE e o painel ao lado mostra o resultado.`,
    citations: STATIC_KNOWLEDGE.slice(0, 2),
    fieldUpdates: [],
    focusLineCode: nextLine?.line_code ?? null,
    nextPrompt: nextLine ? buildQuestionForLine(nextLine) : null,
    requestSave: false,
    requestSubmit: false,
    mode: 'fallback',
  };
}
