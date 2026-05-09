import type { AccessProfile } from '../auth/auth.types';
import type { DerivedHoldingView } from './holdingDerivations';

export type FranchiseMetricTrendRpcFilter = {
  p_region_id: string | null;
  p_franchise_ids: string[] | null;
};

/**
 * Parâmetros alinhados ao escopo do painel e ao cockpit holding (regional / unidade).
 * Quando uma única unidade está selecionada no holding, pedimos todas as franquias da
 * regional para permitir média dos pares no cliente (RLS continua aplicável).
 */
export function buildFranchiseMetricTrendRpcFilters(
  access: AccessProfile,
  holdingDerived: DerivedHoldingView | null,
): FranchiseMetricTrendRpcFilter {
  if (access.dashboardScope === 'franchise') {
    return { p_region_id: null, p_franchise_ids: null };
  }

  if (access.dashboardScope === 'regional') {
    if (access.regionalIds.length === 1) {
      return { p_region_id: access.regionalIds[0] ?? null, p_franchise_ids: null };
    }
    return { p_region_id: null, p_franchise_ids: null };
  }

  if (access.dashboardScope === 'holding') {
    if (!holdingDerived) {
      return { p_region_id: null, p_franchise_ids: null };
    }
    const { effectiveRegionalId, effectiveFranchiseId, filteredRows } = holdingDerived;

    if (effectiveFranchiseId !== 'all') {
      const row = filteredRows.find((r) => r.franchise_id === effectiveFranchiseId);
      const rid =
        row?.regional_id ?? (effectiveRegionalId !== 'all' ? effectiveRegionalId : null);
      return { p_region_id: rid, p_franchise_ids: null };
    }

    if (effectiveRegionalId !== 'all') {
      return { p_region_id: effectiveRegionalId, p_franchise_ids: null };
    }

    return { p_region_id: null, p_franchise_ids: null };
  }

  // controladoria / rede: visível ao JWT; filtros null
  return { p_region_id: null, p_franchise_ids: null };
}
