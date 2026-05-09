import { z } from 'zod';

export const insightTypeSchema = z.enum(['anomaly', 'trend', 'opportunity', 'risk']);
export const insightSeveritySchema = z.enum(['info', 'warning', 'critical']);

export const insightsScopeSchema = z
  .object({
    kind: z.enum(['franchise', 'regional', 'network']),
    franchiseId: z.string().uuid().optional(),
    regionalId: z.string().uuid().optional(),
  })
  .strict();

export const insightsPeriodRangeSchema = z
  .object({
    start: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, { message: 'INVALID_PERIOD_START' }),
    end: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, { message: 'INVALID_PERIOD_END' }),
  })
  .strict()
  .refine((row) => row.start <= row.end, { message: 'PERIOD_RANGE_INVERTED' });

export const dreInsightsRequestBodySchema = z
  .object({
    scope: insightsScopeSchema,
    period_range: insightsPeriodRangeSchema.optional(),
    /** Últimos N períodos usados na regressão / séries (1–24; default 6 no handler). */
    periods_count: z.number().int().min(1).max(24).optional(),
  })
  .strict();

export type DreInsightsRequestBody = z.infer<typeof dreInsightsRequestBodySchema>;

export function parseDreInsightsRequestBody(body: unknown) {
  return dreInsightsRequestBodySchema.safeParse(body);
}

export function dreInsightsBodyParseResultForResponse(body: unknown) {
  const parsed = parseDreInsightsRequestBody(body);
  if (parsed.success) {
    return { ok: true as const, data: parsed.data };
  }
  return {
    ok: false as const,
    response: {
      code: 'INVALID_INPUT' as const,
      error: 'Dados invalidos.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.') || '(root)',
        message: issue.message,
        code: issue.code,
      })),
    },
  };
}
