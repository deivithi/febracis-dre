import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createClient } from '@supabase/supabase-js';
import type { AgentMessageRow, AgentSessionRow, DreInputCatalogLine } from '../src/features/shared/portal.types.js';
import { canAssistantMutateSubmission } from '../src/features/submissions/agentPermissions.js';
import {
  AGENT_MESSAGE_HISTORY_LIMIT,
  buildConversationSummaryFromMessages,
  buildFlowCheckpoint,
  buildOrderedFieldFlowForPrompt,
  buildQuestionForLine,
  findNextGuidedLine,
  retrieveRelevantAssistantKnowledge,
  runLocalAssistantTurn,
  shouldUseDeterministicAssistantTurn,
  stripCalculatedMetricClaimsFromAnswer,
  stripInternalLineCodesFromUserText,
  validateAssistantFieldUpdates,
  type DreAssistantCitation,
  type DreAssistantTurnResult,
  type FlowCheckpoint,
} from '../src/features/submissions/dreAssistant.js';
import { parseAgentRateLimitEnv, parseRateLimitRpcResult } from './agentRateLimitConfig.js';

const DEFAULT_OPENROUTER_MODEL = 'minimax/minimax-m2.7';
/** Modelo por defeito quando `OPENAI_API_KEY` está definida (API nativa OpenAI). */
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

/** Limite de caracteres por mensagem do utilizador (custo LLM / payload). */
export const AGENT_USER_MESSAGE_MAX_LENGTH = 12000;

interface AgentApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface AgentApiResponse {
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => unknown;
  };
}

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  submissionId: z.string().uuid(),
  message: z.string().min(1).max(AGENT_USER_MESSAGE_MAX_LENGTH),
});

const turnResultSchema = z.object({
  answer: z.string(),
  fieldUpdates: z.array(z.object({
    lineCode: z.string(),
    valueCurrency: z.number(),
    label: z.string(),
  })).default([]),
  focusLineCode: z.string().nullable().default(null),
  nextPrompt: z.string().nullable().default(null),
  requestSave: z.boolean().default(false),
  requestSubmit: z.boolean().default(false),
});

const TurnState = Annotation.Root({
  session: Annotation<AgentSessionRow>(),
  lines: Annotation<DreInputCatalogLine[]>(),
  currentValues: Annotation<Record<string, string>>(),
  messages: Annotation<AgentMessageRow[]>(),
  userMessage: Annotation<string>(),
  currentLineCode: Annotation<string | null>(),
  citations: Annotation<DreAssistantCitation[]>(),
  explainOnly: Annotation<boolean>(),
  conversationSummary: Annotation<string | null>(),
  result: Annotation<DreAssistantTurnResult>(),
});

function jsonResponse(res: AgentApiResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

interface SafeError {
  status: number;
  code: string;
  message: string;
}

function classifyAgentError(error: unknown): SafeError {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes('sessao do assistente nao encontrada') || lower.includes('sessao nao encontrada')) {
    return { status: 404, code: 'SESSION_NOT_FOUND', message: 'Sessao do assistente nao encontrada.' };
  }
  if (lower.includes('nao corresponde a esta submissao') || lower.includes('nao corresponde ao recorte')) {
    return { status: 400, code: 'SUBMISSION_MISMATCH', message: 'Parametros da sessao invalidos.' };
  }
  if (lower.includes('usuario autenticado nao encontrado')) {
    return { status: 401, code: 'UNAUTHENTICATED', message: 'Nao autenticado.' };
  }
  if (lower.includes('acesso negado')) {
    return { status: 403, code: 'FORBIDDEN', message: 'Acesso negado.' };
  }
  if (lower.includes('permission denied')) {
    return { status: 403, code: 'FORBIDDEN', message: 'Sem permissao para operacao.' };
  }
  if (lower.includes('invalid request') || lower.includes('zod')) {
    return { status: 400, code: 'INVALID_INPUT', message: 'Dados invalidos.' };
  }

  return { status: 500, code: 'INTERNAL', message: 'Erro interno no assistente.' };
}

function getEnv(name: string, fallback?: string) {
  return process.env[name] ?? fallback ?? null;
}

function createSupabaseUserClient(authorization: string) {
  const supabaseUrl = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL') ?? undefined);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', getEnv('VITE_SUPABASE_ANON_KEY') ?? undefined);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured for the agent.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function loadSessionContext(
  authorization: string,
  sessionId: string,
  submissionId: string,
) {
  const supabase = createSupabaseUserClient(authorization);

  const [{ data: userData, error: userError }, { data: session, error: sessionError }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('agent_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle(),
    ]);

  if (userError || !userData.user) {
    throw new Error('Usuario autenticado nao encontrado para o assistente.');
  }

  if (sessionError || !session) {
    throw new Error(`Sessao do assistente nao encontrada. ${sessionError?.message ?? ''}`.trim());
  }

  if (session.submission_id !== submissionId) {
    throw new Error('Sessao do assistente nao corresponde a esta submissao.');
  }

  const [
    sectionRows,
    lineRows,
    valueRows,
    messageRows,
    submissionRow,
    userRoleLinks,
  ] = await Promise.all([
    supabase
      .from('dre_sections')
      .select('id, code, name, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('dre_lines')
      .select('id, section_id, code, name, description, display_order, input_mode')
      .eq('line_type', 'input')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('submission_input_values')
      .select('dre_line_id, value_currency, notes')
      .eq('submission_id', submissionId),
    supabase
      .from('agent_messages')
      .select('id, session_id, role, content, citations, payload, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(AGENT_MESSAGE_HISTORY_LIMIT),
    supabase.from('submissions').select('status').eq('id', submissionId).maybeSingle(),
    supabase.from('user_roles').select('role_id').eq('profile_id', userData.user.id),
  ]);

  if (
    sectionRows.error ||
    lineRows.error ||
    valueRows.error ||
    messageRows.error ||
    submissionRow.error ||
    userRoleLinks.error
  ) {
    throw new Error(
      [
        sectionRows.error?.message,
        lineRows.error?.message,
        valueRows.error?.message,
        messageRows.error?.message,
        submissionRow.error?.message,
        userRoleLinks.error?.message,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  const roleIdList = [...new Set((userRoleLinks.data ?? []).map((row) => row.role_id))];
  const rolesLookup =
    roleIdList.length > 0
      ? await supabase.from('roles').select('code').in('id', roleIdList)
      : { data: [] as { code: string }[], error: null };

  if (rolesLookup.error) {
    throw new Error(rolesLookup.error.message);
  }

  const roleCodes = (rolesLookup.data ?? []).map((row) => row.code);
  const submissionStatus = submissionRow.data?.status ?? 'draft';

  const sectionMap = new Map(
    (sectionRows.data ?? []).map((section) => [section.id, section]),
  );
  const valueMap = new Map(
    (valueRows.data ?? []).map((value) => [value.dre_line_id, value]),
  );

  const lines = (lineRows.data ?? []).map((line) => {
    const section = sectionMap.get(line.section_id);
    const value = valueMap.get(line.id);

    return {
      id: line.id,
      section_code: section?.code ?? 'section',
      section_name: section?.name ?? 'Secao',
      section_order: section?.display_order ?? 999,
      line_code: line.code,
      line_name: line.name,
      description: line.description,
      line_order: line.display_order,
      input_mode: line.input_mode,
      value_currency: value?.value_currency ?? null,
      notes: value?.notes ?? null,
    } satisfies DreInputCatalogLine;
  }).sort((left, right) => {
    if (left.section_order !== right.section_order) {
      return left.section_order - right.section_order;
    }

    return left.line_order - right.line_order;
  });

  const currentValues = Object.fromEntries(
    lines.map((line) => [
      line.line_code,
      line.value_currency === null
        ? ''
        : line.value_currency.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
    ]),
  );

  const messages = (messageRows.data ?? []) as AgentMessageRow[];
  const conversationSummary =
    messages.length >= 12
      ? buildConversationSummaryFromMessages(
          messages.map((m) => ({ role: m.role, content: m.content })),
        )
      : null;

  return {
    session: session as AgentSessionRow,
    lines,
    currentValues,
    messages,
    submissionStatus,
    roleCodes,
    conversationSummary,
  };
}

function sanitizeResult(
  rawResult: DreAssistantTurnResult,
  lines: DreInputCatalogLine[],
  currentValues: Record<string, string>,
  explainOnly: boolean,
) {
  const knownLines = new Map(lines.map((line) => [line.line_code, line]));
  const knownCodes = new Set(knownLines.keys());
  let sanitizedUpdates = validateAssistantFieldUpdates(rawResult.fieldUpdates, knownCodes);
  if (explainOnly) {
    sanitizedUpdates = [];
  }
  const nextLine = rawResult.focusLineCode
    ? knownLines.get(rawResult.focusLineCode) ?? null
    : findNextGuidedLine(lines, currentValues, rawResult.focusLineCode);

  return {
    ...rawResult,
    fieldUpdates: sanitizedUpdates,
    focusLineCode: nextLine?.line_code ?? rawResult.focusLineCode ?? null,
    nextPrompt:
      rawResult.nextPrompt ??
      (nextLine ? buildQuestionForLine(nextLine) : null),
    requestSave: explainOnly ? false : rawResult.requestSave,
    requestSubmit: explainOnly ? false : rawResult.requestSubmit,
  } satisfies DreAssistantTurnResult;
}

async function runModelTurn(input: {
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  messages: AgentMessageRow[];
  currentLineCode: string | null;
  userMessage: string;
  citations: DreAssistantCitation[];
  explainOnly: boolean;
  conversationSummary: string | null;
}) {
  const openaiKey = getEnv('OPENAI_API_KEY');
  const openrouterKey = getEnv('OPENROUTER_API_KEY');

  if (!openaiKey && !openrouterKey) {
    return runLocalAssistantTurn({
      message: input.userMessage,
      lines: input.lines,
      currentValues: input.currentValues,
      currentLineCode: input.currentLineCode,
      explainOnly: input.explainOnly,
    });
  }

  if (shouldUseDeterministicAssistantTurn(input.userMessage)) {
    return runLocalAssistantTurn({
      message: input.userMessage,
      lines: input.lines,
      currentValues: input.currentValues,
      currentLineCode: input.currentLineCode,
      explainOnly: input.explainOnly,
    });
  }

  /** Prioridade: OpenAI nativa (`OPENAI_API_KEY`) > OpenRouter (`OPENROUTER_API_KEY`). */
  const baseLlm = openaiKey
    ? new ChatOpenAI({
        apiKey: openaiKey,
        model: getEnv('OPENAI_MODEL', DEFAULT_OPENAI_MODEL) ?? DEFAULT_OPENAI_MODEL,
        temperature: 0.15,
      })
    : new ChatOpenAI({
        apiKey: openrouterKey!,
        model: getEnv('OPENROUTER_MODEL', DEFAULT_OPENROUTER_MODEL) ?? DEFAULT_OPENROUTER_MODEL,
        temperature: 0.15,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': getEnv('OPENROUTER_APP_URL', 'https://febracis-dre-phi.vercel.app') ?? 'https://febracis-dre-phi.vercel.app',
            'X-Title': 'Febracis DRE Assistant',
          },
        },
      });

  const model = baseLlm.withStructuredOutput(turnResultSchema);

  const allowedFields = input.lines.map((line) => ({
    lineCode: line.line_code,
    label: line.line_name,
    section: line.section_name,
    description: line.description ?? '',
  }));

  const fieldOrderGuide = buildOrderedFieldFlowForPrompt(input.lines);

  const modeRules = input.explainOnly
    ? [
        'MODO ORIENTACAO (LEITURA): o utilizador ve a submissao mas nao pode aplicar valores.',
        '- fieldUpdates deve ser SEMPRE []. Nunca envie valores monetarios para aplicar.',
        '- requestSave e requestSubmit sempre false.',
        '- Explique campos da DRE, ordem da planilha, significado das linhas e fluxo de revisao.',
        '- Se o usuario enviar numeros, diga que quem opera a submissao deve inserir na conversa ou na planilha com perfil de franqueado.',
        '- Nunca apresente MC1, MC2, EBITDA 1 ou EBITDA 2 com valores calculados; diga que o painel recalcula apos salvar.',
        '- Classifique internamente: se a mensagem for fora do tema DRE/submissao, responda em uma frase e volte ao glossario.',
      ]
    : [
        'Regras criticas:',
        '- Nunca invente line_code. So use lineCode que exista em allowed_fields.',
        '- Nunca calcule nem estime MC1, MC2, EBITDA 1 ou EBITDA 2; o sistema recalcula sozinho.',
        '- So envie fieldUpdates para campos editaveis da lista allowed_fields.',
        '- Nunca mostre line_code, snake_case ou identificadores tecnicos ao usuario. Use apenas os nomes em allowed_fields.label.',
        '- No campo answer: texto corrido em 2 a 4 paragrafos curtos em portugues do Brasil. Explique o que precisa, como enviar o valor (só numeros em reais, ex. 15000 ou 1.234,56, pode dizer "50 mil"), e reforce o proximo passo se fizer sentido.',
        '- Uma unica pergunta operacional por mensagem no fluxo guiado.',
        '- Se o usuario cumprimentar (ola, bom dia) ou pedir para comecar, explique o processo em uma frase e faca a primeira pergunta do passo em aberto.',
        '- Se o usuario mandar um valor monetario claro, proponha fieldUpdates so para o campo em foco ou para o campo que ele citou explicitamente.',
        '- Nao peca envio final da submissao; isso continua nos botoes oficiais da tela.',
        '- O campo nextPrompt deve ser uma unica pergunta curta + exemplo numerico + lembrete de formato, sem codigos internos.',
        '- Se a mensagem for claramente fora do tema DRE (piada, politica, outro assunto), responda brevemente e retome o proximo passo sem fieldUpdates.',
      ];

  const prompt = [
    input.explainOnly
      ? 'Voce e o assistente da Febracis em MODO ORIENTACAO: ajuda a entender a DRE e o fluxo, sem preencher dados.'
      : 'Voce e o assistente humano da Febracis que guia o franqueado no preenchimento da DRE oficial, um campo de cada vez.',
    'Tom: acolhedor, claro, profissional — como um especialista ao telefone. Sem listas com #, sem titulos Markdown, sem ###.',
    '',
    ...modeRules,
    '',
    'Ordem oficial dos campos (referencia; siga ao explicar ou ao guiar):',
    fieldOrderGuide,
    '',
    `Campo em foco atual (interno): ${input.currentLineCode ?? 'inferir: proximo campo vazio na ordem acima'}`,
    `allowed_fields: ${JSON.stringify(allowedFields)}`,
    `valores_atuais: ${JSON.stringify(input.currentValues)}`,
    `knowledge_docs: ${JSON.stringify(input.citations)}`,
    input.conversationSummary ? `contexto_compacto: ${input.conversationSummary}` : '',
    `historico_recente: ${JSON.stringify(input.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })))}`,
    `mensagem_usuario: ${input.userMessage}`,
    '',
    'Retorne answer, fieldUpdates, focusLineCode, nextPrompt, requestSave e requestSubmit.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await model.invoke(prompt);

    return {
      answer: result.answer,
      citations: input.citations,
      fieldUpdates: result.fieldUpdates ?? [],
      focusLineCode: result.focusLineCode ?? null,
      nextPrompt: result.nextPrompt ?? null,
      requestSave: result.requestSave ?? false,
      requestSubmit: result.requestSubmit ?? false,
      mode: 'llm',
    } satisfies DreAssistantTurnResult;
  } catch (llmError) {
    const reason = llmError instanceof Error ? llmError.message : 'LLM error';
    console.error('[dre-agent] LLM turn failed, using local guided fallback:', reason);

    const local = runLocalAssistantTurn({
      message: input.userMessage,
      lines: input.lines,
      currentValues: input.currentValues,
      currentLineCode: input.currentLineCode,
      explainOnly: input.explainOnly,
    });

    return {
      ...local,
      answer: `${local.answer}\n\n(Resposta em modo guiado local: a chamada ao modelo online falhou neste instante — pode tentar de novo em seguida.)`,
      mode: 'fallback',
    };
  }
}

const workflow = new StateGraph(TurnState)
  .addNode('retrieve_context', async (state) => {
    const citations = retrieveRelevantAssistantKnowledge(
      state.lines,
      state.userMessage,
      state.currentLineCode,
      8,
    );

    return {
      citations,
    };
  })
  .addNode('generate_turn', async (state) => {
    const result = await runModelTurn({
      lines: state.lines,
      currentValues: state.currentValues,
      messages: state.messages,
      currentLineCode: state.currentLineCode,
      userMessage: state.userMessage,
      citations: state.citations,
      explainOnly: state.explainOnly,
      conversationSummary: state.conversationSummary,
    });

    return {
      result,
    };
  })
  .addNode('finalize_response', async (state) => {
    const lineCodes = state.lines.map((line) => line.line_code);
    const base = state.result;
    const cleanAnswer = stripInternalLineCodesFromUserText(base.answer, lineCodes);
    const cleanNextRaw = base.nextPrompt
      ? stripInternalLineCodesFromUserText(base.nextPrompt, lineCodes)
      : '';
    const afterMetrics = stripCalculatedMetricClaimsFromAnswer(
      cleanAnswer.length > 0 ? cleanAnswer : base.answer,
    );

    return {
      result: {
        ...base,
        answer: afterMetrics,
        nextPrompt: cleanNextRaw.length > 0 ? cleanNextRaw : null,
      },
    };
  })
  .addEdge(START, 'retrieve_context')
  .addEdge('retrieve_context', 'generate_turn')
  .addEdge('generate_turn', 'finalize_response')
  .addEdge('finalize_response', END)
  .compile();

export default async function handler(req: AgentApiRequest, res: AgentApiResponse) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  const authorizationHeader = req.headers.authorization;
  const authorization = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;

  if (!authorization) {
    return jsonResponse(res, 401, { error: 'Missing authorization header.' });
  }

  const parsedBody = requestSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return jsonResponse(res, 400, { error: 'Invalid request body.' });
  }

  const rateLimit = parseAgentRateLimitEnv();
  if (rateLimit.enabled) {
    try {
      const supabase = createSupabaseUserClient(authorization);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return jsonResponse(res, 401, { error: 'Usuario autenticado nao encontrado para o assistente.' });
      }
      const { data: rateData, error: rateError } = await supabase.rpc('fn_agent_rate_check', {
        p_limit: rateLimit.limit,
        p_window_seconds: rateLimit.windowSeconds,
      });
      if (rateError) {
        // Fail-open: evita bloquear o assistente se a RPC ou RLS nao estiverem aplicados no ambiente.
        console.error('[dre-agent] rate limit check failed (fail-open):', rateError.message);
      } else {
        const { allowed, retryAfterSeconds } = parseRateLimitRpcResult(rateData);
        if (!allowed) {
          res.setHeader?.('Retry-After', String(retryAfterSeconds));
          return jsonResponse(res, 429, {
            error: 'rate_limit_exceeded',
            retryAfterSeconds,
          });
        }
      }
    } catch (rateException) {
      console.error('[dre-agent] rate limit exception (fail-open):', rateException);
    }
  }

  try {
    const context = await loadSessionContext(
      authorization,
      parsedBody.data.sessionId,
      parsedBody.data.submissionId,
    );

    const currentLineCode =
      typeof context.session.state_json?.guided_line_code === 'string'
        ? context.session.state_json.guided_line_code
        : null;

    const writeAllowed = canAssistantMutateSubmission(context.roleCodes, context.submissionStatus);
    const explainOnly = !writeAllowed;

    const resultState = await workflow.invoke({
      session: context.session,
      lines: context.lines,
      currentValues: context.currentValues,
      messages: context.messages,
      userMessage: parsedBody.data.message,
      currentLineCode,
      citations: [],
      explainOnly,
      conversationSummary: context.conversationSummary,
      result: {
        answer: '',
        citations: [],
        fieldUpdates: [],
        focusLineCode: null,
        nextPrompt: null,
        requestSave: false,
        requestSubmit: false,
        mode: 'fallback',
      },
    });

    const result = sanitizeResult(resultState.result, context.lines, context.currentValues, explainOnly);

    const flowCheckpoint: FlowCheckpoint = buildFlowCheckpoint({
      lines: context.lines,
      currentValues: context.currentValues,
      focusLineCode: result.focusLineCode,
      userMessage: parsedBody.data.message,
      explainOnly,
    });

    return jsonResponse(res, 200, {
      ok: true,
      result,
      flow_checkpoint: flowCheckpoint,
      interaction_mode: explainOnly ? 'explain_only' : 'full',
    });
  } catch (error) {
    console.error('[dre-agent] internal error:', error);
    const safe = classifyAgentError(error);
    return jsonResponse(res, safe.status, { error: safe.message, code: safe.code });
  }
}
