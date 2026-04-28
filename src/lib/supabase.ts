import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PUBLIC_SUPABASE_PROJECT_REF = 'vwxgrjjwbvdiaqxqbryk';

export type SupabaseConfigOk = {
  ok: true;
  url: string;
  anonKey: string;
};

export type SupabaseConfigErr = {
  ok: false;
  message: string;
  hint: string;
};

export type SupabaseConfigResult = SupabaseConfigOk | SupabaseConfigErr;

/**
 * Lê VITE_* sem lançar no carregamento do módulo (evita SPA morta antes do React).
 */
export function getSupabaseConfig(): SupabaseConfigResult {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

  if (!url || !anonKey) {
    return {
      ok: false,
      message:
        'Configuração Supabase incompleta: faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY no bundle.',
      hint:
        'No Vercel (Production), defina ambas e faça um novo deploy — variáveis VITE_* são embutidas na hora do build. Project ref canônico: ' +
        PUBLIC_SUPABASE_PROJECT_REF +
        '.',
    };
  }

  return { ok: true, url, anonKey };
}

let cachedClient: SupabaseClient | null = null;

/**
 * Cliente lazy; devolve null se envs não estiverem no bundle.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.ok) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return cachedClient;
}

function missingConfigError(): Error {
  const cfg = getSupabaseConfig();
  if (!cfg.ok) {
    return new Error(`${cfg.message} ${cfg.hint}`);
  }
  return new Error('Cliente Supabase indisponível.');
}

/**
 * Proxy para código legado que importa `supabase` diretamente.
 * O primeiro acesso a uma propriedade/método falha com mensagem clara se o bundle não tiver VITE_*.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      throw missingConfigError();
    }
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
}) as SupabaseClient;
