import { createHash } from 'node:crypto';

import type { KpiHistoryPoint } from '../../src/features/shared/portal.types.js';

export type InsightType = 'anomaly' | 'trend' | 'opportunity' | 'risk';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export type InsightCard = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggested_action: string | null;
};

export function stableInsightId(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 18);
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const x = Number.parseFloat(String(v));
  return Number.isFinite(x) ? x : 0;
}

/** Regressão linear simples y ≈ a + b x (mínimos quadrados). */
export function linearRegression(xs: number[], ys: number[]): { intercept: number; slope: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) {
    return { intercept: ys[0] ?? 0, slope: 0 };
  }
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i]!;
    const y = ys[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) {
    return { intercept: sumY / n, slope: 0 };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { intercept, slope };
}

function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  if (v.length % 2 === 1) return v[m]!;
  return (v[m - 1]! + v[m]!) / 2;
}

export type BuildInsightsInput = {
  scopeKind: 'franchise' | 'regional' | 'network';
  ebitdaHistory: KpiHistoryPoint[];
  /** Margem % EBITDA 2 da unidade (última competência da série). */
  franchiseEbitda2MarginPct?: number | null;
  /** Margens % EBITDA 2 das outras unidades da mesma regional na mesma competência (aprovado). */
  peerEbitda2MarginsPct?: number[];
  franchiseName?: string | null;
  regionalName?: string | null;
  pipelineHistory?: KpiHistoryPoint[];
  approvedCountHistory?: KpiHistoryPoint[];
};

export function buildDeterministicInsights(input: BuildInsightsInput): InsightCard[] {
  const cards: InsightCard[] = [];
  const series = input.ebitdaHistory.map((p) => ({
    label: p.period_label,
    value: num(p.value),
  }));

  if (series.length < 2) {
    const id = `ins-${stableInsightId(['insufficient', input.scopeKind])}`;
    cards.push({
      id,
      type: 'trend',
      severity: 'info',
      title: 'Histórico ainda curto para tendências',
      description:
        'Com menos de duas competências com EBITDA 2 aprovado no recorte, os alertas de tendência e projeção ficam limitados. Quando novos fechamentos entrarem, este painel ganha comparações automáticas.',
      evidence: {
        rule: 'INSUFFICIENT_SERIES',
        scope_kind: input.scopeKind,
        points: series.length,
        data_source: 'get_kpi_history',
        metric: 'ebitda_2',
        submission_filter: 'approved_only',
      },
      suggested_action: 'Aguarde novos períodos com DRE aprovada ou confira a competência atual nos KPIs abaixo.',
    });
    return cards;
  }

  const ys = series.map((s) => s.value);
  const xs = series.map((_, i) => i);
  const { slope, intercept } = linearRegression(xs, ys);
  const lastY = ys[ys.length - 1]!;
  const prevY = ys.length >= 2 ? ys[ys.length - 2]! : lastY;
  const nextProjected = intercept + slope * series.length;
  const deltaMoM = lastY - prevY;

  const lastLabel = series[series.length - 1]!.label;

  const trendCritical = slope < 0 && Math.abs(slope) * series.length > Math.max(lastY * 0.05, 1);
  const trendId = `ins-${stableInsightId(['ebitda_trend', lastLabel, slope.toFixed(4)])}`;
  cards.push({
    id: trendId,
    type: trendCritical ? 'risk' : slope > 0 ? 'opportunity' : 'trend',
    severity: trendCritical ? 'warning' : slope > 0 ? 'info' : 'info',
    title: trendCritical
      ? 'Pressão na trajetória do EBITDA 2 aprovado'
      : slope > 0
        ? 'Trajetória de EBITDA 2 aprovado em recuperação'
        : 'Trajetória estável no EBITDA 2 aprovado',
    description: trendCritical
      ? `Nos últimos ${series.length} fechamentos, a reta de tendência do EBITDA 2 (somente aprovado) inclina negativa. Último valor: ${lastY.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} na competência ${lastLabel}.`
      : slope > 0
        ? `O ajuste linear dos últimos ${series.length} pontos aponta melhora no EBITDA 2 aprovado. Último valor: ${lastY.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${lastLabel}).`
        : `O EBITDA 2 aprovado oscila sem tendência forte nos últimos ${series.length} fechamentos. Último: ${lastY.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${lastLabel}).`,
    evidence: {
      metric: 'ebitda_2',
      submission_filter: 'approved_only',
      regression: { slope, intercept, points_used: series.length },
      last_period_label: lastLabel,
      last_value_brl: lastY,
      projected_next_index_brl: nextProjected,
      method: 'ordinary_least_squares',
    },
    suggested_action: trendCritical
      ? 'Priorize revisão de custos e receita recorrente na competência atual; use “Investigar” para cruzar com o cockpit.'
      : 'Mantenha o ritmo de envio e revisão; compare com a mediana regional quando aplicável.',
  });

  const deviationFromTrend = lastY - nextProjected;
  const anomalyThreshold = Math.max(Math.abs(lastY) * 0.08, 5000);
  if (Math.abs(deviationFromTrend) > anomalyThreshold && series.length >= 3) {
    const id = `ins-${stableInsightId(['anomaly_trend', lastLabel, deviationFromTrend.toFixed(0)])}`;
    cards.push({
      id,
      type: 'anomaly',
      severity: Math.abs(deviationFromTrend) > anomalyThreshold * 1.5 ? 'warning' : 'info',
      title: 'Desvio em relação à tendência recente',
      description: `O último EBITDA 2 aprovado (${lastY.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) destoa da projeção pela regressão dos pontos anteriores (~${nextProjected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`,
      evidence: {
        metric: 'ebitda_2',
        submission_filter: 'approved_only',
        last_period_label: lastLabel,
        last_value_brl: lastY,
        projected_from_regression_brl: nextProjected,
        deviation_brl: deviationFromTrend,
      },
      suggested_action: 'Valide lançamentos e recálculos da DRE aprovada nessa competência; confira MC1/MC2 na mesma janela.',
    });
  }

  const momPct = prevY !== 0 ? (deltaMoM / Math.abs(prevY)) * 100 : 0;
  if (Math.abs(momPct) >= 12 && series.length >= 2) {
    const id = `ins-${stableInsightId(['mom_swing', lastLabel, momPct.toFixed(1)])}`;
    cards.push({
      id,
      type: 'anomaly',
      severity: Math.abs(momPct) >= 25 ? 'warning' : 'info',
      title: deltaMoM < 0 ? 'Queda expressiva mês a mês' : 'Salto expressivo mês a mês',
      description: `Entre competências consecutivas, o EBITDA 2 aprovado ${deltaMoM < 0 ? 'reduziu' : 'aumentou'} cerca de ${Math.abs(momPct).toFixed(1)}% (valores oficiais apenas com status aprovado).`,
      evidence: {
        metric: 'ebitda_2',
        submission_filter: 'approved_only',
        period_current: lastLabel,
        period_previous: series[series.length - 2]!.label,
        change_brl: deltaMoM,
        change_pct: momPct,
      },
      suggested_action: 'Compare notas e versões da submissão entre competências; investigue linhas de custo variável.',
    });
  }

  const franchiseMargin = input.franchiseEbitda2MarginPct;
  const peers = input.peerEbitda2MarginsPct ?? [];
  if (
    input.scopeKind === 'franchise' &&
    franchiseMargin !== null &&
    franchiseMargin !== undefined &&
    peers.length >= 2
  ) {
    const medPeers = median(peers);
    if (medPeers !== null && franchiseMargin < medPeers - 1.5) {
      const id = `ins-${stableInsightId(['margin_vs_regional', lastLabel, String(franchiseMargin)])}`;
      cards.push({
        id,
        type: 'opportunity',
        severity: franchiseMargin < medPeers - 3 ? 'warning' : 'info',
        title: 'Margem EBITDA 2 abaixo da mediana regional',
        description: `A margem EBITDA 2 da unidade (${franchiseMargin.toFixed(1)}% nas DREs aprovadas na competência ${lastLabel}) está abaixo da mediana das demais unidades da regional (${medPeers.toFixed(1)}%).${input.regionalName ? ` Regional: ${input.regionalName}.` : ''}`,
        evidence: {
          metric: 'ebitda2_pct',
          submission_filter: 'approved_only',
          period_label: lastLabel,
          franchise_margin_pct: franchiseMargin,
          regional_peer_median_pct: medPeers,
          peer_count: peers.length,
          franchise_name: input.franchiseName ?? null,
        },
        suggested_action:
          'Revise estrutura de custos fixos e marketing comparando com unidades vizinhas da mesma regional.',
      });
    }
  }

  if (input.pipelineHistory && input.approvedCountHistory && input.pipelineHistory.length >= 2) {
    const lastP = num(input.pipelineHistory[input.pipelineHistory.length - 1]?.value);
    const lastA = num(input.approvedCountHistory[input.approvedCountHistory.length - 1]?.value);
    if (lastP > lastA && lastA >= 0) {
      const id = `ins-${stableInsightId(['pipeline', lastLabel, String(lastP), String(lastA)])}`;
      cards.push({
        id,
        type: 'risk',
        severity: lastP > lastA * 1.4 ? 'warning' : 'info',
        title: 'Funil de revisão pressionado na rede visível',
        description: `Há mais unidades em revisão/ajuste (${lastP}) do que aprovadas (${lastA}) na competência mais recente do recorte — contagem distinta por franquia (status oficial).`,
        evidence: {
          adjustment_pipeline_count: lastP,
          approved_submission_count: lastA,
          period_label: lastLabel,
          submission_status_pipeline: ['submitted', 'under_review', 'pending_adjustment'],
          submission_status_approved: 'approved',
        },
        suggested_action: 'Priorize fila de controladoria e respostas às unidades com maior tempo em ajuste.',
      });
    }
  }

  return dedupeById(cards).slice(0, 8);
}

function dedupeById(cards: InsightCard[]): InsightCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
