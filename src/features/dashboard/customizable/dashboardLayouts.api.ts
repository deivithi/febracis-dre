import { getSupabaseClient } from '../../../lib/supabase';
import type { DashboardLayoutRow, DashboardScopeKey, WidgetConfig } from './dashboardLayout.types';

function mapRow(data: Record<string, unknown>): DashboardLayoutRow | null {
  if (!data?.id || typeof data.user_id !== 'string') {
    return null;
  }
  const widgetsRaw = data.widgets;
  const widgets = Array.isArray(widgetsRaw)
    ? (widgetsRaw as WidgetConfig[])
    : typeof widgetsRaw === 'string'
      ? (JSON.parse(widgetsRaw) as WidgetConfig[])
      : [];
  return {
    id: String(data.id),
    user_id: data.user_id,
    dashboard_scope: data.dashboard_scope as DashboardScopeKey,
    role: typeof data.role === 'string' ? data.role : 'viewer',
    widgets,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : '',
  };
}

export async function fetchDashboardLayout(
  userId: string,
  scope: DashboardScopeKey,
): Promise<DashboardLayoutRow | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data, error } = await client
    .from('dashboard_layouts')
    .select('id,user_id,dashboard_scope,role,widgets,updated_at')
    .eq('user_id', userId)
    .eq('dashboard_scope', scope)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return mapRow(data as Record<string, unknown>);
}

export async function upsertDashboardLayout(params: {
  userId: string;
  scope: DashboardScopeKey;
  roleCode: string;
  widgets: WidgetConfig[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Cliente Supabase indisponível.' };
  }

  const payload = {
    user_id: params.userId,
    dashboard_scope: params.scope,
    role: params.roleCode,
    widgets: params.widgets,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('dashboard_layouts').upsert(payload, {
    onConflict: 'user_id,dashboard_scope',
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
