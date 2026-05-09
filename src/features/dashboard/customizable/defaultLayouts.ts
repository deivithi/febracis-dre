import type { DashboardScope } from '../../auth/auth.types';
import type { RoleCode } from '../../auth/auth.types';
import type { DashboardLayoutPayload, WidgetConfig } from './dashboardLayout.types';

const L = (
  id: string,
  type: WidgetConfig['type'],
  layout: WidgetConfig['layout'],
  props: Record<string, unknown> = {},
): WidgetConfig => ({ id, type, layout, props });

/** Modelo base por papel (primeiro acesso / reset). Escopo ajusta alturas mínimas onde faz sentido. */
const byRole: Record<RoleCode, WidgetConfig[]> = {
  viewer: [
    L('w-kpi', 'kpi', { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 3 }),
    L('w-pend', 'pending-queue', { x: 0, y: 5, w: 12, h: 6, minW: 4, minH: 4 }, { limit: 8 }),
  ],
  franchise_user: [
    L('w-kpi', 'kpi', { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 3 }),
    L('w-sp0', 'sparkline', { x: 0, y: 5, w: 6, h: 4, minW: 3, minH: 3 }, { kpiIndex: 0 }),
    L('w-sp3', 'sparkline', { x: 6, y: 5, w: 6, h: 4, minW: 3, minH: 3 }, { kpiIndex: 3 }),
    L('w-rank', 'ranking', { x: 0, y: 9, w: 12, h: 5, minW: 4, minH: 4 }, { variant: 'top-ebitda', limit: 5 }),
  ],
  regional_manager: [
    L('w-kpi', 'kpi', { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 3 }),
    L('w-trend', 'trend-chart', { x: 0, y: 5, w: 8, h: 8, minW: 6, minH: 6 }, { metric: 'ebitda_2' }),
    L('w-rank', 'ranking', { x: 8, y: 5, w: 4, h: 8, minW: 4, minH: 6 }, { variant: 'top-ebitda', limit: 5 }),
    L('w-pend', 'pending-queue', { x: 0, y: 13, w: 12, h: 8, minW: 6, minH: 6 }),
  ],
  finance_controller: [
    L('w-kpi', 'kpi', { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 3 }),
    L('w-trend', 'trend-chart', { x: 0, y: 5, w: 8, h: 8, minW: 6, minH: 6 }, { metric: 'ebitda_2' }),
    L('w-audit', 'audit-feed', { x: 8, y: 5, w: 4, h: 8, minW: 3, minH: 6 }, { limit: 6 }),
    L('w-pend', 'pending-queue', { x: 0, y: 13, w: 12, h: 8, minW: 6, minH: 6 }),
  ],
  executive: [
    L('w-kpi', 'kpi', { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 3 }),
    L('w-trend', 'trend-chart', { x: 0, y: 5, w: 8, h: 8, minW: 6, minH: 6 }, { metric: 'gross_revenue' }),
    L('w-audit', 'audit-feed', { x: 8, y: 5, w: 4, h: 8, minW: 3, minH: 6 }, { limit: 8 }),
    L('w-rank', 'ranking', { x: 0, y: 13, w: 6, h: 8, minW: 4, minH: 6 }, { variant: 'top-ebitda', limit: 6 }),
    L('w-pend', 'pending-queue', { x: 6, y: 13, w: 6, h: 8, minW: 6, minH: 6 }),
  ],
  system_admin: [
    L('w-kpi', 'kpi', { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 3 }),
    L('w-trend', 'trend-chart', { x: 0, y: 5, w: 8, h: 8, minW: 6, minH: 6 }),
    L('w-audit', 'audit-feed', { x: 8, y: 5, w: 4, h: 8, minW: 3, minH: 6 }, { limit: 10 }),
    L('w-pend', 'pending-queue', { x: 0, y: 13, w: 12, h: 8, minW: 6, minH: 6 }),
  ],
};

export function getDefaultLayoutPayload(
  role: RoleCode,
  _scope: DashboardScope,
): DashboardLayoutPayload {
  void _scope;
  const widgets = byRole[role] ?? byRole.viewer;
  return { widgets: widgets.map((w) => ({ ...w, layout: { ...w.layout } })) };
}

export function cloneDefaultWidgets(role: RoleCode, scope: DashboardScope): WidgetConfig[] {
  const cloned = getDefaultLayoutPayload(role, scope).widgets.map((w) => ({
    ...w,
    layout: { ...w.layout },
    props: { ...w.props },
  }));
  if (scope === 'controladoria') {
    return cloned.filter((w) => w.type !== 'pending-queue');
  }
  return cloned;
}
