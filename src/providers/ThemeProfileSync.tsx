import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { isFebracisTheme } from '../lib/theme';

/**
 * Hidrata tema a partir de `user_metadata.theme` uma vez por sessão de utilizador autenticado.
 * Ordem global: metadados válidos → senão localStorage (next-themes) → sistema.
 */
export function ThemeProfileSync() {
  const { user, loading } = useAuth();
  const { setTheme } = useTheme();
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      hydratedUserId.current = null;
      return;
    }

    if (hydratedUserId.current === user.id) {
      return;
    }

    const raw = user.user_metadata?.theme;
    if (isFebracisTheme(raw)) {
      setTheme(raw);
    }

    hydratedUserId.current = user.id;
  }, [loading, user, setTheme]);

  return null;
}
