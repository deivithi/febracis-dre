import { useEffect, useState } from 'react';

const LS_KEY = 'febracis-dre-approval-kbd-hint-dismissed';

type ApprovalKbdHintBannerProps = {
  /** Abre o diálogo de atalhos (U30-lite). */
  onOpenShortcuts: () => void;
};

/**
 * Banner discreto inferior-direito: auto-oculta em 5s e grava primeira visita em `localStorage`.
 */
export function ApprovalKbdHintBanner({ onOpenShortcuts }: ApprovalKbdHintBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) {
        return;
      }
    } catch {
      /* ignore quota / modo privado */
    }
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(LS_KEY, '1');
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="approval-kbd-hint-banner" role="status">
      <button
        type="button"
        className="approval-kbd-hint-banner__action"
        onClick={() => {
          onOpenShortcuts();
          dismiss();
        }}
      >
        Pressione ? para atalhos
      </button>
      <button type="button" className="approval-kbd-hint-banner__dismiss" onClick={dismiss} aria-label="Fechar dica">
        ×
      </button>
    </div>
  );
}
