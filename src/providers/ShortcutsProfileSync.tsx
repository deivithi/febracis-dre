import { useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { writeShortcutsEnabled } from '../lib/shortcutsSettings';

/**
 * Hidrata o toggle de atalhos a partir de `user_metadata.keyboard_shortcuts_enabled` quando existir.
 */
export function ShortcutsProfileSync() {
  const { user, loading } = useAuth();
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

    const raw = user.user_metadata?.keyboard_shortcuts_enabled;
    if (typeof raw === 'boolean') {
      writeShortcutsEnabled(raw);
    }

    hydratedUserId.current = user.id;
  }, [loading, user]);

  return null;
}
