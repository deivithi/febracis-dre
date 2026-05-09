import type { FranchiseDashboardRow } from '../../../shared/portal.types';
import { formatCurrency, formatPercent, formatStatusLabel, getStatusVariant, toNumber } from '../../../../utils/formatters';
import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';

function periodRows(
  snapshot: DashboardWidgetRuntimeProps['snapshot'],
  holdingDerived: DashboardWidgetRuntimeProps['holdingDerived'],
): FranchiseDashboardRow[] {
  if (holdingDerived?.filteredRows?.length) {
    return holdingDerived.filteredRows;
  }
  const label =
    snapshot.latestFranchise?.period_label ??
    snapshot.latestRegional?.period_label ??
    snapshot.latestNetwork?.period_label;
  if (!label) {
    return snapshot.franchiseRows;
  }
  return snapshot.franchiseRows.filter((r) => r.period_label === label);
}

export default function RankingWidget({
  config,
  onPropsPatch,
  snapshot,
  holdingDerived,
  editMode,
}: DashboardWidgetRuntimeProps) {
  const variant = typeof config.props.variant === 'string' ? config.props.variant : 'top-ebitda';
  const limitRaw = config.props.limit;
  const limit = typeof limitRaw === 'number' ? limitRaw : 5;

  const rows = periodRows(snapshot, holdingDerived);
  const sorted =
    variant === 'low-margin'
      ? [...rows].sort((a, b) => toNumber(a.ebitda2_pct) - toNumber(b.ebitda2_pct)).slice(0, limit)
      : [...rows].sort((a, b) => toNumber(b.ebitda_2) - toNumber(a.ebitda_2)).slice(0, limit);

  return (
    <div className="card dashboard-widget-shell">
      <div className="card__header card__header--widget">
        <h3 className="card__title">{variant === 'low-margin' ? 'Unidades sob pressão de margem' : 'Ranking por EBITDA 2'}</h3>
        {editMode ? (
          <div className="dashboard-widget-inline-controls">
            <select
              className="form-select form-select--dense"
              value={variant}
              onChange={(e) =>
                onPropsPatch(config.id, { ...config.props, variant: e.target.value })
              }
            >
              <option value="top-ebitda">Melhores margens EBITDA</option>
              <option value="low-margin">Margem mais baixa</option>
            </select>
            <input
              type="number"
              min={3}
              max={20}
              className="form-input form-input--dense"
              value={limit}
              onChange={(e) =>
                onPropsPatch(config.id, {
                  ...config.props,
                  limit: Number.parseInt(e.target.value, 10) || limit,
                })
              }
              aria-label="Limite de linhas"
            />
          </div>
        ) : null}
      </div>
      <div className="card__body card__body--compact">
        {sorted.length === 0 ? (
          <p className="text-secondary">Sem franquias no recorte para este ranking.</p>
        ) : (
          <div className="list-stack">
            {sorted.map((row) => (
              <div key={row.submission_id} className="list-row">
                <div>
                  <div className="list-row__title">{row.franchise_name}</div>
                  <div className="list-row__meta">{row.regional_name}</div>
                </div>
                <div className="list-row__value">
                  <div className="font-mono">{formatCurrency(row.ebitda_2)}</div>
                  <div className="list-row__meta">{formatPercent(row.ebitda2_pct)} margem</div>
                  <span className={`status-badge status-badge--${getStatusVariant(row.submission_status)}`}>
                    <span className="status-badge__dot" />
                    {formatStatusLabel(row.submission_status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
