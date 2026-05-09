import type { AccessProfile } from '../../auth/auth.types';
import type { DerivedHoldingView } from '../holdingDerivations';

/** Corpo POST `/api/dre-insights` — espelha `api/lib/insightsSchemas.ts`. */
export type DreInsightsScope = {
  kind: 'franchise' | 'regional' | 'network';
  franchiseId?: string;
  regionalId?: string;
};

export type DreInsightsRequest = {
  scope: DreInsightsScope;
  period_range?: { start: string; end: string };
  periods_count?: number;
};

export type InsightSeverity = 'info' | 'warning' | 'critical';

export type InsightType = 'anomaly' | 'trend' | 'opportunity' | 'risk';

export type DreInsightCard = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggested_action: string | null;
};

export type DreInsightsApiResponse = {
  ok: boolean;
  insights: DreInsightCard[];
  cached: boolean;
  generated_at: string;
  ttl_ms: number;
  scope?: unknown;
  latency_ms?: number;
};

export function buildDreInsightsRequest(
  profile: AccessProfile,
  holdingDerived: DerivedHoldingView | null,
): DreInsightsRequest {
  const periods_count = 6;

  if (profile.dashboardScope === 'franchise') {
    const franchiseId = profile.franchiseIds[0];
    return {
      scope: franchiseId
        ? { kind: 'franchise', franchiseId }
        : { kind: 'franchise' },
      periods_count,
    };
  }

  if (profile.dashboardScope === 'regional') {
    const regionalId = profile.regionalIds[0];
    return {
      scope: regionalId ? { kind: 'regional', regionalId } : { kind: 'regional' },
      periods_count,
    };
  }

  if (profile.dashboardScope === 'holding' || profile.dashboardScope === 'controladoria') {
    const regionalId =
      holdingDerived && holdingDerived.effectiveRegionalId !== 'all'
        ? holdingDerived.effectiveRegionalId
        : undefined;
    const franchiseId =
      holdingDerived && holdingDerived.effectiveFranchiseId !== 'all'
        ? holdingDerived.effectiveFranchiseId
        : undefined;
    return {
      scope: {
        kind: 'network',
        ...(regionalId ? { regionalId } : {}),
        ...(franchiseId ? { franchiseId } : {}),
      },
      periods_count,
    };
  }

  return { scope: { kind: 'network' }, periods_count };
}

export async function fetchDreInsights(accessToken: string, body: DreInsightsRequest): Promise<DreInsightsApiResponse> {
  const res = await fetch('/api/dre-insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const err =
      typeof json.error === 'string' ? json.error : 'Não foi possível carregar os insights agora.';
    throw new Error(err);
  }

  return json as DreInsightsApiResponse;
}
