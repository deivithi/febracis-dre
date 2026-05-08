import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDashboardScopeLabel } from '../auth/access';
import type { AccessProfile } from '../auth/auth.types';
import { useAccessProfile } from '../auth/useAccessProfile';
import { fetchDashboardSnapshot } from '../shared/portal.api';
import type {
  CurrentSubmissionRow,
  DashboardSnapshot,
  FranchiseDashboardRow,
  PendingReviewRow,
} from '../shared/portal.types';
import {
  calculateDelta,
  formatCurrency,
  formatDateTime,
  formatDelta,
  formatInteger,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
  isPositiveDelta,
  toNumber,
} from '../../utils/formatters';
import { HoldingCockpitView } from './HoldingCockpitView';
import { buildHoldingTotals, deriveHoldingView, type HoldingFilterState } from './holdingDerivations';
import './DashboardPage.css';

interface KpiCardModel {
  label: string;
  value: string;
  percent: string;
  trend: string;
  trendUp: boolean;
  variant: 'default' | 'gold' | 'success' | 'warning';
  icon: typeof DollarSign;
}

function buildFranchiseKpis(snapshot: DashboardSnapshot): KpiCardModel[] {
  if (!snapshot.latestFranchise) {
    return [];
  }

  const current = snapshot.latestFranchise;
  const previous = snapshot.previousFranchise;

  return [
    {
      label: 'Receita Bruta de Vendas',
      value: formatCurrency(current.gross_revenue),
      percent: 'Total faturado pela unidade',
      trend: formatDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      variant: 'gold',
      icon: DollarSign,
    },
    {
      label: 'Margem de contribuição 1',
      value: formatCurrency(current.mc1),
      percent: `${formatPercent(current.mc1_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      variant: 'default',
      icon: BarChart3,
    },
    {
      label: 'Margem de contribuição 2',
      value: formatCurrency(current.mc2),
      percent: `${formatPercent(current.mc2_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      variant: 'default',
      icon: Target,
    },
    {
      label: 'EBITDA 2',
      value: formatCurrency(current.ebitda_2),
      percent: `${formatPercent(current.ebitda2_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.ebitda_2, previous?.ebitda_2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.ebitda_2, previous?.ebitda_2 ?? null)),
      variant: 'success',
      icon: TrendingUp,
    },
  ];
}

function buildRegionalKpis(snapshot: DashboardSnapshot): KpiCardModel[] {
  if (!snapshot.latestRegional) {
    return [];
  }

  const current = snapshot.latestRegional;
  const previous = snapshot.previousRegional;

  return [
    {
      label: 'Receita da regional',
      value: formatCurrency(current.total_gross_revenue),
      percent: `${formatInteger(current.total_franchises)} franquias na carteira`,
      trend: formatDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      trendUp: isPositiveDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      variant: 'gold',
      icon: DollarSign,
    },
    {
      label: 'EBITDA 2 da regional',
      value: formatCurrency(current.total_ebitda_2),
      percent: `${formatPercent(current.avg_ebitda2_pct)} de margem média`,
      trend: formatDelta(
        calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null),
      ),
      trendUp: isPositiveDelta(
        calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null),
      ),
      variant: 'success',
      icon: TrendingUp,
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)} de ${formatInteger(current.total_franchises)} unidades`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: CheckCircle2,
    },
    {
      label: 'Em ajuste',
      value: formatInteger(current.pending_count),
      percent: `${formatPercent(current.avg_default_pct)} de inadimplência média`,
      trend: formatDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      trendUp: !isPositiveDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      variant: 'warning',
      icon: AlertTriangle,
    },
  ];
}

function buildHoldingFilteredKpis(
  currentRows: FranchiseDashboardRow[],
  previousRows: FranchiseDashboardRow[],
): KpiCardModel[] {
  const current = buildHoldingTotals(currentRows);
  const previous = buildHoldingTotals(previousRows);

  return [
    {
      label: 'Receita do recorte',
      value: formatCurrency(current.totalGrossRevenue),
      percent: `${formatInteger(current.totalFranchises)} unidades no filtro`,
      trend: formatDelta(calculateDelta(current.totalGrossRevenue, previous.totalGrossRevenue)),
      trendUp: isPositiveDelta(calculateDelta(current.totalGrossRevenue, previous.totalGrossRevenue)),
      variant: 'gold',
      icon: DollarSign,
    },
    {
      label: 'EBITDA 2 do recorte',
      value: formatCurrency(current.totalEbitda2),
      percent: `${formatPercent(current.avgMarginPct)} margem consolidada`,
      trend: formatDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      trendUp: isPositiveDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      variant: 'success',
      icon: TrendingUp,
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approvedCount),
      percent: `${formatInteger(current.approvedCount)}/${formatInteger(current.totalFranchises)} no filtro`,
      trend: formatDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      trendUp: isPositiveDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      variant: 'default',
      icon: ShieldCheck,
    },
    {
      label: 'Em ajuste / fila',
      value: formatInteger(current.pendingCount),
      percent: `Pior margem: ${formatPercent(current.minMarginPct)}`,
      trend: formatDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      trendUp: !isPositiveDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      variant: 'warning',
      icon: ClipboardList,
    },
  ];
}

function buildNetworkKpis(snapshot: DashboardSnapshot): KpiCardModel[] {
  if (!snapshot.latestNetwork) {
    return [];
  }

  const current = snapshot.latestNetwork!;
  const previous = snapshot.previousNetwork;

  return [
    {
      label: 'Receita consolidada da rede',
      value: formatCurrency(current.total_gross_revenue),
      percent: `${formatInteger(current.total_regionals)} regionais consolidadas`,
      trend: formatDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      trendUp: isPositiveDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      variant: 'gold',
      icon: DollarSign,
    },
    {
      label: 'EBITDA 2 da rede',
      value: formatCurrency(current.total_ebitda_2),
      percent: `${formatPercent(current.avg_ebitda2_pct)} de margem média`,
      trend: formatDelta(
        calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null),
      ),
      trendUp: isPositiveDelta(
        calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null),
      ),
      variant: 'success',
      icon: TrendingUp,
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)} de ${formatInteger(current.total_franchises)} franquias`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: ShieldCheck,
    },
    {
      label: 'Aguardando ação',
      value: formatInteger(current.pending_count),
      percent: `Pior margem hoje: ${formatPercent(current.min_ebitda2_pct)}`,
      trend: formatDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      trendUp: !isPositiveDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      variant: 'warning',
      icon: ClipboardList,
    },
  ];
}

function getCurrentPeriodLabel(snapshot: DashboardSnapshot) {
  return (
    snapshot.latestFranchise?.period_label ??
    snapshot.latestRegional?.period_label ??
    snapshot.latestNetwork?.period_label ??
    null
  );
}

function getCurrentPeriodFranchiseRows(snapshot: DashboardSnapshot) {
  const periodLabel = getCurrentPeriodLabel(snapshot);

  if (!periodLabel) {
    return [];
  }

  return snapshot.franchiseRows.filter((row) => row.period_label === periodLabel);
}

function getTopFranchises(rows: FranchiseDashboardRow[]) {
  return [...rows]
    .sort((left, right) => toNumber(right.ebitda_2) - toNumber(left.ebitda_2))
    .slice(0, 5);
}

function getCriticalFranchises(rows: FranchiseDashboardRow[]) {
  return [...rows]
    .sort((left, right) => toNumber(left.ebitda2_pct) - toNumber(right.ebitda2_pct))
    .slice(0, 5);
}

function KpiCards({ items }: { items: KpiCardModel[] }) {
  return (
    <div className="kpi-grid">
      {items.map((kpi) => {
        const Icon = kpi.icon;
        const cardClassName =
          kpi.variant === 'default'
            ? 'kpi-card'
            : `kpi-card kpi-card--${kpi.variant}`;

        return (
          <div key={kpi.label} className={cardClassName}>
            <div className="kpi-card__header">
              <span className="kpi-card__label">{kpi.label}</span>
              <div className="kpi-card__icon">
                <Icon />
              </div>
            </div>

            <div
              className={`kpi-card__value ${
                kpi.variant === 'gold'
                  ? 'kpi-card__value--gold'
                  : kpi.variant === 'success'
                    ? 'kpi-card__value--success'
                    : ''
              }`}
            >
              {kpi.value}
            </div>

            <div className="kpi-card__footer">
              <span className="kpi-card__percent">{kpi.percent}</span>
              <span
                className={`kpi-card__trend ${
                  kpi.trendUp ? 'kpi-card__trend--up' : 'kpi-card__trend--down'
                }`}
              >
                {kpi.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {kpi.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getScopeNarrative(scope: string) {
  switch (scope) {
    case 'controladoria':
      return 'Fila, pendências e ritmo de fechamento — ação imediata quando algo depende de você.';
    case 'holding':
      return 'Consolidado da rede por competência — filtre regional e unidade no cockpit abaixo.';
    case 'regional':
      return 'Carteira da regional — compare margens e cobre envios em atraso.';
    default:
      return 'Último envio oficial, status na competência e próximos passos da sua unidade.';
  }
}

function DashboardHero({
  accessProfile,
  snapshot,
  isDashboardFetching,
}: {
  accessProfile: AccessProfile | undefined;
  snapshot: DashboardSnapshot;
  isDashboardFetching: boolean;
}) {
  const queryClient = useQueryClient();
  if (!accessProfile) {
    return null;
  }

  const hasOperationalData =
    snapshot.currentSubmissions.length > 0 ||
    snapshot.pendingReviews.length > 0 ||
    snapshot.currentDre.length > 0;

  const currentPeriod = formatPeriodLabel(getCurrentPeriodLabel(snapshot));
  const primaryAction = accessProfile.isAdmin
    ? {
        to: '/app/admin',
        label: hasOperationalData ? 'Gerenciar ambiente demo' : 'Preparar ambiente demo',
        icon: ShieldCheck,
      }
    : {
        to: '/app/submissions',
        label: 'Abrir Submissões',
        icon: FileText,
      };

  const PrimaryIcon = primaryAction.icon;

  const pendingLabel =
    accessProfile.canManageReview || accessProfile.dashboardScope !== 'franchise'
      ? 'aguardando revisão'
      : 'pendências (fila interna)';

  const handleRefreshReadings = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <div className="page-stack">
      <section className="dashboard-hero card card--gold">
        <div className="dashboard-hero__copy">
          <span className="badge badge--gold">{getDashboardScopeLabel(accessProfile.dashboardScope)}</span>
          <h1 className="page-container__title dashboard-hero__title">Painel executivo</h1>
          <p className="page-container__subtitle dashboard-hero__subtitle">
            {getScopeNarrative(accessProfile.dashboardScope)}{' '}
            <span className="dashboard-hero__period">Competência atual: {currentPeriod}.</span>
          </p>
        </div>

        <div className="dashboard-hero__panel glass">
          <div className="dashboard-hero__panel-header">
            <span>Leitura operacional</span>
          </div>

          <div className="dashboard-hero__metrics">
            <div>
              <strong>{formatInteger(snapshot.currentSubmissions.length)}</strong>
              <span>DREs em andamento</span>
            </div>
            <div>
              <strong>{formatInteger(snapshot.pendingReviews.length)}</strong>
              <span>{pendingLabel}</span>
            </div>
            <div>
              <strong>{currentPeriod}</strong>
              <span>competência</span>
            </div>
          </div>

          <div className="dashboard-hero__actions">
            <Link to={primaryAction.to} className="btn btn--gold">
              <PrimaryIcon size={18} />
              {primaryAction.label}
            </Link>
            {accessProfile.canManageReview ? (
              <Link to="/app/workflow" className="btn btn--secondary">
                Abrir fila de aprovações
                <ArrowRight size={16} />
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn--secondary"
                disabled={isDashboardFetching}
                onClick={handleRefreshReadings}
              >
                <RefreshCw size={16} />
                Atualizar leitura
              </button>
            )}
          </div>

          {!hasOperationalData && (
            <div className="inline-message">
              Ainda não há DREs registradas no seu escopo. Quando a primeira submissão entrar, este painel passa a
              mostrar os números do período automaticamente.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RecentSubmissionsCard({ rows }: { rows: CurrentSubmissionRow[] }) {
  if (!rows.length) {
    return (
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Últimas DREs do período</h3>
        </div>
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon">
              <ClipboardList />
            </div>
            <p className="empty-state__description">Nenhuma DRE registrada até o momento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <h3 className="card__title">Últimas DREs do período</h3>
      </div>
      <div className="card__body">
        <div className="list-stack">
          {rows.slice(0, 4).map((row) => (
            <div key={row.submission_id} className="list-row">
              <div>
                <div className="list-row__title">{formatPeriodLabel(row.period_label)}</div>
                <div className="list-row__meta">
                  Versão {row.version_number} • {row.franchise_name}
                </div>
              </div>
              <div className="list-row__value">
                <span className={`status-badge status-badge--${getStatusVariant(row.status)}`}>
                  <span className="status-badge__dot" />
                  {formatStatusLabel(row.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PendingReviewsCard({ rows }: { rows: PendingReviewRow[] }) {
  return (
    <div className="card">
      <div className="card__header">
        <h3 className="card__title">Fila de aprovações</h3>
        <span className="badge badge--warning">{formatInteger(rows.length)}</span>
      </div>
      <div className="card__body">
        {rows.length === 0 ? (
          <div className="inline-message inline-message--success">
            Nenhuma DRE aguardando aprovação neste momento.
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Franquia</th>
                  <th>Período</th>
                  <th className="align-right">RBV</th>
                  <th className="align-right">EBITDA 2</th>
                  <th className="align-right">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.submission_id}>
                    <td>
                      <div className="list-row__title">{row.franchise_name}</div>
                      <div className="list-row__meta">{row.regional_name}</div>
                    </td>
                    <td>{formatPeriodLabel(row.period_label)}</td>
                    <td className="align-right font-mono">{formatCurrency(row.gross_revenue)}</td>
                    <td className="align-right font-mono">{formatCurrency(row.ebitda_2)}</td>
                    <td className="align-right">{formatInteger(row.open_issues_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FranchiseDashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const current = snapshot.latestFranchise;

  if (!current) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <DollarSign />
        </div>
        <h3 className="empty-state__title">Sem DRE neste período</h3>
        <p className="empty-state__description">
          Quando a unidade enviar a primeira DRE, ela aparece aqui automaticamente, com a leitura consolidada do período.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard__content">
      <div className="content-grid content-grid--sidebar">
        <div className="card card--accent">
          <div className="card__header">
            <div>
              <h3 className="card__title">DRE oficial do período</h3>
              <p className="card__subtitle">{current.franchise_name}</p>
            </div>
            <span className="badge badge--primary">{formatPeriodLabel(current.period_label)}</span>
          </div>
          <div className="card__body card__body--compact">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th className="align-right">Valor</th>
                    <th className="align-right">% da receita</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.currentDre.map((row) => (
                    <tr
                      key={`${row.section_code}-${row.line_code}`}
                      className={row.line_type !== 'input' ? 'dre-row--bold' : ''}
                    >
                      <td
                        className={
                          row.line_code === 'ebitda_2'
                            ? 'dre-highlight--gold'
                            : row.line_code === 'ebitda_1'
                              ? 'dre-highlight--success'
                              : row.line_code === 'mc1' || row.line_code === 'mc2'
                                ? 'dre-highlight--primary'
                                : ''
                        }
                      >
                        {row.line_name}
                      </td>
                      <td className="align-right font-mono">{formatCurrency(row.value_currency)}</td>
                      <td className="align-right font-mono text-secondary">
                        {formatPercent(row.percent_of_gross_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dashboard__side">
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Status do período</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Competência</span>
                  <span className="detail-list__value">{formatPeriodLabel(current.period_label)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Status</span>
                  <span className={`status-badge status-badge--${getStatusVariant(current.submission_status)}`}>
                    <span className="status-badge__dot" />
                    {formatStatusLabel(current.submission_status)}
                  </span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Versão</span>
                  <span className="detail-list__value">
                    {snapshot.currentSubmissions[0]?.version_number ?? '—'}
                  </span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Regional</span>
                  <span className="detail-list__value">{current.regional_name}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Enviado em</span>
                  <span className="detail-list__value">
                    {formatDateTime(snapshot.currentSubmissions[0]?.submitted_at ?? null)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <RecentSubmissionsCard rows={snapshot.currentSubmissions} />
        </div>
      </div>
    </div>
  );
}

function RegionalDashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const current = snapshot.latestRegional;

  if (!current) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Building2 />
        </div>
        <h3 className="empty-state__title">Ainda não há números da regional</h3>
        <p className="empty-state__description">
          Quando as franquias da sua carteira começarem a enviar DREs, o consolidado da regional aparece aqui.
        </p>
      </div>
    );
  }

  const currentRows = getCurrentPeriodFranchiseRows(snapshot).filter(
    (row) => row.regional_id === current.regional_id,
  );

  return (
    <div className="dashboard__content">
      <div className="content-grid content-grid--sidebar">
        <div className="card card--accent">
          <div className="card__header">
            <div>
              <h3 className="card__title">Comparativo entre franquias</h3>
              <p className="card__subtitle">{current.regional_name}</p>
            </div>
            <span className="badge badge--primary">{formatPeriodLabel(current.period_label)}</span>
          </div>
          <div className="card__body card__body--compact">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Franquia</th>
                    <th className="align-right">RBV</th>
                    <th className="align-right">EBITDA 2</th>
                    <th className="align-right">Margem</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row) => (
                    <tr key={row.submission_id}>
                      <td>
                        <div className="list-row__title">{row.franchise_name}</div>
                        <div className="list-row__meta">{row.franchise_code}</div>
                      </td>
                      <td className="align-right font-mono">{formatCurrency(row.gross_revenue)}</td>
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
          </div>
        </div>

        <div className="dashboard__side">
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Resumo regional</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Franquias na carteira</span>
                  <span className="detail-list__value">{formatInteger(current.total_franchises)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Aprovadas</span>
                  <span className="detail-list__value">{formatInteger(current.approved_count)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Pendentes</span>
                  <span className="detail-list__value">{formatInteger(current.pending_count)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">MC1 média</span>
                  <span className="detail-list__value">{formatPercent(current.avg_mc1_pct)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Marketing médio</span>
                  <span className="detail-list__value">{formatPercent(current.avg_marketing_pct)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Top 5 unidades por margem</h3>
            </div>
            <div className="card__body">
              <div className="list-stack">
                {getTopFranchises(currentRows).map((row) => (
                  <div key={row.submission_id} className="list-row">
                    <div>
                      <div className="list-row__title">{row.franchise_name}</div>
                      <div className="list-row__meta">{formatPercent(row.ebitda2_pct)} de margem</div>
                    </div>
                    <div className="list-row__value font-mono">{formatCurrency(row.ebitda_2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControladoriaDashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const current = snapshot.latestNetwork;
  const currentRows = getCurrentPeriodFranchiseRows(snapshot);

  return (
    <div className="dashboard__content page-stack">
      <PendingReviewsCard rows={snapshot.pendingReviews} />

      <div className="page-grid page-grid--wide">
        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Unidades com menor margem (EBITDA 2)</h3>
              <p className="card__subtitle">
                Priorize a revisão de quem está com margem baixa ou pendências em aberto.
              </p>
            </div>
          </div>
          <div className="card__body">
            <div className="list-stack">
              {getCriticalFranchises(currentRows).map((row) => (
                <div key={`${row.submission_id}-review`} className="list-row">
                  <div>
                    <div className="list-row__title">{row.franchise_name}</div>
                    <div className="list-row__meta">
                      {row.regional_name} • {formatStatusLabel(row.submission_status)}
                    </div>
                  </div>
                  <div className="list-row__value">
                    <div className="font-mono">{formatPercent(row.ebitda2_pct)}</div>
                    <div className="list-row__meta">{formatCurrency(row.ebitda_2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard__side">
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Resumo da fila de aprovações</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">DREs aguardando aprovação</span>
                  <span className="detail-list__value">{formatInteger(snapshot.pendingReviews.length)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">DREs aprovadas</span>
                  <span className="detail-list__value">{formatInteger(current?.approved_count ?? 0)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Pontos abertos</span>
                  <span className="detail-list__value">
                    {formatInteger(
                      snapshot.pendingReviews.reduce(
                        (total, row) => total + Number(row.open_issues_count ?? 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Competência</span>
                  <span className="detail-list__value">
                    {formatPeriodLabel(current?.period_label ?? null)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <RecentSubmissionsCard rows={snapshot.currentSubmissions} />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const accessProfileQuery = useAccessProfile();
  const [holdingFilters, setHoldingFilters] = useState<HoldingFilterState>(() => ({
    selectedPeriodLabel: '',
    selectedRegionalId: 'all',
    selectedFranchiseId: 'all',
  }));

  const dashboardQuery = useQuery({
    queryKey: [
      'dashboard',
      accessProfileQuery.data?.dashboardScope,
      accessProfileQuery.data?.franchiseIds.join(',') ?? 'all-franchises',
      accessProfileQuery.data?.regionalIds.join(',') ?? 'all-regionals',
    ],
    queryFn: () => fetchDashboardSnapshot(accessProfileQuery.data!),
    enabled: Boolean(accessProfileQuery.data),
  });

  const snapshot = dashboardQuery.data;
  const profile = accessProfileQuery.data;

  useEffect(() => {
    if (profile?.dashboardScope !== 'holding' || !snapshot?.latestNetwork) {
      return;
    }
    const periodLabel = snapshot.latestNetwork.period_label;
    setHoldingFilters((prev) => {
      if (prev.selectedPeriodLabel) {
        return prev;
      }
      return { ...prev, selectedPeriodLabel: periodLabel };
    });
  }, [profile?.dashboardScope, snapshot?.latestNetwork?.period_label]);

  const holdingDerived = useMemo(() => {
    if (!snapshot || profile?.dashboardScope !== 'holding') {
      return null;
    }
    return deriveHoldingView(snapshot, holdingFilters);
  }, [snapshot, profile?.dashboardScope, holdingFilters]);

  const kpis = useMemo(() => {
    if (!snapshot || !profile) {
      return [];
    }
    if (profile.dashboardScope === 'franchise') {
      return buildFranchiseKpis(snapshot);
    }
    if (profile.dashboardScope === 'regional') {
      return buildRegionalKpis(snapshot);
    }
    if (profile.dashboardScope === 'holding') {
      if (!holdingDerived) {
        return [];
      }
      return buildHoldingFilteredKpis(holdingDerived.filteredRows, holdingDerived.filteredPreviousRows);
    }
    return buildNetworkKpis(snapshot);
  }, [snapshot, profile, holdingDerived]);

  if (accessProfileQuery.isLoading || dashboardQuery.isLoading) {
    return (
      <div className="page-stack">
        <div className="page-container__title-bar">
          <div>
            <p className="page-container__title page-container__title--loading">Painel executivo</p>
            <p className="page-container__subtitle">Carregando os números da rede…</p>
          </div>
        </div>
        <div className="kpi-grid">
          <div className="skeleton skeleton--card" />
          <div className="skeleton skeleton--card" />
          <div className="skeleton skeleton--card" />
          <div className="skeleton skeleton--card" />
        </div>
      </div>
    );
  }

  if (accessProfileQuery.error || !profile) {
    return (
      <div className="inline-message inline-message--danger">
        Não conseguimos identificar o seu perfil de acesso. Atualize a página ou peça ao administrador para revisar a sua conta.
      </div>
    );
  }

  if (dashboardQuery.error || !snapshot) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar os números da rede neste momento. Tente novamente em alguns instantes.
      </div>
    );
  }

  const accessProfile = profile;
  const currentPeriodLabel = formatPeriodLabel(getCurrentPeriodLabel(snapshot));

  return (
    <div className="dashboard page-stack">
      <div className="page-container__title-bar page-container__title-bar--dashboard">
        <div>
          <p className="page-container__subtitle page-container__subtitle--dashboard-title">
            Leitura {getDashboardScopeLabel(accessProfile.dashboardScope).toLowerCase()} · competência{' '}
            {currentPeriodLabel}
          </p>
        </div>
        <div className="badge-row">
          <span className="badge badge--gold">
            {getDashboardScopeLabel(accessProfile.dashboardScope)}
          </span>
          <span className="badge badge--primary">{currentPeriodLabel}</span>
        </div>
      </div>

      <DashboardHero
        accessProfile={accessProfile}
        snapshot={snapshot}
        isDashboardFetching={dashboardQuery.isFetching}
      />

      <KpiCards items={kpis} />

      {accessProfile.dashboardScope === 'franchise' && <FranchiseDashboardView snapshot={snapshot} />}
      {accessProfile.dashboardScope === 'regional' && <RegionalDashboardView snapshot={snapshot} />}
      {accessProfile.dashboardScope === 'holding' && (
        <HoldingCockpitView
          derived={holdingDerived}
          onPatchFilters={(patch) => setHoldingFilters((prev) => ({ ...prev, ...patch }))}
        />
      )}
      {accessProfile.dashboardScope === 'controladoria' && (
        <ControladoriaDashboardView snapshot={snapshot} />
      )}
    </div>
  );
}
