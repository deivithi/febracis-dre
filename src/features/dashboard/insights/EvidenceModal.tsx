import { createPortal } from 'react-dom';
import type { DreInsightCard } from './insightsApi';

export function EvidenceModal({
  card,
  onClose,
}: {
  card: DreInsightCard;
  onClose: () => void;
}) {
  const json = JSON.stringify(card.evidence, null, 2);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="insights-modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="insights-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="insights-modal__header">
          <h3 id="insight-modal-title">{card.title}</h3>
          <p className="page-container__subtitle" style={{ margin: 0 }}>
            Evidências (somente leitura) · métricas com DRE <strong>aprovada</strong>
          </p>
        </div>
        <div className="insights-modal__body">
          <pre className="insights-modal__pre">{json}</pre>
          {card.suggested_action ? (
            <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              <strong>Sugestão:</strong> {card.suggested_action}
            </p>
          ) : null}
        </div>
        <div className="insights-modal__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              void navigator.clipboard.writeText(json).catch(() => {
                window.prompt('Copie o JSON:', json);
              });
            }}
          >
            Copiar evidência (JSON)
          </button>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
