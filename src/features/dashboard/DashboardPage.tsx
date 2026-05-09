import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
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
import { Link, useSearchParams } from 'react-router-dom';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import { abbreviateBreadcrumbLabel } from '../../utils/breadcrumbFormat';
import { getActiveScopeHeadline, getDashboardScopeLabel } from '../auth/access';
import type { AccessProfile } from '../auth/auth.types';
import { useAccessProfile } from '../auth/useAccessProfile';
import { useAuth } from '../auth/useAuth';
import { COMMAND_PALETTE_HOLDING_PERIOD, type HoldingPeriodDetail } from '../../lib/commandPaletteBridge';
import { fetchDashboardSnapshot, fetchKpiHistory, fetchReportingPeriods } from '../shared/portal.api';
import type {
  CurrentSubmissionRow,
  DashboardSnapshot,
  DreStatementRow,
  FranchiseDashboardRow,
  NetworkDashboardRow,
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
import { buildHoldingTotals, deriveHoldingView, type DerivedHoldingView, type HoldingFilterState } from './holdingDerivations';
import {
  pickOfficialFranchiseRowsForExecutiveKpis,
} from './dashboardQuery';
import {
  buildFranchiseCompareKpiItems,
  buildHoldingCompareKpiItems,
  buildNetworkCompareKpiItems,
  buildRegionalCompareKpiItems,
} from './dashboardCompareKpis';
import type { ExecutiveKpiItem, ExecutiveKpiSparklinePlan } from './ExecutiveKpiGrid';
import { CustomizableDashboard } from './customizable/CustomizableDashboard';
import { InsightsPanel } from './insights/InsightsPanel';
import { SaveViewDialog } from '../saved-views/SaveViewDialog';
import { SavedViewsBar } from '../saved-views/SavedViewsBar';
import {
  emptyFiltersForPage,
  parseSavedFilters,
  SAVED_FILTERS_VERSION,
  stableFiltersFingerprint,
  type SavedViewFiltersV1,
} from '../saved-views/savedViewFilters';
import { applyFiltersToSearchParams, clearFilterParams } from '../saved-views/savedViewUrl';
import { useSaveViewSuggestion } from '../saved-views/useSaveViewSuggestion';
import { useCompareMode } from '../../hooks/useCompareMode';
import { useSavedViewsList, useSavedViewsMutations } from '../../hooks/useSavedViews';
import { parseReportingPeriodKey, reportingPeriodKey } from '../../utils/reportingPeriodKeys';
import { ExportButton, formatDashboardPeriodDisplay } from '../export/ExportButton';
import {
  buildDashboardFiltersSnapshot,
  buildDashboardRankingRows,
} from '../export/dashboardExportModel';
import type { DashboardKpiSparklineState } from '../../components/ui/KpiCard';
import './DashboardPage.css';
import { CockpitSkeleton, KpiCardSkeleton, TableRowSkeleton } from '../../components/skeletons';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/card';
import '../../components/skeletons/skeleton-shared.css';

function isKpiSparklineRpcEnabled(
  profile: AccessProfile,
  plan: ExecutiveKpiSparklinePlan | null,
  snapshot: DashboardSnapshot,
  holdingDerived: DerivedHoldingView | null,
): boolean {
  if (!plan) {
    return false;
  }
  if (profile.dashboardScope === 'franchise') {
    return plan.franchiseId != null;
  }
  if (profile.dashboardScope === 'regional') {
    return plan.regionalId != null && snapshot.latestRegional != null;
  }
  if (profile.dashboardScope === 'holding') {
    return holdingDerived != null && snapshot.latestNetwork != null;
  }
  if (profile.dashboardScope === 'controladoria') {
    return snapshot.latestNetwork != null;
  }
  return false;
}

function buildFranchiseKpis(snapshot: DashboardSnapshot): ExecutiveKpiItem[] {
  const { current, previous } = pickOfficialFranchiseRowsForExecutiveKpis(snapshot.franchiseRows);

  if (!current) {
    return [];
  }

  const fid = current.franchise_id;

  return [
    {
      label: 'Receita bruta',
      value: formatCurrency(current.gross_revenue),
      percent: 'Total faturado pela unidade',
      trend: formatDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      variant: 'gold',
      icon: DollarSign,
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
    {
      label: 'Margem de contribuição 1',
      value: formatCurrency(current.mc1),
      percent: `${formatPercent(current.mc1_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      variant: 'default',
      icon: BarChart3,
      sparklinePlan: {
        metric: 'mc1',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
    {
      label: 'Margem de contribuição 2',
      value: formatCurrency(current.mc2),
      percent: `${formatPercent(current.mc2_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      variant: 'default',
      icon: Target,
      sparklinePlan: {
        metric: 'mc2',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
    {
      label: 'EBITDA 2',
      value: formatCurrency(current.ebitda_2),
      percent: `${formatPercent(current.ebitda2_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.ebitda_2, previous?.ebitda_2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.ebitda_2, previous?.ebitda_2 ?? null)),
      variant: 'success',
      icon: TrendingUp,
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
  ];
}

function buildRegionalKpis(snapshot: DashboardSnapshot): ExecutiveKpiItem[] {
  if (!snapshot.latestRegional) {
    return [];
  }

  const current = snapshot.latestRegional;
  const previous = snapshot.previousRegional;
  const rid = current.regional_id;

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
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: rid,
      },
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
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: rid,
      },
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)} de ${formatInteger(current.total_franchises)} unidades`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: CheckCircle2,
      sparklinePlan: {
        metric: 'approved_submission_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: rid,
      },
    },
    {
      label: 'Em ajuste',
      value: formatInteger(current.pending_count),
      percent: `${formatPercent(current.avg_default_pct)} de inadimplência média`,
      trend: formatDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      trendUp: !isPositiveDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      variant: 'warning',
      icon: AlertTriangle,
      sparklinePlan: {
        metric: 'adjustment_pipeline_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: rid,
      },
    },
  ];
}

function holdingKpiSparkScope(
  derived: DerivedHoldingView,
): Pick<ExecutiveKpiSparklinePlan, 'franchiseId' | 'regionalId'> {
  if (derived.effectiveFranchiseId !== 'all') {
    return { franchiseId: derived.effectiveFranchiseId, regionalId: null };
  }
  if (derived.effectiveRegionalId !== 'all') {
    return { franchiseId: null, regionalId: derived.effectiveRegionalId };
  }
  return { franchiseId: null, regionalId: null };
}

function buildHoldingFilteredKpis(
  currentRows: FranchiseDashboardRow[],
  previousRows: FranchiseDashboardRow[],
  sparkScope: Pick<ExecutiveKpiSparklinePlan, 'franchiseId' | 'regionalId'>,
): ExecutiveKpiItem[] {
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
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
    {
      label: 'EBITDA 2 do recorte',
      value: formatCurrency(current.totalEbitda2),
      percent: `${formatPercent(current.avgMarginPct)} margem consolidada`,
      trend: formatDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      trendUp: isPositiveDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      variant: 'success',
      icon: TrendingUp,
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approvedCount),
      percent: `${formatInteger(current.approvedCount)}/${formatInteger(current.totalFranchises)} no filtro`,
      trend: formatDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      trendUp: isPositiveDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      variant: 'default',
      icon: ShieldCheck,
      sparklinePlan: {
        metric: 'approved_submission_count',
        valueFormat: 'integer',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
    {
      label: 'Em ajuste / fila',
      value: formatInteger(current.pendingCount),
      percent: `Pior margem: ${formatPercent(current.minMarginPct)}`,
      trend: formatDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      trendUp: !isPositiveDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      variant: 'warning',
      icon: ClipboardList,
      sparklinePlan: {
        metric: 'adjustment_pipeline_count',
        valueFormat: 'integer',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
  ];
}

function buildNetworkKpis(snapshot: DashboardSnapshot): ExecutiveKpiItem[] {
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
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: null,
      },
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
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: null,
      },
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)} de ${formatInteger(current.total_franchises)} franquias`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: ShieldCheck,
      sparklinePlan: {
        metric: 'approved_submission_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: null,
      },
    },
    {
      label: 'Aguardando ação',
      value: formatInteger(current.pending_count),
      percent: `Pior margem hoje: ${formatPercent(current.min_ebitda2_pct)}`,
      trend: formatDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      trendUp: !isPositiveDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      variant: 'warning',
      icon: ClipboardList,
      sparklinePlan: {
        metric: 'adjustment_pipeline_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: null,
      },
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

function formatSnapshotFreshness(updatedAtMs: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(updatedAtMs));
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
      <Card as="section" variant="hero" className="dashboard-hero card--gold">
        <div className="dashboard-hero__copy">
          <span
            className="badge badge--gold dashboard-hero__scope-badge"
            title={getActiveScopeHeadline(accessProfile)}
          >
            {getActiveScopeHeadline(accessProfile)}
          </span>
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
      </Card>
    </div>
  );
}

function RecentSubmissionsCard({ rows }: { rows: CurrentSubmissionRow[] }) {
  if (!rows.length) {
    return (
      <div className="card card--v-kpi">
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
    <div className="card card--v-kpi">
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
    <div className="card card--v-inline">
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
                    <td className="align-right num-tabular">{formatCurrency(row.gross_revenue)}</td>
                    <td className="align-right num-tabular">{formatCurrency(row.ebitda_2)}</td>
                    <td className="align-right num-tabular">{formatInteger(row.open_issues_count)}</td>
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

function FranchiseDashboardView({
  snapshot,
  dreLines,
  franchiseRow: franchiseRowProp,
  submissionsRows,
}: {
  snapshot: DashboardSnapshot;
  dreLines?: DreStatementRow[];
  franchiseRow?: FranchiseDashboardRow | null;
  submissionsRows?: CurrentSubmissionRow[];
}) {
  const current = franchiseRowProp ?? snapshot.latestFranchise;
  const dre = dreLines ?? snapshot.currentDre;
  const submissions = submissionsRows ?? snapshot.currentSubmissions;

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
                  {dre.map((row) => (
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
                      <td className="align-right num-tabular">{formatCurrency(row.value_currency)}</td>
                      <td className="align-right num-tabular text-secondary">
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
          <Card variant="kpi">
            <div className="card__header">
              <h3 className="card__title">Status do período</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Competência</span>
                  <span className="detail-list__value competence-etiquette">
                    {formatPeriodLabel(current.period_label)}
                  </span>
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
                    {(
                      submissions.find(
                        (s) =>
                          s.franchise_id === current.franchise_id &&
                          s.period_year === current.period_year &&
                          s.period_month === current.period_month,
                      ) ?? submissions[0]
                    )?.version_number ?? '—'}
                  </span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Regional</span>
                  <span className="detail-list__value">{current.regional_name}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Enviado em</span>
                  <span className="detail-list__value">
                    {formatDateTime(
                      (
                        submissions.find(
                          (s) =>
                            s.franchise_id === current.franchise_id &&
                            s.period_year === current.period_year &&
                            s.period_month === current.period_month,
                        ) ?? submissions[0]
                      )?.submitted_at ?? null,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Card>

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
        <Card variant="hero" className="card--accent">
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
                      <td className="align-right num-tabular">{formatCurrency(row.gross_revenue)}</td>
                      <td className="align-right num-tabular">{formatCurrency(row.ebitda_2)}</td>
                      <td className="align-right num-tabular">{formatPercent(row.ebitda2_pct)}</td>
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
        </Card>

        <div className="dashboard__side">
          <Card variant="default">
            <div className="card__header">
              <h3 className="card__title">Resumo regional</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Franquias na carteira</span>
                  <span className="detail-list__value num-tabular">{formatInteger(current.total_franchises)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Aprovadas</span>
                  <span className="detail-list__value num-tabular">{formatInteger(current.approved_count)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Pendentes</span>
                  <span className="detail-list__value num-tabular">{formatInteger(current.pending_count)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">MC1 média</span>
                  <span className="detail-list__value num-tabular">{formatPercent(current.avg_mc1_pct)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Marketing médio</span>
                  <span className="detail-list__value num-tabular">{formatPercent(current.avg_marketing_pct)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="default">
            <div className="card__header">
              <h3 className="card__title">Top 5 unidades por margem</h3>
            </div>
            <div className="card__body">
              <div className="list-stack">
                {getTopFranchises(currentRows).map((row) => (
                  <div key={row.submission_id} className="list-row">
                    <div>
                      <div className="list-row__title">{row.franchise_name}</div>
                      <div className="list-row__meta num-tabular">{formatPercent(row.ebitda2_pct)} de margem</div>
                    </div>
                    <div className="list-row__value num-tabular">{formatCurrency(row.ebitda_2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ControladoriaDashboardView({
  snapshot,
  networkRow: networkRowProp,
  franchiseRowsForCritical,
}: {
  snapshot: DashboardSnapshot;
  networkRow?: NetworkDashboardRow | null;
  franchiseRowsForCritical?: FranchiseDashboardRow[];
}) {
  const current = networkRowProp ?? snapshot.latestNetwork;
  const currentRows = franchiseRowsForCritical ?? getCurrentPeriodFranchiseRows(snapshot);

  return (
    <div className="dashboard__content page-stack">
      <PendingReviewsCard rows={snapshot.pendingReviews} />

      <div className="page-grid page-grid--wide">
        <Card variant="default">
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
                    <div className="num-tabular">{formatPercent(row.ebitda2_pct)}</div>
                    <div className="list-row__meta num-tabular">{formatCurrency(row.ebitda_2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="dashboard__side">
          <Card variant="kpi">
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
          </Card>

          <RecentSubmissionsCard rows={snapshot.currentSubmissions} />
        </div>
      </div>
    </div>
  );
}

function DashboardScopeBodySkeleton() {
  return (
    <div className="dashboard__content dashboard-page-skeleton__body" aria-hidden="true">
      <div className="content-grid content-grid--sidebar">
        <Card variant="hero" className="card--accent">
          <div className="card__header">
            <Skeleton style={{ width: '44%', maxWidth: 280, height: '1rem' }} />
          </div>
          <div className="card__body card__body--compact">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Col 1</th>
                    <th>Col 2</th>
                    <th className="align-right">Valor A</th>
                    <th className="align-right">Valor B</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton columns={5} lineCount={5} />
                </tbody>
              </table>
            </div>
          </div>
        </Card>
        <div className="dashboard__side">
          <Card variant="kpi">
            <div className="card__header">
              <Skeleton style={{ width: '55%', height: '1rem' }} />
            </div>
            <div className="card__body">
              <div className="detail-list">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="detail-list__item">
                    <Skeleton style={{ width: '42%', height: '0.75rem' }} />
                    <Skeleton style={{ width: '28%', height: '0.75rem' }} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const accessProfileQuery = useAccessProfile();
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [holdingFilters, setHoldingFilters] = useState<HoldingFilterState>(() => ({
    selectedPeriodLabel: '',
    selectedRegionalId: 'all',
    selectedFranchiseId: 'all',
  }));
  const uid = session?.user?.id;
  const savedViewsList = useSavedViewsList(uid, 'dashboard');
  const savedViewsMut = useSavedViewsMutations(uid);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const viewIdParam = searchParams.get('view');

  const dashboardBreadcrumbSegments = useMemo(() => {
    const profile = accessProfileQuery.data;
    if (!profile) {
      return [];
    }
    return [
      { label: 'Portal', href: '/app/dashboard' },
      { label: 'Painel', href: '/app/dashboard' },
      { label: abbreviateBreadcrumbLabel(getActiveScopeHeadline(profile)) },
    ];
  }, [accessProfileQuery.data]);

  useBreadcrumb(dashboardBreadcrumbSegments);

  const patchHoldingFilters = useCallback((patch: Partial<HoldingFilterState>) => {
    setHoldingFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const dashboardFiltersTyped = useMemo((): SavedViewFiltersV1 => {
    const hasHoldingFilters =
      Boolean(holdingFilters.selectedPeriodLabel.trim()) ||
      holdingFilters.selectedRegionalId !== 'all' ||
      holdingFilters.selectedFranchiseId !== 'all';
    if (!hasHoldingFilters) {
      return emptyFiltersForPage('dashboard');
    }
    return {
      page: 'dashboard',
      v: SAVED_FILTERS_VERSION,
      holding: {
        selectedPeriodLabel: holdingFilters.selectedPeriodLabel,
        selectedRegionalId: holdingFilters.selectedRegionalId,
        selectedFranchiseId: holdingFilters.selectedFranchiseId,
      },
    };
  }, [holdingFilters]);

  const defaultDashboardFiltersFingerprint = useMemo(
    () => stableFiltersFingerprint(emptyFiltersForPage('dashboard')),
    [],
  );

  const dashboardFiltersFingerprint = useMemo(
    () => stableFiltersFingerprint(dashboardFiltersTyped),
    [dashboardFiltersTyped],
  );

  const suggestion = useSaveViewSuggestion('dashboard', dashboardFiltersFingerprint, {
    disabled: accessProfileQuery.data?.dashboardScope !== 'holding',
    isDefaultFingerprint: dashboardFiltersFingerprint === defaultDashboardFiltersFingerprint,
  });

  const handleInsightInvestigate = useCallback(
    (evidence: Record<string, unknown>) => {
      const scope = accessProfileQuery.data?.dashboardScope;
      const period =
        (typeof evidence.period_label === 'string' && evidence.period_label) ||
        (typeof evidence.last_period_label === 'string' && evidence.last_period_label) ||
        null;
      const regional = typeof evidence.regional_id === 'string' ? evidence.regional_id : null;
      const franchise = typeof evidence.franchise_id === 'string' ? evidence.franchise_id : null;

      if (scope === 'holding' || scope === 'controladoria') {
        setHoldingFilters((prev) => ({
          ...prev,
          ...(period ? { selectedPeriodLabel: period } : {}),
          ...(regional
            ? { selectedRegionalId: regional, selectedFranchiseId: franchise ?? 'all' }
            : {}),
          ...(!regional && franchise ? { selectedFranchiseId: franchise } : {}),
        }));
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (period) next.set('d_period', period);
            else next.delete('d_period');
            if (regional) next.set('d_regional', regional);
            else next.delete('d_regional');
            if (franchise) next.set('d_franchise', franchise);
            else next.delete('d_franchise');
            return next;
          },
          { replace: true },
        );
        return;
      }

      document.getElementById('dashboard-custom-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    },
    [accessProfileQuery.data?.dashboardScope, setSearchParams],
  );

  const dashboardUrlSyncKey = searchParams.toString();

  useEffect(() => {
    if (accessProfileQuery.data?.dashboardScope !== 'holding') {
      return;
    }
    const p = searchParams.get('d_period');
    const r = searchParams.get('d_regional');
    const f = searchParams.get('d_franchise');
    if (!p && !r && !f) {
      return;
    }
    setHoldingFilters((prev) => {
      const next = { ...prev };
      if (p) next.selectedPeriodLabel = p;
      if (r) {
        next.selectedRegionalId = r;
        next.selectedFranchiseId = f && f.length > 0 ? f : 'all';
      } else if (f) {
        next.selectedFranchiseId = f;
      }
      return next;
    });
  }, [accessProfileQuery.data?.dashboardScope, dashboardUrlSyncKey, searchParams]);

  useEffect(() => {
    if (accessProfileQuery.data?.dashboardScope !== 'holding') {
      return;
    }
    const onHoldingPeriod = (event: Event) => {
      const ce = event as CustomEvent<HoldingPeriodDetail>;
      const label = ce.detail?.periodLabel;
      if (typeof label === 'string' && label.length > 0) {
        setHoldingFilters((prev) => ({ ...prev, selectedPeriodLabel: label }));
      }
    };
    window.addEventListener(COMMAND_PALETTE_HOLDING_PERIOD, onHoldingPeriod);
    return () => window.removeEventListener(COMMAND_PALETTE_HOLDING_PERIOD, onHoldingPeriod);
  }, [accessProfileQuery.data?.dashboardScope]);

  const dashboardQuery = useQuery({
    queryKey: [
      'dashboard',
      accessProfileQuery.data?.dashboardScope,
      accessProfileQuery.data?.franchiseIds.join(',') ?? 'all-franchises',
      accessProfileQuery.data?.regionalIds.join(',') ?? 'all-regionals',
    ],
    queryFn: () => fetchDashboardSnapshot(accessProfileQuery.data!),
    enabled: Boolean(accessProfileQuery.data),
    /** Cockpit: menos refetch redundante ao alternar rotas; alinha ao default global 5 min PRD §13 Fase 1. */
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const reportingPeriodsQuery = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: fetchReportingPeriods,
    enabled: Boolean(accessProfileQuery.data),
  });

  const snapshot = dashboardQuery.data;
  const profile = accessProfileQuery.data;

  const holdingDerived = useMemo(() => {
    if (!snapshot || profile?.dashboardScope !== 'holding') {
      return null;
    }
    return deriveHoldingView(snapshot, holdingFilters, reportingPeriodsQuery.data ?? null);
  }, [snapshot, profile?.dashboardScope, holdingFilters, reportingPeriodsQuery.data]);

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
      return buildHoldingFilteredKpis(
        holdingDerived.executiveRollupRows,
        holdingDerived.executiveRollupPreviousRows,
        holdingKpiSparkScope(holdingDerived),
      );
    }
    return buildNetworkKpis(snapshot);
  }, [snapshot, profile, holdingDerived]);

  const kpiHistoryQueries = useQueries({
    queries: kpis.map((item) => {
      const plan = item.sparklinePlan;
      const enabled = Boolean(
        profile && snapshot && plan && isKpiSparklineRpcEnabled(profile, plan, snapshot, holdingDerived),
      );
      return {
        queryKey: [
          'kpi-history',
          plan?.metric ?? 'none',
          plan?.franchiseId ?? 'all-fr',
          plan?.regionalId ?? 'all-reg',
          profile?.dashboardScope,
        ] as const,
        queryFn: () =>
          fetchKpiHistory({
            metric: plan!.metric,
            franchiseId: plan!.franchiseId,
            regionalId: plan!.regionalId,
            periodsCount: 6,
          }),
        enabled,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
      };
    }),
  });

  const kpiSparklineStates = useMemo((): DashboardKpiSparklineState[] => {
    const disabled: DashboardKpiSparklineState = {
      enabled: false,
      isLoading: false,
      isError: false,
      data: undefined,
      valueFormat: 'currency',
    };

    if (!profile || !snapshot) {
      return kpis.map(() => disabled);
    }

    return kpis.map((item, index) => {
      const plan = item.sparklinePlan;
      const rpcEnabled = Boolean(
        plan && isKpiSparklineRpcEnabled(profile, plan, snapshot, holdingDerived),
      );
      if (!rpcEnabled || !plan) {
        return disabled;
      }
      const q = kpiHistoryQueries[index];
      return {
        enabled: true,
        isLoading: q.isPending || q.isFetching,
        isError: q.isError,
        data: q.data,
        valueFormat: plan.valueFormat,
      };
    });
  }, [holdingDerived, kpiHistoryQueries, kpis, profile, snapshot]);

  const defaultPeriodAKeyForCompare = useMemo(() => {
    if (!snapshot || !profile) return null;
    if (profile.dashboardScope === 'holding' && holdingDerived) {
      const row = snapshot.franchiseRows.find((r) => r.period_label === holdingDerived.activePeriodLabel);
      if (row) {
        return `${row.period_year}-${String(row.period_month).padStart(2, '0')}`;
      }
    }
    const lf = snapshot.latestFranchise;
    if (lf) return `${lf.period_year}-${String(lf.period_month).padStart(2, '0')}`;
    const lr = snapshot.latestRegional;
    if (lr) return `${lr.period_year}-${String(lr.period_month).padStart(2, '0')}`;
    const ln = snapshot.latestNetwork;
    if (ln) return `${ln.period_year}-${String(ln.period_month).padStart(2, '0')}`;
    return null;
  }, [snapshot, profile, holdingDerived]);

  const compareMode = useCompareMode({
    reportingPeriods: reportingPeriodsQuery.data,
    defaultPeriodAKey: defaultPeriodAKeyForCompare,
  });

  const holdingDerivedCompareA = useMemo(() => {
    if (!snapshot || profile?.dashboardScope !== 'holding' || !compareMode.periodAKey) return null;
    const p = parseReportingPeriodKey(compareMode.periodAKey);
    if (!p) return null;
    return deriveHoldingView(snapshot, holdingFilters, reportingPeriodsQuery.data ?? null, {
      anchorYear: p.year,
      anchorMonth: p.month,
    });
  }, [snapshot, profile?.dashboardScope, compareMode.periodAKey, holdingFilters, reportingPeriodsQuery.data]);

  const holdingDerivedCompareB = useMemo(() => {
    if (!snapshot || profile?.dashboardScope !== 'holding' || !compareMode.periodBKey) return null;
    const p = parseReportingPeriodKey(compareMode.periodBKey);
    if (!p) return null;
    return deriveHoldingView(snapshot, holdingFilters, reportingPeriodsQuery.data ?? null, {
      anchorYear: p.year,
      anchorMonth: p.month,
    });
  }, [snapshot, profile?.dashboardScope, compareMode.periodBKey, holdingFilters, reportingPeriodsQuery.data]);

  const compareKpiItems = useMemo(() => {
    if (!compareMode.compareEnabled || !snapshot || !profile) return [];
    const pa = parseReportingPeriodKey(compareMode.periodAKey);
    const pb = parseReportingPeriodKey(compareMode.periodBKey);
    if (!pa || !pb) return [];
    if (profile.dashboardScope === 'franchise') {
      const fid = profile.franchiseIds[0];
      if (!fid) return [];
      return buildFranchiseCompareKpiItems(snapshot, fid, pa.year, pa.month, pb.year, pb.month);
    }
    if (profile.dashboardScope === 'regional') {
      const rid = profile.regionalIds[0] ?? snapshot.latestRegional?.regional_id;
      if (!rid) return [];
      return buildRegionalCompareKpiItems(snapshot, rid, pa.year, pa.month, pb.year, pb.month);
    }
    if (profile.dashboardScope === 'holding') {
      if (!holdingDerivedCompareA || !holdingDerivedCompareB) return [];
      return buildHoldingCompareKpiItems(
        holdingDerivedCompareA.executiveRollupRows,
        holdingDerivedCompareB.executiveRollupRows,
      );
    }
    return buildNetworkCompareKpiItems(snapshot, pa.year, pa.month, pb.year, pb.month);
  }, [
    compareMode.compareEnabled,
    compareMode.periodAKey,
    compareMode.periodBKey,
    snapshot,
    profile,
    holdingDerivedCompareA,
    holdingDerivedCompareB,
  ]);

  useEffect(() => {
    if (!compareMode.compareEnabled || profile?.dashboardScope !== 'holding' || !compareMode.periodAKey) return;
    const period = reportingPeriodsQuery.data?.find((x) => reportingPeriodKey(x) === compareMode.periodAKey);
    if (period?.label && period.label !== holdingFilters.selectedPeriodLabel) {
      setHoldingFilters((prev) => ({ ...prev, selectedPeriodLabel: period.label }));
    }
  }, [
    compareMode.compareEnabled,
    compareMode.periodAKey,
    profile?.dashboardScope,
    reportingPeriodsQuery.data,
    holdingFilters.selectedPeriodLabel,
  ]);

  const exportRankingRows = useMemo(() => {
    if (!snapshot || !profile) return [];
    return buildDashboardRankingRows(snapshot, profile, holdingDerived);
  }, [snapshot, profile, holdingDerived]);

  const exportFiltersSnapshot = useMemo(
    () =>
      !snapshot || !profile
        ? ({} as Record<string, unknown>)
        : buildDashboardFiltersSnapshot(
            profile,
            snapshot,
            holdingDerived,
            profile.dashboardScope === 'holding' ? holdingFilters : null,
          ),
    [snapshot, profile, holdingDerived, holdingFilters],
  );

  const holdingActivePeriodLabel = holdingDerived?.activePeriodLabel ?? null;
  const exportPeriodLabelDisplay = useMemo(
    () => (snapshot ? formatDashboardPeriodDisplay(snapshot, holdingActivePeriodLabel) : ''),
    [snapshot, holdingActivePeriodLabel],
  );

  const exportKpis = useMemo(() => {
    if (!compareMode.compareEnabled || compareKpiItems.length === 0) {
      return kpis;
    }
    return compareKpiItems.map((item) => ({
      label: item.label,
      value: item.valueA,
      percent: item.percentA,
      trend: '—',
      trendUp: true,
      variant: item.variant,
      icon: item.icon,
    }));
  }, [compareMode.compareEnabled, compareKpiItems, kpis]);

  if (accessProfileQuery.isLoading || dashboardQuery.isLoading) {
    const scope = accessProfileQuery.data?.dashboardScope;
    const showHoldingCockpitSkeleton = scope === 'holding';

    return (
      <div className="dashboard page-stack" data-testid="dashboard-page" aria-busy="true">
        <div className="page-container__title-bar page-container__title-bar--dashboard">
          <div className="dashboard-page-skeleton__title">
            <Skeleton style={{ width: 'min(380px, 88vw)', height: '1.35rem', marginBottom: 'var(--space-2)' }} />
            <Skeleton style={{ width: 'min(280px, 70vw)', height: '0.85rem' }} />
          </div>
        </div>

        <Card as="section" variant="hero" className="dashboard-hero card--gold dashboard-page-skeleton__hero">
          <div className="dashboard-hero__copy">
            <Skeleton style={{ width: 160, height: 26, marginBottom: 'var(--space-4)' }} />
            <Skeleton style={{ width: 'min(420px, 90vw)', height: 32, marginBottom: 'var(--space-3)' }} />
            <Skeleton style={{ width: 'min(540px, 94vw)', height: 16 }} />
          </div>
          <div className="dashboard-hero__panel glass">
            <Skeleton style={{ width: '100%', height: 28, marginBottom: 'var(--space-3)' }} />
            <Skeleton style={{ width: '100%', height: 120, borderRadius: 'var(--radius-lg)' }} />
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
              <Skeleton style={{ width: 200, height: 44, borderRadius: 'var(--radius-md)' }} />
              <Skeleton style={{ width: 220, height: 44, borderRadius: 'var(--radius-md)' }} />
            </div>
          </div>
        </Card>

        <section className="dashboard__section dashboard__section--kpis" aria-labelledby="dashboard-kpis-heading-skel">
          <h2 id="dashboard-kpis-heading-skel" className="dashboard__section-heading">
            Situação na competência (resumo)
          </h2>
          <div className="kpi-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <KpiCardSkeleton key={index} />
            ))}
          </div>
        </section>

        {showHoldingCockpitSkeleton ? <CockpitSkeleton /> : <DashboardScopeBodySkeleton />}
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

  const currentPeriodLabel = formatPeriodLabel(getCurrentPeriodLabel(snapshot));

  return (
    <div className="dashboard page-stack u-content-reveal" data-testid="dashboard-page">
      <div className="page-container__title-bar page-container__title-bar--dashboard">
        <div>
          <p className="page-container__subtitle page-container__subtitle--dashboard-title">
            {getActiveScopeHeadline(profile)} · competência {currentPeriodLabel}
          </p>
        </div>
        <div className="page-container__actions page-container__actions--dashboard-tools">
          <ExportButton
            variant="dashboard"
            kpis={exportKpis}
            rankingRows={exportRankingRows}
            filtersSnapshot={exportFiltersSnapshot}
            periodLabelDisplay={exportPeriodLabelDisplay}
            snapshot={snapshot}
            holdingActivePeriodLabel={holdingActivePeriodLabel}
            accessProfile={profile}
          />
          <div className="badge-row">
            {(profile.dashboardScope === 'franchise' || profile.dashboardScope === 'regional') ? (
              <span className="badge badge--gold">{getDashboardScopeLabel(profile.dashboardScope)}</span>
            ) : null}
            <span className="badge badge--primary">{currentPeriodLabel}</span>
          </div>
        </div>
      </div>

      {dashboardQuery.dataUpdatedAt ? (
        <p
          className="page-container__subtitle page-container__subtitle--dashboard-freshness"
          role="status"
          aria-live="polite"
        >
          Leituras atualizadas em {formatSnapshotFreshness(dashboardQuery.dataUpdatedAt)} BRT.
        </p>
      ) : null}

      {profile.dashboardScope === 'holding' ? (
        <>
          <SavedViewsBar
            page="dashboard"
            views={savedViewsList.data ?? []}
            activeViewId={viewIdParam}
            currentFilters={dashboardFiltersTyped}
            shareBasePath="/app/dashboard"
            onApplyView={(row) => {
              const f = parseSavedFilters('dashboard', row.filters);
              setSearchParams(
                (prev) => applyFiltersToSearchParams('dashboard', prev, f, { viewId: row.id }),
                { replace: true },
              );
            }}
            onClearDefault={() => {
              setSearchParams((prev) => clearFilterParams('dashboard', prev), { replace: true });
            }}
            onOpenSaveDialog={() => setSaveDialogOpen(true)}
            onRename={(row, newName) => savedViewsMut.updateMutation.mutate({ id: row.id, name: newName })}
            onTogglePin={(row, pinned) => savedViewsMut.updateMutation.mutate({ id: row.id, is_pinned: pinned })}
            onDelete={(row) => savedViewsMut.deleteMutation.mutate(row.id)}
            suggestionBanner={
              suggestion.showBanner
                ? {
                    show: true,
                    onOpenDialog: () => setSaveDialogOpen(true),
                    onDismiss: suggestion.dismissBanner,
                  }
                : null
            }
          />
          <SaveViewDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            page="dashboard"
            draftFilters={dashboardFiltersTyped}
            defaultPinned
            isSaving={savedViewsMut.insertMutation.isPending}
            onSave={({ name, isPinned }) => {
              savedViewsMut.insertMutation.mutate(
                { page: 'dashboard', name, filters: dashboardFiltersTyped, isPinned },
                {
                  onSuccess: (row) => {
                    setSaveDialogOpen(false);
                    setSearchParams(
                      (prev) =>
                        applyFiltersToSearchParams('dashboard', prev, dashboardFiltersTyped, {
                          viewId: row.id,
                        }),
                      { replace: true },
                    );
                  },
                  onError: (e) =>
                    window.alert(e instanceof Error ? e.message : 'Não foi possível guardar a vista.'),
                },
              );
            }}
          />
        </>
      ) : null}

      <DashboardHero
        accessProfile={profile}
        snapshot={snapshot}
        isDashboardFetching={dashboardQuery.isFetching}
      />

      <div id="dashboard-custom-panel" data-tour-id="dashboard-kpi-section">
        <CustomizableDashboard
          dashboardScope={profile.dashboardScope}
          snapshot={snapshot}
          accessProfile={profile}
          holdingDerived={holdingDerived}
          queries={{ kpis, kpiSparklineStates }}
        />
      </div>

      {profile.dashboardScope === 'franchise' && <FranchiseDashboardView snapshot={snapshot} />}
      {profile.dashboardScope === 'regional' && <RegionalDashboardView snapshot={snapshot} />}
      {profile.dashboardScope === 'holding' && (
        <HoldingCockpitView derived={holdingDerived} onPatchFilters={patchHoldingFilters} />
      )}
      {profile.dashboardScope === 'controladoria' && (
        <ControladoriaDashboardView snapshot={snapshot} />
      )}

      <InsightsPanel
        accessProfile={profile}
        accessToken={session?.access_token ?? null}
        holdingDerived={holdingDerived}
        onInvestigateEvidence={handleInsightInvestigate}
      />
    </div>
  );
}
