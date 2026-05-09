import { useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseConfig } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const initialClient = getSupabaseClient();
  const [loading, setLoading] = useState(() => initialClient !== null);

  const supabaseMisconfigured = (() => {
    const cfg = getSupabaseConfig();
    if (cfg.ok) {
      return null;
    }
    return { message: cfg.message, hint: cfg.hint };
  })();

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }

    void client.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (supabaseMisconfigured) {
      return { error: new Error(supabaseMisconfigured.message) };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { error: new Error('Cliente Supabase indisponível.') };
    }

    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    queryClient.clear();
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, supabaseMisconfigured, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
