import { useEffect, useLayoutEffect, useRef } from 'react';

export type ShortcutBinding = {
  /** Opcional — útil para depuração */
  id?: string;
  match: (e: KeyboardEvent) => boolean;
  action: () => void;
  /** Por defeito os atalhos ignoram campos de edição. */
  allowInInput?: boolean;
};

export type UseGlobalShortcutsOptions = {
  disabled?: boolean;
  bindings: ShortcutBinding[];
};

export function isTypingTarget(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null;
  const tag = t?.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t?.getAttribute?.('contenteditable') === 'true'
  );
}

/**
 * Um único listener por montagem; passar `bindings` estável via `useMemo`.
 */
export function useGlobalShortcuts(options: UseGlobalShortcutsOptions): void {
  const { disabled = false, bindings } = options;
  const bindingsRef = useRef(bindings);
  useLayoutEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);
      for (const b of bindingsRef.current) {
        if (typing && !b.allowInInput) {
          continue;
        }
        if (b.match(e)) {
          e.preventDefault();
          b.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled]);
}
