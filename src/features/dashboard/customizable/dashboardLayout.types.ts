import type { DashboardScope } from '../../auth/auth.types';
import type { RoleCode } from '../../auth/auth.types';

export type WidgetType =
  | 'kpi'
  | 'sparkline'
  | 'ranking'
  | 'trend-chart'
  | 'pending-queue'
  | 'audit-feed';

export interface WidgetLayoutRgl {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

/** Configuração persistida por widget (props mínimas para caber no JSON). */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  layout: WidgetLayoutRgl;
  props: Record<string, unknown>;
}

export interface DashboardLayoutPayload {
  widgets: WidgetConfig[];
}

export type DashboardScopeKey = DashboardScope;

/** Linha em `dashboard_layouts`. */
export interface DashboardLayoutRow {
  id: string;
  user_id: string;
  dashboard_scope: DashboardScopeKey;
  role: string;
  widgets: WidgetConfig[];
  updated_at: string;
}

export function normalizeRoleCode(role: RoleCode | string | null | undefined): RoleCode {
  const allowed: RoleCode[] = [
    'viewer',
    'franchise_user',
    'regional_manager',
    'finance_controller',
    'executive',
    'system_admin',
  ];
  const raw = String(role ?? 'viewer');
  return (allowed.includes(raw as RoleCode) ? raw : 'viewer') as RoleCode;
}
