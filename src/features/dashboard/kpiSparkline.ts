import type { AccessProfile } from '../auth/auth.types';
import type { DashboardSnapshot } from '../shared/portal.types';
import type { DerivedHoldingView } from './holdingDerivations';
import type { ExecutiveKpiSparklinePlan } from './ExecutiveKpiGrid';

/** Indica se o RPC `get_kpi_history` faz sentido para o plano + snapshot actual. */
export function isKpiSparklineRpcEnabled(
  profile: AccessProfile,
  plan: ExecutiveKpiSparklinePlan | null,
  snapshot: DashboardSnapshot,
  holdingDerived: DerivedHoldingView | null,
): boolean {
  if (!plan) {
    return false;
  }
  if (profile.dashboardScope === 'franchise') {
    return plan.franchiseId != null;
  }
  if (profile.dashboardScope === 'regional') {
    return plan.regionalId != null && snapshot.latestRegional != null;
  }
  if (profile.dashboardScope === 'holding') {
    return holdingDerived != null && snapshot.latestNetwork != null;
  }
  if (profile.dashboardScope === 'controladoria') {
    return snapshot.latestNetwork != null;
  }
  return false;
}
