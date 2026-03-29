import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createClient } from '@supabase/supabase-js';
import type { AgentMessageRow, AgentSessionRow, DreInputCatalogLine } from '../src/features/shared/portal.types.js';
import {
  buildOrderedFieldFlowForPrompt,
  buildQuestionForLine,
  findNextGuidedLine,
  retrieveRelevantAssistantKnowledge,
  runLocalAssistantTurn,
  shouldUseDeterministicAssistantTurn,
  stripInternalLineCodesFromUserText,
  type DreAssistantCitation,
  type DreAssistantTurnResult,
} from '../src/features/submissions/dreAssistant.js';

const DEFAULT_OPENROUTER_MODEL = 'minimax/minimax-m2.7';

interface AgentApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface AgentApiResponse {
  status: (code: number) => {
    json: (body: unknown) => unknown;
  };
}

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  submissionId: z.string().uuid(),
  message: z.string().min(1),
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
  result: Annotation<DreAssistantTurnResult>(),
});

function jsonResponse(res: AgentApiResponse, status: number, body: unknown) {
  return res.status(status).json(body);
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

  const [
    sectionRows,
    lineRows,
    valueRows,
    messageRows,
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
      .limit(16),
  ]);

  if (sectionRows.error || lineRows.error || valueRows.error || messageRows.error) {
    throw new Error(
      [
        sectionRows.error?.message,
        lineRows.error?.message,
        valueRows.error?.message,
        messageRows.error?.message,
      ].filter(Boolean).join(' '),
    );
  }

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

  return {
    session: session as AgentSessionRow,
    lines,
    currentValues,
    messages: (messageRows.data ?? []) as AgentMessageRow[],
  };
}

function sanitizeResult(
  rawResult: DreAssistantTurnResult,
  lines: DreInputCatalogLine[],
  currentValues: Record<string, string>,
) {
  const knownLines = new Map(lines.map((line) => [line.line_code, line]));
  const sanitizedUpdates = rawResult.fieldUpdates.filter((update) => knownLines.has(update.lineCode));
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
  } satisfies DreAssistantTurnResult;
}

async function runModelTurn(input: {
  lines: DreInputCatalogLine[];
  currentValues: Record<string, string>;
  messages: AgentMessageRow[];
  currentLineCode: string | null;
  userMessage: string;
  citations: DreAssistantCitation[];
}) {
  const apiKey = getEnv('OPENROUTER_API_KEY');

  if (!apiKey) {
    return runLocalAssistantTurn({
      message: input.userMessage,
      lines: input.lines,
      currentValues: input.currentValues,
      currentLineCode: input.currentLineCode,
    });
  }

  if (shouldUseDeterministicAssistantTurn(input.userMessage)) {
    return runLocalAssistantTurn({
      message: input.userMessage,
      lines: input.lines,
      currentValues: input.currentValues,
      currentLineCode: input.currentLineCode,
    });
  }

  const model = new ChatOpenAI({
    apiKey,
    model: getEnv('OPENROUTER_MODEL', DEFAULT_OPENROUTER_MODEL) ?? DEFAULT_OPENROUTER_MODEL,
    temperature: 0.15,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': getEnv('OPENROUTER_APP_URL', 'https://febracis-dre.vercel.app') ?? 'https://febracis-dre.vercel.app',
        'X-Title': 'Febracis DRE Assistant',
      },
    },
  }).withStructuredOutput(turnResultSchema);

  const allowedFields = input.lines.map((line) => ({
    lineCode: line.line_code,
    label: line.line_name,
    section: line.section_name,
    description: line.description ?? '',
  }));

  const fieldOrderGuide = buildOrderedFieldFlowForPrompt(input.lines);

  const prompt = [
    'Voce e o assistente humano da Febracis que guia o franqueado no preenchimento da DRE oficial, um campo de cada vez.',
    'Tom: acolhedor, claro, profissional — como um especialista ao telefone. Sem listas com #, sem titulos Markdown, sem ###.',
    '',
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
    '',
    'Ordem oficial dos campos (siga esta sequencia ao guiar; pergunte o proximo ainda vazio):',
    fieldOrderGuide,
    '',
    `Campo em foco atual (interno): ${input.currentLineCode ?? 'inferir: proximo campo vazio na ordem acima'}`,
    `allowed_fields: ${JSON.stringify(allowedFields)}`,
    `valores_atuais: ${JSON.stringify(input.currentValues)}`,
    `knowledge_docs: ${JSON.stringify(input.citations)}`,
    `historico_recente: ${JSON.stringify(input.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })))}`,
    `mensagem_usuario: ${input.userMessage}`,
    '',
    'Retorne answer, fieldUpdates, focusLineCode, nextPrompt, requestSave e requestSubmit.',
  ].join('\n');

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

    return {
      result: {
        ...base,
        answer: cleanAnswer.length > 0 ? cleanAnswer : base.answer,
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

    const resultState = await workflow.invoke({
      session: context.session,
      lines: context.lines,
      currentValues: context.currentValues,
      messages: context.messages,
      userMessage: parsedBody.data.message,
      currentLineCode,
      citations: [],
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

    const result = sanitizeResult(resultState.result, context.lines, context.currentValues);

    return jsonResponse(res, 200, {
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected agent error.';
    return jsonResponse(res, 400, { error: message });
  }
}
