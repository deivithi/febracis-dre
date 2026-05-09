import { type RefObject, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { PendingReviewRow } from '../shared/portal.types';

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

/** Só `/app/workflow` — não interfere na Auditoria (Ctrl+K / paleta ⌘/). */
export function isApprovalsRoute(pathname: string): boolean {
  return pathname === '/app/workflow' || pathname.endsWith('/app/workflow');
}

export type UseApprovalQueueHotkeysOptions = {
  enabled: boolean;
  /** Submissão atualmente em foco para aprovar/devolver (null se a fila visível estiver vazia). */
  activeSubmissionId: string | null;
  sortedVisibleRows: PendingReviewRow[];
  selectedSubmissionId: string | null;
  setSelectedSubmissionId: (id: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  reviewReason: string;
  onApprove: () => void;
  onRequestAdjustment: () => void;
  isMutationPending: boolean;
  onOpenShortcuts: () => void;
};

/**
 * Atalhos locais da fila de aprovações (rota `/app/workflow`).
 * `/` só foca a busca quando o alvo não é campo de edição — evita colisão conceitual com buscas em outras rotas,
 * porque nunca registamos `/` ao nível global (só ⌘/ e Ctrl+/ na paleta).
 */
export function useApprovalQueueHotkeys(options: UseApprovalQueueHotkeysOptions): void {
  const {
    enabled,
    activeSubmissionId,
    sortedVisibleRows,
    selectedSubmissionId,
    setSelectedSubmissionId,
    searchInputRef,
    reviewReason,
    onApprove,
    onRequestAdjustment,
    isMutationPending,
    onOpenShortcuts,
  } = options;

  const location = useLocation();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isApprovalsRoute(location.pathname)) {
        return;
      }

      const typing = isTypingTarget(e.target);

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        if (typing) return;
        e.preventDefault();
        onOpenShortcuts();
        return;
      }

      if (e.key === '/' || e.code === 'Slash') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (typing) return;
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if ((e.key === 'j' || e.key === 'J') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (typing) return;
        if (sortedVisibleRows.length === 0) return;
        e.preventDefault();
        const effectiveId = selectedSubmissionId ?? sortedVisibleRows[0]?.submission_id ?? null;
        const idx = effectiveId ? sortedVisibleRows.findIndex((r) => r.submission_id === effectiveId) : 0;
        const base = idx < 0 ? 0 : idx;
        const next = Math.min(sortedVisibleRows.length - 1, base + 1);
        setSelectedSubmissionId(sortedVisibleRows[next].submission_id);
        return;
      }

      if ((e.key === 'k' || e.key === 'K') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (typing) return;
        if (sortedVisibleRows.length === 0) return;
        e.preventDefault();
        const effectiveId = selectedSubmissionId ?? sortedVisibleRows[0]?.submission_id ?? null;
        const idx = effectiveId ? sortedVisibleRows.findIndex((r) => r.submission_id === effectiveId) : 0;
        const base = idx < 0 ? 0 : idx;
        const next = Math.max(0, base - 1);
        setSelectedSubmissionId(sortedVisibleRows[next].submission_id);
        return;
      }

      if (e.key === 'Enter') {
        if (typing) return;
        const ta = document.getElementById('review-reason') as HTMLTextAreaElement | null;
        if (ta) {
          e.preventDefault();
          ta.focus();
        }
        return;
      }

      if ((e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (typing) return;
        if (!activeSubmissionId || isMutationPending || sortedVisibleRows.length === 0) return;
        e.preventDefault();
        if (!window.confirm('Aprovar esta DRE?')) return;
        onApprove();
        return;
      }

      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (typing) return;
        if (!activeSubmissionId || isMutationPending || sortedVisibleRows.length === 0) return;
        e.preventDefault();
        if (!reviewReason.trim()) {
          window.alert('Informe o parecer da controladoria antes de devolver a DRE para ajuste.');
          return;
        }
        if (!window.confirm('Devolver esta DRE para ajuste da franquia?')) return;
        onRequestAdjustment();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    enabled,
    activeSubmissionId,
    location.pathname,
    sortedVisibleRows,
    selectedSubmissionId,
    setSelectedSubmissionId,
    searchInputRef,
    reviewReason,
    onApprove,
    onRequestAdjustment,
    isMutationPending,
    onOpenShortcuts,
  ]);
}
