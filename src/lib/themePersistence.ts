import { getSupabaseClient } from './supabase';
import type { FebracisTheme } from './theme';

/**
 * Grava preferência de tema no perfil Supabase (merge em user_metadata).
 * Chamado apenas em ações explícitas (toggle UI ou atalho), não na hidratação inicial.
 */
export async function pushThemeToProfile(theme: FebracisTheme): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) {
    return;
  }

  const { error } = await client.auth.updateUser({
    data: { theme },
  });

  if (error) {
    console.warn('[febracis-dre] Não foi possível sincronizar tema com o perfil:', error.message);
  }
}
