import { getSupabaseClient } from '../../lib/supabase';

/**
 * Regista exportação via RPC security definer (migration 017).
 * Falhas não bloqueiam o download — apenas consola.
 */
export async function logExportAudit(reportType: string, filters: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc('log_export_audit', {
    p_report_type: reportType,
    p_filters: filters as never,
  });

  if (error) {
    console.warn('[febracis-dre] log_export_audit:', error.message);
  }
}
