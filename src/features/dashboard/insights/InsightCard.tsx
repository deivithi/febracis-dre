import type { DreInsightCard } from './insightsApi';

type Props = {
  card: DreInsightCard;
  onDetails: () => void;
  onInvestigate: () => void;
  onDismiss: () => void;
  onShare: () => void;
};

const severityLabels: Record<DreInsightCard['severity'], string> = {
  info: 'Informação',
  warning: 'Atenção',
  critical: 'Crítico',
};

export function DashboardInsightCard({ card, onDetails, onInvestigate, onDismiss, onShare }: Props) {
  const tone =
    card.severity === 'critical' ? 'critical' : card.severity === 'warning' ? 'warning' : 'info';

  return (
    <article className={`insight-card insight-card--${tone}`} data-insight-id={card.id}>
      <span className="insight-card__badge">
        {severityLabels[card.severity]} · {card.type}
      </span>
      <h4 className="insight-card__title">{card.title}</h4>
      <p className="insight-card__description">{card.description}</p>
      <div className="insight-card__actions">
        <button type="button" className="btn btn--secondary" onClick={onDetails}>
          Detalhes
        </button>
        <button type="button" className="btn btn--gold" onClick={onInvestigate}>
          Investigar
        </button>
        <button type="button" className="btn btn--secondary" onClick={onDismiss}>
          Dispensar
        </button>
        <button type="button" className="btn btn--secondary" onClick={onShare}>
          Compartilhar
        </button>
      </div>
    </article>
  );
}
