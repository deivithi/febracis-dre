import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { BreadcrumbSegment } from '../components/layout/Breadcrumb';

/**
 * Helpers para navegação “pai” (U12).
 *
 * **Integração principal:** `Escape` / `Backspace` tratados num único `keydown` global em
 * `useAppShortcutController` (binding `breadcrumb-parent`), com ordem antes do Escape que fecha paleta/ajuda.
 *
 * O hook `useEscapeBackNavigation` abaixo é opcional para páginas fora desse controlador — não combinar os dois.
 */

export type EscapeBackNavigationOptions = {
  segments: BreadcrumbSegment[];
  enabled?: boolean;
  navigate: NavigateFunction;
};

function isTypingTarget(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null;
  const tag = t?.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t?.getAttribute?.('contenteditable') === 'true'
  );
}

/** Radix overlays — não roubar Escape / Backspace ao navegar para o pai. */
export function isGlobalModalOpen(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const radixDialog = document.querySelector('[data-radix-dialog-content][data-state="open"]');
  if (radixDialog) {
    return true;
  }

  const dialogOpen = document.querySelector('[role="dialog"][data-state="open"]');
  if (dialogOpen) {
    return true;
  }

  if (document.querySelector('[data-radix-select-content][data-state="open"]')) {
    return true;
  }
  if (document.querySelector('[data-radix-dropdown-menu-content][data-state="open"]')) {
    return true;
  }
  if (document.querySelector('[data-radix-popover-content][data-state="open"]')) {
    return true;
  }

  if (document.body.getAttribute('data-scroll-locked') === '1') {
    return true;
  }

  return false;
}

/**
 * U12 — Voltar ao segmento pai com Escape ou Backspace.
 * `preventDefault` em Backspace só quando a navegação é aplicada (evita histórico indesejado do browser).
 */
export function useEscapeBackNavigation(options: EscapeBackNavigationOptions): void {
  const { segments, enabled = true, navigate } = options;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Backspace') {
        return;
      }
      if (isTypingTarget(e.target)) {
        return;
      }
      if (isGlobalModalOpen()) {
        return;
      }
      if (segments.length < 2) {
        return;
      }

      const parent = segments[segments.length - 2];
      if (parent?.href) {
        if (e.key === 'Backspace') {
          e.preventDefault();
        }
        navigate(parent.href);
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
      }
      navigate(-1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, navigate, segments]);
}
