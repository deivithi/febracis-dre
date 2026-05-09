import { z } from 'zod';

/** Limite de caracteres por mensagem do utilizador (custo LLM / payload). */
export const AGENT_USER_MESSAGE_MAX_LENGTH = 12000;

/** Anexos opcionais futuros (URLs só http(s) sem RFC1918 / loopback). */
export const AGENT_ATTACHMENTS_MAX = 5;

export const AGENT_ATTACHMENT_URL_MAX_LENGTH = 2048;

export const AGENT_ATTACHMENT_NAME_MAX_LENGTH = 256;

/** Cabeçalho Authorization (Bearer JWT Supabase). */
export const AGENT_AUTH_HEADER_MAX_LENGTH = 32768;

const C0_CONTROL_EXCEPT_WHITESPACE =
  // eslint-disable-next-line no-control-regex -- intencional: remove control chars inseguros
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Caracteres zero-width frequentes em abusos / homoglifos. */
const ZERO_WIDTH_AND_BOM = /[\u200B-\u200D\uFEFF]/g;

/**
 * Normaliza e remove control characters (exceto tab/CR/LF) e zero-width.
 * Não altera o significado do texto em português corrente.
 */
export function sanitizeAgentUserMessage(input: string): string {
  let s = input.normalize('NFC');
  s = s.replace(C0_CONTROL_EXCEPT_WHITESPACE, '');
  s = s.replace(ZERO_WIDTH_AND_BOM, '');
  return s.trim();
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '0.0.0.0') return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = ipv4.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const c = Number(m[3]);
    const d = Number(m[4]);
    if ([a, b, c, d].some((n) => n > 255)) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    /** CGNAT RFC 6598 */
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
  }

  /** IPv6 simplificado: bloqueia loopback / ULA / link-local com prefixos comuns. */
  if (h.includes(':')) {
    const compact = h.replace(/^\[|\]$/g, '');
    if (compact === '::1') return true;
    if (compact.startsWith('fe80:')) return true;
    if (compact.startsWith('fc') || compact.startsWith('fd')) return true;
    if (compact.startsWith('::ffff:')) {
      const tail = compact.slice('::ffff:'.length);
      if (tail.startsWith('127.') || tail === '127.0.0.1') return true;
    }
  }

  return false;
}

/**
 * Aceita apenas http/https sem credenciais em userinfo e bloqueia destinos SSRF típicos.
 * Aceita string (parse interno) ou instância já parsada.
 */
export function isSafeHttpUrlForAttachment(raw: string | URL): boolean {
  let u: URL;
  if (typeof raw === 'string') {
    try {
      u = new URL(raw);
    } catch {
      return false;
    }
  } else {
    u = raw;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username !== '' || u.password !== '') return false;
  if (!u.hostname || u.hostname === '') return false;
  return !isPrivateOrLocalHostname(u.hostname);
}

const assistantProductTabSchema = z.enum(['duvidas', 'preencher']).optional();

const attachmentSchema = z
  .object({
    url: z.string().max(AGENT_ATTACHMENT_URL_MAX_LENGTH),
    name: z.string().max(AGENT_ATTACHMENT_NAME_MAX_LENGTH).optional(),
  })
  .strict()
  .superRefine((row, ctx) => {
    let u: URL;
    try {
      u = new URL(row.url);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'INVALID_ATTACHMENT_URL_FORMAT',
        path: ['url'],
      });
      return;
    }
    if (!isSafeHttpUrlForAttachment(u)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'INVALID_ATTACHMENT_URL',
        path: ['url'],
      });
    }
  });

/** Corpo POST /api/dre-agent — conversação — chaves estranhas rejeitadas (.strict). */
export const dreAgentChatRequestBodySchema = z
  .object({
    sessionId: z.string().uuid(),
    submissionId: z.string().uuid(),
    message: z
      .string()
      .max(AGENT_USER_MESSAGE_MAX_LENGTH, { message: 'MESSAGE_TOO_LONG' })
      .transform(sanitizeAgentUserMessage)
      .pipe(
        z
          .string()
          .min(1, { message: 'MESSAGE_EMPTY_AFTER_SANITIZE' })
          .max(AGENT_USER_MESSAGE_MAX_LENGTH)
          .refine((s) => !/<\s*script\b/i.test(s), { message: 'MESSAGE_SCRIPT_PATTERN' })
          .refine((s) => !/\bjavascript:\s*/i.test(s), { message: 'MESSAGE_JAVASCRIPT_URL_PATTERN' })
          .refine((s) => !/<\s*iframe\b/i.test(s), { message: 'MESSAGE_IFRAME_PATTERN' }),
      ),
    assistantProductTab: assistantProductTabSchema,
    attachments: z.array(attachmentSchema).max(AGENT_ATTACHMENTS_MAX).optional(),
  })
  .strict();

/** U14 — sugestão inline por linha (sem sessão / mensagem). */
export const dreAgentSuggestFieldBodySchema = z
  .object({
    mode: z.literal('suggest_field'),
    submissionId: z.string().uuid(),
    lineCode: z.string().min(1).max(128),
    currentValue: z.number().finite().nullable().optional(),
    assistantProductTab: assistantProductTabSchema,
    context: z
      .object({
        lineNameHint: z.string().max(240).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type DreAgentChatRequestBody = z.infer<typeof dreAgentChatRequestBodySchema>;
export type DreAgentSuggestFieldBody = z.infer<typeof dreAgentSuggestFieldBodySchema>;
export type DreAgentRequestBody = DreAgentChatRequestBody | DreAgentSuggestFieldBody;

/** Alias retrocompatível — schema da conversação guiada. */
export const dreAgentRequestBodySchema = dreAgentChatRequestBodySchema;

/**
 * Gate Zod do corpo do assistente — o handler deve usar apenas isto.
 */
export function parseDreAgentRequestBody(body: unknown) {
  if (
    typeof body === 'object' &&
    body !== null &&
    (body as { mode?: unknown }).mode === 'suggest_field'
  ) {
    return dreAgentSuggestFieldBodySchema.safeParse(body);
  }
  return dreAgentChatRequestBodySchema.safeParse(body);
}

function formatZodErrorPayload(error: z.ZodError) {
  return {
    code: 'INVALID_INPUT' as const,
    error: 'Dados invalidos.',
    issues: error.issues.map((issue) => ({
      path: issue.path.map(String).join('.') || '(root)',
      message: issue.message,
      code: issue.code,
    })),
  };
}

export function dreAgentBodyParseResultForResponse(body: unknown) {
  const parsed = parseDreAgentRequestBody(body);
  if (parsed.success) {
    return { ok: true as const, data: parsed.data };
  }
  return { ok: false as const, response: formatZodErrorPayload(parsed.error) };
}

/**
 * Valida o cabeçalho Authorization (primeiro valor se array).
 * Ausência → 401; presente mas inválido (formato/comprimento) → 400 com issues Zod.
 */
export function parseDreAgentAuthorizationHeader(header: string | string[] | undefined) {
  const raw = Array.isArray(header) ? header[0] : header;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  if (!trimmed) {
    return {
      ok: false as const,
      httpStatus: 401 as const,
      response: {
        code: 'UNAUTHENTICATED' as const,
        error: 'Missing authorization header.',
        issues: [] as const,
      },
    };
  }

  const schema = z
    .string()
    .max(AGENT_AUTH_HEADER_MAX_LENGTH, { message: 'AUTHORIZATION_HEADER_TOO_LONG' })
    .refine((s) => /^Bearer\s+\S+$/i.test(s), { message: 'INVALID_BEAR_AUTHORIZATION' });

  const result = schema.safeParse(trimmed);
  if (!result.success) {
    return {
      ok: false as const,
      httpStatus: 400 as const,
      response: formatZodErrorPayload(result.error),
    };
  }

  return { ok: true as const, authorization: result.data };
}
