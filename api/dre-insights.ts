import { createHash } from 'node:crypto';

import type { KpiHistoryPoint } from '../src/features/shared/portal.types.js';
import {
  bootstrapInsightsContext,
  resolveEffectiveInsightsScope,
  type EffectiveInsightsScope,
} from './lib/insightsAccess.js';
import { parseDreAgentAuthorizationHeader } from './lib/dreAgentSchemas.js';
import {
  buildDeterministicInsights,
  type InsightCard,
} from './lib/insightsEngine.js';
import {
  dreInsightsBodyParseResultForResponse,
  type DreInsightsRequestBody,
} from './lib/insightsSchemas.js';
import { logContext, logJson } from './lib/log.js';

export const config = {
  maxDuration: 60,
};

export const DRE_INSIGHTS_ROUTE = '/api/dre-insights';
const INSIGHTS_TTL_MS = 4 * 60 * 60 * 1000;

/** V1: narrativa 100% determinística (`insightsEngine`). LLM opcional não está ativo — ver README. */

interface InsightsApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface InsightsApiResponse {
  status: (code: number) => { json: (body: unknown) => unknown };
}

function jsonResponse(res: InsightsApiResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

function computeScopeHash(body: DreInsightsRequestBody, effective: EffectiveInsightsScope) {
  const payload = {
    effective,
    period_range: body.period_range ?? null,
    periods_count: body.periods_count ?? 6,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function asKpiHistory(data: unknown): KpiHistoryPoint[] {
  if (!Array.isArray(data)) return [];
  return data as KpiHistoryPoint[];
}

export default async function handler(req: InsightsApiRequest, res: InsightsApiResponse) {
  const ctx = logContext(DRE_INSIGHTS_ROUTE, req.headers);

  if (req.method !== 'POST') {
    logJson({ ...ctx, level: 'warn', msg: 'method_not_allowed', event: 'request_rejected', httpStatus: 405 });
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  const authGate = parseDreAgentAuthorizationHeader(req.headers.authorization);
  if (!authGate.ok) {
    logJson({
      ...ctx,
      level: 'warn',
      msg: 'auth_validation_failed',
      event: 'validation_failed',
      httpStatus: authGate.httpStatus,
      errorCode: authGate.response.code,
    });
    return jsonResponse(res, authGate.httpStatus, authGate.response);
  }
  const authorization = authGate.authorization;

  const bodyGate = dreInsightsBodyParseResultForResponse(req.body);
  if (!bodyGate.ok) {
    logJson({
      ...ctx,
      level: 'warn',
      msg: 'body_validation_failed',
      event: 'validation_failed',
      httpStatus: 400,
      errorCode: bodyGate.response.code,
    });
    return jsonResponse(res, 400, bodyGate.response);
  }

  try {
    const { supabase, userId, profile } = await bootstrapInsightsContext(authorization);
    const effective = resolveEffectiveInsightsScope(profile, bodyGate.data);
    const scopeHash = computeScopeHash(bodyGate.data, effective);

    const { data: cacheRow, error: cacheReadErr } = await supabase
      .from('dre_insight_cache')
      .select('insights, generated_at')
      .eq('user_id', userId)
      .eq('scope_hash', scopeHash)
      .maybeSingle();

    if (cacheReadErr) {
      logJson({
        ...ctx,
        level: 'warn',
        msg: 'insight_cache_read_failed',
        event: 'supabase_error',
        detail: cacheReadErr.message,
      });
    } else if (cacheRow?.generated_at && cacheRow.insights) {
      const ageMs = Date.now() - new Date(String(cacheRow.generated_at)).getTime();
      if (ageMs >= 0 && ageMs < INSIGHTS_TTL_MS) {
        logJson({ ...ctx, level: 'info', msg: 'dre_insights_cache_hit', event: 'insights_ok', ageMs });
        return jsonResponse(res, 200, {
          ok: true,
          insights: cacheRow.insights as InsightCard[],
          cached: true,
          generated_at: cacheRow.generated_at,
          ttl_ms: INSIGHTS_TTL_MS,
          scope: effective,
        });
      }
    }

    const periodsCount = bodyGate.data.periods_count ?? 6;
    const t0 = Date.now();

    const { data: ebitdaRpc, error: ebitdaErr } = await supabase.rpc('get_kpi_history', {
      p_franchise_id: effective.rpcFranchiseId,
      p_metric: 'ebitda_2',
      p_periods_count: periodsCount,
      p_regional_id: effective.rpcRegionalId,
    });

    if (ebitdaErr) {
      logJson({
        ...ctx,
        level: 'error',
        msg: 'get_kpi_history_failed',
        event: 'supabase_error',
        detail: ebitdaErr.message,
      });
      return jsonResponse(res, 500, { error: 'Falha ao carregar serie de KPI.', code: 'KPI_HISTORY_ERROR' });
    }

    const ebitdaHistory = asKpiHistory(ebitdaRpc);

    let pipelineHistory: KpiHistoryPoint[] | undefined;
    let approvedCountHistory: KpiHistoryPoint[] | undefined;
    let insightsPartial = false;

    if (effective.scopeKind !== 'franchise') {
      const [pipe, appr] = await Promise.all([
        supabase.rpc('get_kpi_history', {
          p_franchise_id: effective.rpcFranchiseId,
          p_metric: 'adjustment_pipeline_count',
          p_periods_count: periodsCount,
          p_regional_id: effective.rpcRegionalId,
        }),
        supabase.rpc('get_kpi_history', {
          p_franchise_id: effective.rpcFranchiseId,
          p_metric: 'approved_submission_count',
          p_periods_count: periodsCount,
          p_regional_id: effective.rpcRegionalId,
        }),
      ]);
      if (pipe.error) {
        insightsPartial = true;
        logJson({
          ...ctx,
          level: 'warn',
          msg: 'kpi_history_partial',
          event: 'kpi_history_partial',
          series: 'adjustment_pipeline_count',
          detail: pipe.error.message,
        });
      } else {
        pipelineHistory = asKpiHistory(pipe.data);
      }
      if (appr.error) {
        insightsPartial = true;
        logJson({
          ...ctx,
          level: 'warn',
          msg: 'kpi_history_partial',
          event: 'kpi_history_partial',
          series: 'approved_submission_count',
          detail: appr.error.message,
        });
      } else {
        approvedCountHistory = asKpiHistory(appr.data);
      }
    }

    let franchiseEbitda2MarginPct: number | null = null;
    let peerEbitda2MarginsPct: number[] = [];
    let franchiseName: string | null = null;
    let regionalName: string | null = null;

    if (effective.rpcFranchiseId && ebitdaHistory.length > 0) {
      const lastLabel = ebitdaHistory[ebitdaHistory.length - 1]!.period_label;
      const { data: selfRow } = await supabase
        .from('vw_franchise_dashboard')
        .select('ebitda2_pct, regional_id, regional_name, franchise_name')
        .eq('franchise_id', effective.rpcFranchiseId)
        .eq('period_label', lastLabel)
        .eq('submission_status', 'approved')
        .maybeSingle();

      if (selfRow?.regional_id) {
        const m = Number(selfRow.ebitda2_pct);
        franchiseEbitda2MarginPct = Number.isFinite(m) ? m : null;
        franchiseName = typeof selfRow.franchise_name === 'string' ? selfRow.franchise_name : null;
        regionalName = typeof selfRow.regional_name === 'string' ? selfRow.regional_name : null;

        const { data: peerRows } = await supabase
          .from('vw_franchise_dashboard')
          .select('ebitda2_pct')
          .eq('period_label', lastLabel)
          .eq('regional_id', selfRow.regional_id)
          .eq('submission_status', 'approved')
          .neq('franchise_id', effective.rpcFranchiseId);

        peerEbitda2MarginsPct = (peerRows ?? [])
          .map((r) => Number(r.ebitda2_pct))
          .filter((n) => Number.isFinite(n));
      }
    }

    const insightsRaw = buildDeterministicInsights({
      scopeKind: effective.scopeKind,
      ebitdaHistory,
      franchiseEbitda2MarginPct,
      peerEbitda2MarginsPct,
      franchiseName,
      regionalName,
      pipelineHistory,
      approvedCountHistory,
    });

    const insights = insightsRaw.map((card) => ({
      ...card,
      evidence: {
        ...card.evidence,
        franchise_id: effective.rpcFranchiseId ?? effective.targetFranchiseId,
        regional_id:
          effective.rpcRegionalId ?? effective.targetRegionalId ?? card.evidence.regional_id ?? null,
        scope_kind: effective.scopeKind,
      },
    }));

    const generatedAt = new Date().toISOString();

    const { error: upsertErr } = await supabase.from('dre_insight_cache').upsert(
      {
        user_id: userId,
        scope_hash: scopeHash,
        insights,
        generated_at: generatedAt,
      },
      { onConflict: 'user_id,scope_hash' },
    );

    if (upsertErr) {
      logJson({
        ...ctx,
        level: 'warn',
        msg: 'insight_cache_upsert_failed',
        event: 'cache_write_skipped',
      });
    }

    const latencyMs = Date.now() - t0;
    logJson({
      ...ctx,
      level: 'info',
      msg: 'dre_insights_compute_ok',
      event: 'insights_ok',
      latencyMs,
      cardCount: insights.length,
    });

    return jsonResponse(res, 200, {
      ok: true,
      insights,
      cached: false,
      generated_at: generatedAt,
      ttl_ms: INSIGHTS_TTL_MS,
      scope: effective,
      latency_ms: latencyMs,
      partial: insightsPartial,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'unauthenticated') {
      return jsonResponse(res, 401, { error: 'Nao autenticado.', code: 'UNAUTHENTICATED' });
    }
    if (msg === 'supabase_env_missing') {
      return jsonResponse(res, 500, { error: 'Servidor nao configurado.', code: 'SUPABASE_CONFIG' });
    }
    if (msg === 'franchise_scope_forbidden' || msg === 'regional_scope_forbidden') {
      return jsonResponse(res, 403, { error: 'Escopo nao permitido.', code: 'SCOPE_FORBIDDEN' });
    }

    logJson({
      ...ctx,
      level: 'error',
      msg: 'dre_insights_error',
      event: 'insights_error',
      detail: msg,
    });

    return jsonResponse(res, 500, { error: 'Erro interno.', code: 'INTERNAL' });
  }
}
