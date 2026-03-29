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

/** Mensagens que podem ser respondidas só com a lógica local (sem LLM) — ex.: saudação / início do fluxo. */
export function shouldUseDeterministicAssistantTurn(message: string): boolean {
  return isGreetingOrStartFlow(normalizeText(message.trim()));
}

export function runLocalAssistantTurn(input: {
  message: string;
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  currentLineCode?: string | null;
}): DreAssistantTurnResult {
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
