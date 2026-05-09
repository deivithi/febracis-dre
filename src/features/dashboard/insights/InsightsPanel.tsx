import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import type { AccessProfile } from '../../auth/auth.types';
import type { DerivedHoldingView } from '../holdingDerivations';
import { DashboardInsightCard } from './InsightCard';
import {
  buildDreInsightsRequest,
  fetchDreInsights,
  type DreInsightCard,
} from './insightsApi';
import './insights-panel.css';

const INSIGHTS_CLIENT_STALE_MS = 4 * 60 * 60 * 1000;
const DISMISSAL_STORAGE_KEY = 'febracis-dre-insight-dismissals-v1';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type DismissalRow = { id: string; until: number };

function readDismissals(): DismissalRow[] {
  try {
    const raw = localStorage.getItem(DISMISSAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DismissalRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => typeof r.id === 'string' && typeof r.until === 'number');
  } catch {
    return [];
  }
}

function isDismissed(id: string): boolean {
  const now = Date.now();
  return readDismissals().some((r) => r.id === id && r.until > now);
}

function persistDismissal(id: string) {
  const now = Date.now();
  const next = readDismissals()
    .filter((r) => r.id !== id && r.until > now)
    .concat([{ id, until: now + DISMISS_TTL_MS }]);
  localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(next));
}

type Props = {
  accessProfile: AccessProfile;
  accessToken: string | null;
  holdingDerived: DerivedHoldingView | null;
  onInvestigateEvidence: (evidence: Record<string, unknown>) => void;
};

function EvidenceModal({
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

export function InsightsPanel({
  accessProfile,
  accessToken,
  holdingDerived,
  onInvestigateEvidence,
}: Props) {
  const body = useMemo(
    () => buildDreInsightsRequest(accessProfile, holdingDerived),
    [accessProfile, holdingDerived],
  );

  const [detailCard, setDetailCard] = useState<DreInsightCard | null>(null);
  const [dismissTick, setDismissTick] = useState(0);
  const [searchParams] = useSearchParams();

  const insightsQuery = useQuery({
    queryKey: ['dre-insights', body],
    queryFn: () => fetchDreInsights(accessToken!, body),
    enabled: Boolean(accessToken),
    staleTime: INSIGHTS_CLIENT_STALE_MS,
    gcTime: 1000 * 60 * 60 * 6,
  });

  useEffect(() => {
    const id = searchParams.get('insight');
    if (!id || !insightsQuery.data?.insights?.length) {
      return;
    }
    const hit = insightsQuery.data.insights.find((c) => c.id === id);
    if (hit) {
      setDetailCard(hit);
    }
  }, [searchParams, insightsQuery.data]);

  const visible = useMemo(() => {
    const rows = insightsQuery.data?.insights ?? [];
    void dismissTick;
    return rows.filter((c) => !isDismissed(c.id));
  }, [insightsQuery.data, dismissTick]);

  const handleShare = useCallback(async (card: DreInsightCard) => {
    const url = new URL(window.location.href);
    url.searchParams.set('insight', card.id);
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      window.prompt('Copie o link:', url.toString());
    }
  }, []);

  const handleDismiss = useCallback(
    (card: DreInsightCard) => {
      persistDismissal(card.id);
      setDismissTick((t) => t + 1);
      if (detailCard?.id === card.id) {
        setDetailCard(null);
      }
    },
    [detailCard?.id],
  );

  if (!accessToken) {
    return null;
  }

  return (
    <section className="insights-panel" aria-labelledby="insights-panel-heading">
      <div className="insights-panel__header">
        <h2 id="insights-panel-heading" className="insights-panel__title">
          Insights (IA assistida)
        </h2>
        {insightsQuery.data?.generated_at ? (
          <span className="insights-panel__meta">
            {insightsQuery.data.cached ? 'Cache · ' : ''}
            gerado em{' '}
            {new Date(insightsQuery.data.generated_at).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
            })}{' '}
            BRT
            {typeof insightsQuery.data.latency_ms === 'number'
              ? ` · ${Math.round(insightsQuery.data.latency_ms)} ms`
              : ''}
          </span>
        ) : null}
      </div>

      {insightsQuery.isLoading ? (
        <div className="insights-panel__empty" aria-busy="true">
          Analisando séries aprovadas e montando cartões…
        </div>
      ) : null}

      {insightsQuery.isError ? (
        <div className="insights-panel__error" role="alert">
          {insightsQuery.error instanceof Error
            ? insightsQuery.error.message
            : 'Não foi possível carregar insights.'}
        </div>
      ) : null}

      {!insightsQuery.isLoading && visible.length === 0 && !insightsQuery.isError ? (
        <div className="insights-panel__empty">
          Sem insights novos neste recorte. Os cálculos usam apenas valores de DRE com status{' '}
          <strong>aprovado</strong>.
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="insights-panel__track" role="list">
          {visible.map((card) => (
            <div key={card.id} role="listitem">
              <DashboardInsightCard
                card={card}
                onDetails={() => setDetailCard(card)}
                onInvestigate={() => onInvestigateEvidence(card.evidence)}
                onDismiss={() => handleDismiss(card)}
                onShare={() => void handleShare(card)}
              />
            </div>
          ))}
        </div>
      ) : null}

      {detailCard ? <EvidenceModal card={detailCard} onClose={() => setDetailCard(null)} /> : null}
    </section>
  );
}
