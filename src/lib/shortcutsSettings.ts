import { getSupabaseClient } from './supabase';

export const SHORTCUTS_ENABLED_STORAGE_KEY = 'febracis.shortcuts.enabled';
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'febracis.sidebar.collapsed';

export const SHORTCUTS_ENABLED_CHANGED_EVENT = 'febracis.shortcuts.enabled.changed';

export function readShortcutsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SHORTCUTS_ENABLED_STORAGE_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function writeShortcutsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SHORTCUTS_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(SHORTCUTS_ENABLED_CHANGED_EVENT));
}

export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/**
 * Opcional — mesmo padrão do tema U23: só em acções explícitas do utilizador.
 */
export async function pushShortcutsPreferenceToProfile(enabled: boolean): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) return;

  const { error } = await client.auth.updateUser({
    data: { keyboard_shortcuts_enabled: enabled },
  });

  if (error) {
    console.warn('[febracis-dre] Não foi possível sincronizar atalhos com o perfil:', error.message);
  }
}
