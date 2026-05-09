/** Chave alinhada a next-themes `storageKey` e Supabase `user_metadata.theme`. */
export const FEBRACIS_THEME_STORAGE_KEY = 'febracis.theme';

export type FebracisTheme = 'light' | 'dark' | 'system';

export function isFebracisTheme(value: unknown): value is FebracisTheme {
  return value === 'light' || value === 'dark' || value === 'system';
}
