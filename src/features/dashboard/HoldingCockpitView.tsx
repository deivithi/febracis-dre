import { useMemo, useState } from 'react';
import { ClipboardList, DollarSign, ShieldCheck, TrendingUp } from 'lucide-react';
import './DashboardPage.css';
import type { DashboardSnapshot, FranchiseDashboardRow } from '../shared/portal.types';
import {
  calculateDelta,
  formatCurrency,
  formatDelta,
  formatInteger,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
  isPositiveDelta,
  toNumber,
} from '../../utils/formatters';

function getTopFranchises(rows: FranchiseDashboardRow[]) {
  return [...rows]
    .sort((left, right) => toNumber(right.ebitda_2) - toNumber(left.ebitda_2))
    .slice(0, 5);
}

function buildHoldingTotals(rows: FranchiseDashboardRow[]) {
  const totalGrossRevenue = rows.reduce((total, row) => total + toNumber(row.gross_revenue), 0);
  const totalEbitda2 = rows.reduce((total, row) => total + toNumber(row.ebitda_2), 0);
  const approvedCount = rows.filter((row) => row.submission_status === 'approved').length;
  const pendingCount = rows.filter((row) =>
    ['submitted', 'under_review', 'pending_adjustment'].includes(row.submission_status),
  ).length;
  const regionals = new Set(rows.map((row) => row.regional_id)).size;
  const margins = rows.map((row) => toNumber(row.ebitda2_pct));

  return {
    totalGrossRevenue,
    totalEbitda2,
    totalFranchises: rows.length,
    totalRegionals: regionals,
    approvedCount,
    pendingCount,
    avgMarginPct: totalGrossRevenue > 0 ? (totalEbitda2 / totalGrossRevenue) * 100 : 0,
    minMarginPct: margins.length ? Math.min(...margins) : 0,
    maxMarginPct: margins.length ? Math.max(...margins) : 0,
  };
}

function HoldingKpiCards({
  currentRows,
  previousRows,
}: {
  currentRows: FranchiseDashboardRow[];
  previousRows: FranchiseDashboardRow[];
}) {
  const current = buildHoldingTotals(currentRows);
  const previous = buildHoldingTotals(previousRows);

  const items = [
    {
      label: 'Receita filtrada',
      value: formatCurrency(current.totalGrossRevenue),
      percent: `${formatInteger(current.totalFranchises)} unidades no recorte`,
      trend: formatDelta(calculateDelta(current.totalGrossRevenue, previous.totalGrossRevenue)),
      trendUp: isPositiveDelta(calculateDelta(current.totalGrossRevenue, previous.totalGrossRevenue)),
      icon: DollarSign,
      variant: 'gold',
    },
    {
      label: 'EBITDA 2 filtrado',
      value: formatCurrency(current.totalEbitda2),
      percent: `${formatPercent(current.avgMarginPct)} margem consolidada`,
      trend: formatDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      trendUp: isPositiveDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      icon: TrendingUp,
      variant: 'success',
    },
    {
      label: 'Aprovadas',
      value: formatInteger(current.approvedCount),
      percent: `${formatInteger(current.approvedCount)}/${formatInteger(current.totalFranchises)} no recorte`,
      trend: formatDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      trendUp: isPositiveDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      icon: ShieldCheck,
      variant: 'default',
    },
    {
      label: 'Fila / desvios',
      value: formatInteger(current.pendingCount),
      percent: `Pior margem: ${formatPercent(current.minMarginPct)}`,
      trend: formatDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      trendUp: !isPositiveDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      icon: ClipboardList,
      variant: 'warning',
    },
  ];

  return (
    <div className="kpi-grid">
      {items.map((item) => {
        const Icon = item.icon;
        const cardClassName =
          item.variant === 'default'
            ? 'kpi-card'
            : `kpi-card kpi-card--${item.variant}`;

        return (
          <div key={item.label} className={cardClassName}>
            <div className="kpi-card__header">
              <span className="kpi-card__label">{item.label}</span>
              <div className="kpi-card__icon">
                <Icon />
              </div>
            </div>
            <div
              className={`kpi-card__value ${
                item.variant === 'gold'
                  ? 'kpi-card__value--gold'
                  : item.variant === 'success'
                    ? 'kpi-card__value--success'
                    : ''
              }`}
            >
              {item.value}
            </div>
            <div className="kpi-card__footer">
              <span className="kpi-card__percent">{item.percent}</span>
              <span className={`kpi-card__trend ${item.trendUp ? 'kpi-card__trend--up' : 'kpi-card__trend--down'}`}>
                {item.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HoldingCockpitView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const current = snapshot.latestNetwork;

  const periodOptions = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];

    snapshot.franchiseRows.forEach((row) => {
      if (!seen.has(row.period_label)) {
        seen.add(row.period_label);
        values.push(row.period_label);
      }
    });

    return values;
  }, [snapshot.franchiseRows]);

  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState(current?.period_label ?? '');
  const [selectedRegionalId, setSelectedRegionalId] = useState('all');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('all');

  if (!current) {
    return (
      <div className="dashboard__content page-stack">
        <div className="card card--accent">
          <div className="card__body">
            <div className="empty-state empty-state--spaced">
              <div className="empty-state__icon">
                <ShieldCheck />
              </div>
              <h3 className="empty-state__title">Consolidado da rede ainda indisponível</h3>
              <p className="empty-state__description">
                O cockpit executivo aparece quando existir pelo menos uma competência com submissões
                registradas nas franquias do seu recorte. Enquanto isso, confira a fila de revisão ou o
                ambiente de demonstração nas configurações (se tiver permissão).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activePeriodLabel = periodOptions.includes(selectedPeriodLabel)
    ? selectedPeriodLabel
    : current.period_label;
  const previousPeriodLabel =
    periodOptions[periodOptions.findIndex((label) => label === activePeriodLabel) + 1] ?? null;

  const currentPeriodRows = snapshot.franchiseRows.filter((row) => row.period_label === activePeriodLabel);
  const regionalOptions = [...new Map(
    currentPeriodRows.map((row) => [row.regional_id, { id: row.regional_id, name: row.regional_name }]),
  ).values()].sort((left, right) => left.name.localeCompare(right.name));

  const effectiveRegionalId = regionalOptions.some((regional) => regional.id === selectedRegionalId)
    ? selectedRegionalId
    : 'all';

  const franchiseOptions = [...new Map(
    currentPeriodRows
      .filter((row) => effectiveRegionalId === 'all' || row.regional_id === effectiveRegionalId)
      .map((row) => [
        row.franchise_id,
        { id: row.franchise_id, name: row.franchise_name, code: row.franchise_code },
      ]),
  ).values()].sort((left, right) => left.name.localeCompare(right.name));

  const effectiveFranchiseId = franchiseOptions.some((franchise) => franchise.id === selectedFranchiseId)
    ? selectedFranchiseId
    : 'all';

  const filteredRows = currentPeriodRows.filter((row) => {
    const matchesRegional = effectiveRegionalId === 'all' || row.regional_id === effectiveRegionalId;
    const matchesFranchise = effectiveFranchiseId === 'all' || row.franchise_id === effectiveFranchiseId;
    return matchesRegional && matchesFranchise;
  });

  const filteredPreviousRows = previousPeriodLabel
    ? snapshot.franchiseRows.filter((row) => {
        if (row.period_label !== previousPeriodLabel) {
          return false;
        }

        const matchesRegional = effectiveRegionalId === 'all' || row.regional_id === effectiveRegionalId;
        const matchesFranchise = effectiveFranchiseId === 'all' || row.franchise_id === effectiveFranchiseId;
        return matchesRegional && matchesFranchise;
      })
    : [];

  const filteredPendingReviews = snapshot.pendingReviews.filter((row) => {
    const matchesPeriod = row.period_label === activePeriodLabel;
    const matchesFranchise = effectiveFranchiseId === 'all' || row.franchise_id === effectiveFranchiseId;
    const matchesRegional =
      effectiveRegionalId === 'all' ||
      filteredRows.some((franchiseRow) => franchiseRow.franchise_id === row.franchise_id);

    return matchesPeriod && matchesFranchise && matchesRegional;
  });

  const summary = buildHoldingTotals(filteredRows);

  return (
    <div className="dashboard__content page-stack">
      <div className="card card--accent dashboard-filters">
        <div className="card__header">
          <div>
            <h3 className="card__title">Cockpit executivo da rede</h3>
            <p className="card__subtitle">
              Filtre a competencia, a regional e a unidade para sair da visao total e mergulhar na operacao.
            </p>
          </div>
          <span className="badge badge--gold">{formatPeriodLabel(activePeriodLabel)}</span>
        </div>
        <div className="card__body dashboard-filters__body">
          <label className="form-group">
            <span className="form-label">Competencia</span>
            <select
              className="form-select"
              value={activePeriodLabel}
              onChange={(event) => setSelectedPeriodLabel(event.target.value)}
            >
              {periodOptions.map((periodLabel) => (
                <option key={periodLabel} value={periodLabel}>
                  {formatPeriodLabel(periodLabel)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">Regional</span>
            <select
              className="form-select"
              value={effectiveRegionalId}
              onChange={(event) => {
                setSelectedRegionalId(event.target.value);
                setSelectedFranchiseId('all');
              }}
            >
              <option value="all">Toda a rede</option>
              {regionalOptions.map((regional) => (
                <option key={regional.id} value={regional.id}>
                  {regional.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">Unidade</span>
            <select
              className="form-select"
              value={effectiveFranchiseId}
              onChange={(event) => setSelectedFranchiseId(event.target.value)}
            >
              <option value="all">Todas as unidades</option>
              {franchiseOptions.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.code} • {franchise.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <HoldingKpiCards currentRows={filteredRows} previousRows={filteredPreviousRows} />

      <div className="content-grid content-grid--sidebar">
        <div className="card card--accent">
          <div className="card__header">
            <div>
              <h3 className="card__title">Radar executivo do recorte</h3>
              <p className="card__subtitle">
                Ranking, margem e status oficial das unidades visiveis no filtro atual.
              </p>
            </div>
            <span className="badge badge--gold">{formatInteger(filteredRows.length)} unidades</span>
          </div>
          <div className="card__body">
            {filteredRows.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <div className="empty-state__icon">
                  <ClipboardList />
                </div>
                <h3 className="empty-state__title">Nenhuma unidade neste recorte</h3>
                <p className="empty-state__description">
                  Ajuste os filtros de competência, regional ou unidade. Se a competência ainda não tiver
                  submissões registadas, os dados aparecem aqui após o primeiro envio ou rascunho salvo no
                  escopo visível.
                </p>
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Franquia</th>
                      <th>Regional</th>
                      <th className="align-right">RBV</th>
                      <th className="align-right">MC2</th>
                      <th className="align-right">EBITDA 2</th>
                      <th className="align-right">Margem</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredRows]
                      .sort((left, right) => toNumber(right.ebitda_2) - toNumber(left.ebitda_2))
                      .map((row) => (
                        <tr key={row.submission_id}>
                          <td>
                            <div className="list-row__title">{row.franchise_name}</div>
                            <div className="list-row__meta">{row.franchise_code}</div>
                          </td>
                          <td>{row.regional_name}</td>
                          <td className="align-right font-mono">{formatCurrency(row.gross_revenue)}</td>
                          <td className="align-right font-mono">{formatCurrency(row.mc2)}</td>
                          <td className="align-right font-mono">{formatCurrency(row.ebitda_2)}</td>
                          <td className="align-right font-mono">{formatPercent(row.ebitda2_pct)}</td>
                          <td>
                            <span className={`status-badge status-badge--${getStatusVariant(row.submission_status)}`}>
                              <span className="status-badge__dot" />
                              {formatStatusLabel(row.submission_status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard__side">
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Status do recorte</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Franquias</span>
                  <span className="detail-list__value">{formatInteger(summary.totalFranchises)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Regionais</span>
                  <span className="detail-list__value">{formatInteger(summary.totalRegionals)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Aprovadas</span>
                  <span className="detail-list__value">{formatInteger(summary.approvedCount)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Pendentes</span>
                  <span className="detail-list__value">{formatInteger(summary.pendingCount)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Melhor margem</span>
                  <span className="detail-list__value">{formatPercent(summary.maxMarginPct)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Top 5 EBITDA 2</h3>
            </div>
            <div className="card__body">
              <div className="list-stack">
                {getTopFranchises(filteredRows).map((row) => (
                  <div key={row.submission_id} className="list-row">
                    <div>
                      <div className="list-row__title">{row.franchise_name}</div>
                      <div className="list-row__meta">{row.regional_name}</div>
                    </div>
                    <div className="list-row__value">
                      <div className="font-mono">{formatCurrency(row.ebitda_2)}</div>
                      <div className="list-row__meta">{formatPercent(row.ebitda2_pct)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Fila de revisao</h3>
              <span className="badge badge--warning">{formatInteger(filteredPendingReviews.length)}</span>
            </div>
            <div className="card__body">
              {filteredPendingReviews.length === 0 ? (
                <div className="inline-message inline-message--success">
                  Nenhuma unidade aguardando revisao neste recorte.
                </div>
              ) : (
                <div className="list-stack">
                  {filteredPendingReviews.slice(0, 6).map((row) => (
                    <div key={row.submission_id} className="list-row">
                      <div>
                        <div className="list-row__title">{row.franchise_name}</div>
                        <div className="list-row__meta">{formatPeriodLabel(row.period_label)}</div>
                      </div>
                      <div className="list-row__value">
                        <div className="font-mono">{formatCurrency(row.ebitda_2)}</div>
                        <div className="list-row__meta">{formatInteger(row.open_issues_count)} pendencias</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
