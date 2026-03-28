import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getDashboardScopeLabel } from '../auth/access';
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
      label: 'Receita Bruta (RBV)',
      value: formatCurrency(current.gross_revenue),
      percent: '100,0% da RBV',
      trend: formatDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      variant: 'gold',
      icon: DollarSign,
    },
    {
      label: 'Margem MC1',
      value: formatCurrency(current.mc1),
      percent: `${formatPercent(current.mc1_pct)} da RBV`,
      trend: formatDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      variant: 'default',
      icon: BarChart3,
    },
    {
      label: 'Margem MC2',
      value: formatCurrency(current.mc2),
      percent: `${formatPercent(current.mc2_pct)} da RBV`,
      trend: formatDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      variant: 'default',
      icon: Target,
    },
    {
      label: 'EBITDA 2',
      value: formatCurrency(current.ebitda_2),
      percent: `${formatPercent(current.ebitda2_pct)} da RBV`,
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
      label: 'Receita Regional',
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
      label: 'EBITDA 2 Regional',
      value: formatCurrency(current.total_ebitda_2),
      percent: `${formatPercent(current.avg_ebitda2_pct)} margem média`,
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
      label: 'Aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)}/${formatInteger(current.total_franchises)} unidades`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: CheckCircle2,
    },
    {
      label: 'Pendências',
      value: formatInteger(current.pending_count),
      percent: `${formatPercent(current.avg_default_pct)} inadimplência média`,
      trend: formatDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      trendUp: !isPositiveDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      variant: 'warning',
      icon: AlertTriangle,
    },
  ];
}

function buildNetworkKpis(snapshot: DashboardSnapshot): KpiCardModel[] {
  if (!snapshot.latestNetwork) {
    return [];
  }

  const current = snapshot.latestNetwork;
  const previous = snapshot.previousNetwork;

  return [
    {
      label: 'Receita Consolidada',
      value: formatCurrency(current.total_gross_revenue),
      percent: `${formatInteger(current.total_regionals)} regionais na rede`,
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
      label: 'EBITDA 2 Rede',
      value: formatCurrency(current.total_ebitda_2),
      percent: `${formatPercent(current.avg_ebitda2_pct)} margem média`,
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
      label: 'Aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)}/${formatInteger(current.total_franchises)} franquias`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: ShieldCheck,
    },
    {
      label: 'Fila / Atrasos',
      value: formatInteger(current.pending_count),
      percent: `Pior margem: ${formatPercent(current.min_ebitda2_pct)}`,
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
      {items.map((kpi, index) => {
        const Icon = kpi.icon;
        const cardClassName =
          kpi.variant === 'default'
            ? 'kpi-card animate-fade-in-up'
            : `kpi-card kpi-card--${kpi.variant} animate-fade-in-up`;

        return (
          <div key={kpi.label} className={`${cardClassName} delay-${index + 1}`}>
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

function RecentSubmissionsCard({ rows }: { rows: CurrentSubmissionRow[] }) {
  if (!rows.length) {
    return (
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Últimas submissões</h3>
        </div>
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon">
              <ClipboardList />
            </div>
            <p className="empty-state__description">Nenhuma submissão encontrada até agora.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <h3 className="card__title">Últimas submissões</h3>
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
        <h3 className="card__title">Fila de revisão</h3>
        <span className="badge badge--warning">{formatInteger(rows.length)}</span>
      </div>
      <div className="card__body">
        {rows.length === 0 ? (
          <div className="inline-message inline-message--success">
            Nenhuma submissão aguardando revisão neste momento.
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
        <h3 className="empty-state__title">Sem dados de DRE disponíveis</h3>
        <p className="empty-state__description">
          Assim que a primeira submissão for registrada, este painel passa a mostrar a DRE consolidada.
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
              <h3 className="card__title">Demonstração de Resultado (DRE)</h3>
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
                    <th className="align-right">% RBV</th>
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
        <h3 className="empty-state__title">Sem dados regionais disponíveis</h3>
        <p className="empty-state__description">
          O consolidado regional aparece automaticamente quando houver franquias com submissões na sua carteira.
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
              <h3 className="card__title">Top 5 EBITDA 2</h3>
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

function HoldingDashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const current = snapshot.latestNetwork;

  if (!current) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <ShieldCheck />
        </div>
        <h3 className="empty-state__title">Sem consolidado da rede disponível</h3>
        <p className="empty-state__description">
          O consolidado da holding aparecerá assim que houver submissões registradas nas franquias.
        </p>
      </div>
    );
  }

  const currentRows = getCurrentPeriodFranchiseRows(snapshot);

  return (
    <div className="dashboard__content">
      <div className="content-grid content-grid--sidebar">
        <div className="card card--accent">
          <div className="card__header">
            <div>
              <h3 className="card__title">Ranking da rede</h3>
              <p className="card__subtitle">
                Melhor e pior desempenho por EBITDA 2 na competência atual
              </p>
            </div>
            <span className="badge badge--gold">{formatPeriodLabel(current.period_label)}</span>
          </div>
          <div className="card__body page-stack">
            <div>
              <h4 className="dashboard-section-title">Franquias destaque</h4>
              <div className="list-stack">
                {getTopFranchises(currentRows).map((row) => (
                  <div key={row.submission_id} className="list-row">
                    <div>
                      <div className="list-row__title">{row.franchise_name}</div>
                      <div className="list-row__meta">
                        {row.regional_name} • {formatPercent(row.ebitda2_pct)} de margem
                      </div>
                    </div>
                    <div className="list-row__value font-mono">{formatCurrency(row.ebitda_2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="dashboard-section-title">Franquias críticas</h4>
              <div className="list-stack">
                {getCriticalFranchises(currentRows).map((row) => (
                  <div key={`${row.submission_id}-critical`} className="list-row">
                    <div>
                      <div className="list-row__title">{row.franchise_name}</div>
                      <div className="list-row__meta">{row.regional_name}</div>
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
        </div>

        <div className="dashboard__side">
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Status da rede</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Franquias</span>
                  <span className="detail-list__value">{formatInteger(current.total_franchises)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Regionais</span>
                  <span className="detail-list__value">{formatInteger(current.total_regionals)}</span>
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
                  <span className="detail-list__label">Melhor margem</span>
                  <span className="detail-list__value">{formatPercent(current.max_ebitda2_pct)}</span>
                </div>
              </div>
            </div>
          </div>

          <PendingReviewsCard rows={snapshot.pendingReviews.slice(0, 5)} />
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
              <h3 className="card__title">Franquias com menor margem EBITDA 2</h3>
              <p className="card__subtitle">
                Priorize revisão em unidades com baixa margem e maior quantidade de pendências.
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
              <h3 className="card__title">Resumo da fila</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Submissões pendentes</span>
                  <span className="detail-list__value">{formatInteger(snapshot.pendingReviews.length)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Franquias aprovadas</span>
                  <span className="detail-list__value">{formatInteger(current?.approved_count ?? 0)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Pendências abertas</span>
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

  if (accessProfileQuery.isLoading || dashboardQuery.isLoading) {
    return (
      <div className="page-stack">
        <div className="page-container__title-bar">
          <div>
            <h1 className="page-container__title">Dashboard</h1>
            <p className="page-container__subtitle">Carregando visão executiva do período...</p>
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

  if (accessProfileQuery.error || !accessProfileQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível identificar o perfil de acesso do usuário.
      </div>
    );
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar o dashboard com dados reais do Supabase.
      </div>
    );
  }

  const accessProfile = accessProfileQuery.data;
  const snapshot = dashboardQuery.data;
  const currentPeriodLabel = formatPeriodLabel(getCurrentPeriodLabel(snapshot));
  const kpis =
    accessProfile.dashboardScope === 'franchise'
      ? buildFranchiseKpis(snapshot)
      : accessProfile.dashboardScope === 'regional'
        ? buildRegionalKpis(snapshot)
        : buildNetworkKpis(snapshot);

  return (
    <div className="dashboard page-stack">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Dashboard</h1>
          <p className="page-container__subtitle">
            Visão {getDashboardScopeLabel(accessProfile.dashboardScope).toLowerCase()} do período{' '}
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

      <KpiCards items={kpis} />

      {accessProfile.dashboardScope === 'franchise' && <FranchiseDashboardView snapshot={snapshot} />}
      {accessProfile.dashboardScope === 'regional' && <RegionalDashboardView snapshot={snapshot} />}
      {accessProfile.dashboardScope === 'holding' && <HoldingDashboardView snapshot={snapshot} />}
      {accessProfile.dashboardScope === 'controladoria' && (
        <ControladoriaDashboardView snapshot={snapshot} />
      )}
    </div>
  );
}
