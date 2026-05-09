import { useEffect, useState } from 'react';
import {
  readShortcutsEnabled,
  SHORTCUTS_ENABLED_CHANGED_EVENT,
} from '../lib/shortcutsSettings';

/** Estado reactivo + sincronização entre separadores e toggles na mesma sessão. */
export function useShortcutsEnabled(): boolean {
  const [enabled, setEnabled] = useState(readShortcutsEnabled);

  useEffect(() => {
    const sync = () => setEnabled(readShortcutsEnabled());
    window.addEventListener(SHORTCUTS_ENABLED_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SHORTCUTS_ENABLED_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return enabled;
}
