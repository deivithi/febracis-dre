import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { BreadcrumbSegment } from '../components/layout/Breadcrumb';
import type { RoleCode } from '../features/auth/auth.types';
import { dispatchClearSubmissionFocus } from '../lib/commandPaletteBridge';
import {
  SHORTCUT_AUDIT_FOCUS_SEARCH,
  SHORTCUT_AUDIT_TOGGLE_PALETTE,
  SHORTCUT_SUBMISSION_SAVE_DRAFT,
  SHORTCUT_SUBMISSION_SUBMIT,
  SHORTCUT_WORKFLOW_APPROVE,
  SHORTCUT_WORKFLOW_RETURN,
} from '../lib/shortcutEvents';
import { writeSidebarCollapsed } from '../lib/shortcutsSettings';
import { isGlobalModalOpen } from './useEscapeBack';
import { useGlobalShortcuts, isTypingTarget } from './useGlobalShortcuts';

export type AppShortcutControllerParams = {
  disabled: boolean;
  pathname: string;
  navigate: NavigateFunction;
  roleCodes: RoleCode[];
  canOperateSubmission: boolean;
  canManageReview: boolean;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  keyboardHelpOpen: boolean;
  setKeyboardHelpOpen: (open: boolean) => void;
  onCycleResolvedTheme: () => void;
  setSidebarCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  /** U12 — segmentos do breadcrumb contextual (Escape / Backspace → pai). */
  breadcrumbSegments: BreadcrumbSegment[];
};

export function useAppShortcutController(p: AppShortcutControllerParams): void {
  const paletteRef = useRef(p.commandPaletteOpen);
  const helpRef = useRef(p.keyboardHelpOpen);
  const crumbRef = useRef(p.breadcrumbSegments);
  useLayoutEffect(() => {
    paletteRef.current = p.commandPaletteOpen;
    helpRef.current = p.keyboardHelpOpen;
    crumbRef.current = p.breadcrumbSegments;
  }, [p.commandPaletteOpen, p.keyboardHelpOpen, p.breadcrumbSegments]);

  const bindings = useMemo(
    () =>
      [
        {
          id: 'palette',
          match: (e: KeyboardEvent) =>
            (e.metaKey || e.ctrlKey) && (e.key === '/' || e.code === 'Slash'),
          action: () => p.setCommandPaletteOpen(true),
        },
        {
          id: 'theme',
          match: (e: KeyboardEvent) =>
            (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'l' || e.key === 'L'),
          action: () => p.onCycleResolvedTheme(),
        },
        {
          id: 'help',
          match: (e: KeyboardEvent) =>
            e.key === '?' || (e.shiftKey && e.code === 'Slash'),
          action: () => p.setKeyboardHelpOpen(true),
        },
        {
          id: 'sidebar',
          match: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B'),
          action: () =>
            p.setSidebarCollapsed((prev) => {
              const next = !prev;
              writeSidebarCollapsed(next);
              return next;
            }),
        },
        {
          id: 'breadcrumb-parent',
          match: (e: KeyboardEvent) => {
            if (e.key !== 'Escape' && e.key !== 'Backspace') return false;
            if (paletteRef.current || helpRef.current) return false;
            const segs = crumbRef.current;
            if (segs.length < 2) return false;
            if (isGlobalModalOpen()) return false;
            return true;
          },
          action: () => {
            const segs = crumbRef.current;
            const parent = segs[segs.length - 2];
            if (parent?.href) {
              p.navigate(parent.href);
              return;
            }
            p.navigate(-1);
          },
        },
        {
          id: 'escape',
          match: (e: KeyboardEvent) =>
            e.key === 'Escape' && (paletteRef.current || helpRef.current),
          action: () => {
            if (paletteRef.current) {
              p.setCommandPaletteOpen(false);
            }
            if (helpRef.current) {
              p.setKeyboardHelpOpen(false);
            }
          },
        },
        ...(p.pathname.startsWith('/app/audit')
          ? ([
              {
                id: 'audit-slash',
                match: (e: KeyboardEvent) =>
                  e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey,
                action: () => window.dispatchEvent(new CustomEvent(SHORTCUT_AUDIT_FOCUS_SEARCH)),
              },
              {
                id: 'audit-mod-k',
                match: (e: KeyboardEvent) =>
                  (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K'),
                action: () => window.dispatchEvent(new CustomEvent(SHORTCUT_AUDIT_TOGGLE_PALETTE)),
              },
            ] as const)
          : []),
        ...(p.pathname.startsWith('/app/submissions') && p.canOperateSubmission
          ? ([
              {
                id: 'save-draft',
                match: (e: KeyboardEvent) =>
                  (e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S'),
                action: () => window.dispatchEvent(new CustomEvent(SHORTCUT_SUBMISSION_SAVE_DRAFT)),
              },
              {
                id: 'submit',
                match: (e: KeyboardEvent) =>
                  (e.metaKey || e.ctrlKey) && e.key === 'Enter',
                action: () => window.dispatchEvent(new CustomEvent(SHORTCUT_SUBMISSION_SUBMIT)),
              },
            ] as const)
          : []),
        ...(p.pathname.startsWith('/app/workflow') && p.canManageReview
          ? ([
              {
                id: 'wf-e',
                match: (e: KeyboardEvent) =>
                  !e.metaKey &&
                  !e.ctrlKey &&
                  !e.altKey &&
                  (e.key === 'e' || e.key === 'E'),
                action: () => window.dispatchEvent(new CustomEvent(SHORTCUT_WORKFLOW_APPROVE)),
              },
              {
                id: 'wf-r',
                match: (e: KeyboardEvent) =>
                  !e.metaKey &&
                  !e.ctrlKey &&
                  !e.altKey &&
                  (e.key === 'r' || e.key === 'R'),
                action: () => window.dispatchEvent(new CustomEvent(SHORTCUT_WORKFLOW_RETURN)),
              },
            ] as const)
          : []),
        ...(p.canOperateSubmission
          ? ([
              {
                id: 'new-submission',
                match: (e: KeyboardEvent) =>
                  !e.metaKey &&
                  !e.ctrlKey &&
                  !e.altKey &&
                  (e.key === 'n' || e.key === 'N'),
                action: () => {
                  dispatchClearSubmissionFocus();
                  p.navigate('/app/submissions');
                },
              },
            ] as const)
          : []),
        ...(p.canManageReview
          ? ([
              {
                id: 'batch-a',
                match: (e: KeyboardEvent) =>
                  (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'a' || e.key === 'A'),
                action: () => p.navigate('/app/workflow'),
              },
              {
                id: 'batch-r',
                match: (e: KeyboardEvent) =>
                  (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'r' || e.key === 'R'),
                action: () => p.navigate('/app/workflow'),
              },
            ] as const)
          : []),
      ] as const,
    [p],
  );

  useGlobalShortcuts({
    disabled: p.disabled,
    bindings: [...bindings],
  });

  /* Sequências tipo Gmail — G → D/S/A/U */
  useEffect(() => {
    if (p.disabled || typeof window === 'undefined') return;

    let seq: 'g' | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const reset = () => {
      seq = null;
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        reset();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        reset();
        return;
      }

      const k = e.key.toLowerCase();

      if (k === 'g') {
        seq = 'g';
        if (timer) clearTimeout(timer);
        timer = setTimeout(reset, 1000);
        e.preventDefault();
        return;
      }

      if (seq === 'g') {
        reset();
        if (k === 'd') {
          e.preventDefault();
          p.navigate('/app/dashboard');
          return;
        }
        if (k === 's') {
          e.preventDefault();
          p.navigate('/app/submissions');
          return;
        }
        if (k === 'a') {
          e.preventDefault();
          if (p.canManageReview) {
            p.navigate('/app/workflow');
          }
          return;
        }
        if (k === 'u') {
          e.preventDefault();
          const allowed =
            p.roleCodes.includes('finance_controller') ||
            p.roleCodes.includes('executive') ||
            p.roleCodes.includes('system_admin');
          if (allowed) {
            p.navigate('/app/audit');
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      reset();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [p.disabled, p.navigate, p.canManageReview, p.roleCodes]);
}
