import { useQueries, useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import { abbreviateBreadcrumbLabel } from '../../utils/breadcrumbFormat';
import { getActiveScopeHeadline } from '../auth/access';
import { useAccessProfile } from '../auth/useAccessProfile';
import { useAuth } from '../auth/useAuth';
import { COMMAND_PALETTE_HOLDING_PERIOD, type HoldingPeriodDetail } from '../../lib/commandPaletteBridge';
import { fetchDashboardSnapshot, fetchKpiHistory, fetchReportingPeriods } from '../shared/portal.api';
import { formatPeriodLabel } from '../../utils/formatters';
import { HoldingCockpitView } from './HoldingCockpitView';
import { deriveHoldingView, type HoldingFilterState } from './holdingDerivations';
import {
  buildFranchiseCompareKpiItems,
  buildHoldingCompareKpiItems,
  buildNetworkCompareKpiItems,
  buildRegionalCompareKpiItems,
} from './dashboardCompareKpis';
import {
  buildFranchiseKpis,
  buildHoldingFilteredKpis,
  buildNetworkKpis,
  buildRegionalKpis,
  holdingKpiSparkScope,
} from './kpiBuilders';
import { isKpiSparklineRpcEnabled } from './kpiSparkline';
import { formatSnapshotFreshness, getCurrentPeriodLabel } from './dashboardHelpers';
import { DashboardScopeShell } from './components/DashboardScopeShell';
import { DashboardCallout } from './components/DashboardCallout';
import { FranchiseDashboardView } from './views/FranchiseDashboardView';
import { RegionalDashboardView } from './views/RegionalDashboardView';
import { ControladoriaDashboardView } from './views/ControladoriaDashboardView';
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

const CustomizableDashboard = lazy(() =>
  import('./customizable/CustomizableDashboard').then((m) => ({ default: m.CustomizableDashboard })),
);

function DashboardScopeBodySkeleton() {
  return (
    <div className="dashboard__content dashboard-page-skeleton__body" aria-hidden="true">
      <div className="scope-layout">
        <div className="scope-layout__primary">
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
        </div>
        <aside className="scope-layout__sidebar">
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
        </aside>
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
  const [kpiTileVisible, setKpiTileVisible] = useState<Record<number, boolean>>({});

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

  useEffect(() => {
    if (!searchParams.get('view')) return;
    void import('./customizable/CustomizableDashboard');
  }, [searchParams]);

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

  useEffect(() => {
    setKpiTileVisible({});
  }, [profile?.dashboardScope, kpis.length]);

  const onKpiTileVisibilityChange = useCallback((index: number, visible: boolean) => {
    setKpiTileVisible((prev) => {
      if (prev[index] === visible) return prev;
      return { ...prev, [index]: visible };
    });
  }, []);

  const kpiHistoryQueries = useQueries({
    queries: kpis.map((item, index) => {
      const plan = item.sparklinePlan;
      const baseEnabled = Boolean(
        profile && snapshot && plan && isKpiSparklineRpcEnabled(profile, plan, snapshot, holdingDerived),
      );
      const inView = kpiTileVisible[index] ?? false;
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
        enabled: baseEnabled && inView,
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
        <div className="dashboard-scope-shell dashboard-scope-shell--skeleton">
          <div className="dashboard-scope-shell__row">
            <Skeleton style={{ width: 'min(280px, 72vw)', height: '1.1rem' }} />
            <Skeleton style={{ width: 120, height: '1.1rem' }} />
          </div>
        </div>
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

  const freshnessText = dashboardQuery.dataUpdatedAt
    ? `Leituras em ${formatSnapshotFreshness(dashboardQuery.dataUpdatedAt)} BRT`
    : null;

  return (
    <div className="dashboard page-stack u-content-reveal" data-testid="dashboard-page">
      <DashboardScopeShell
        scopeBadgeLabel={getActiveScopeHeadline(profile)}
        periodLabel={currentPeriodLabel}
        freshnessText={freshnessText}
        actions={
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
        }
      />

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

      <DashboardCallout
        accessProfile={profile}
        snapshot={snapshot}
        isDashboardFetching={dashboardQuery.isFetching}
      />

      <div id="dashboard-custom-panel" data-tour-id="dashboard-kpi-section">
        <Suspense
          fallback={
            <section className="dashboard__section dashboard__section--kpis" aria-hidden>
              <div className="kpi-grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <KpiCardSkeleton key={index} />
                ))}
              </div>
            </section>
          }
        >
          <CustomizableDashboard
            dashboardScope={profile.dashboardScope}
            snapshot={snapshot}
            accessProfile={profile}
            holdingDerived={holdingDerived}
            queries={{ kpis, kpiSparklineStates, onKpiTileVisibilityChange }}
          />
        </Suspense>
      </div>

      <section className="dashboard__section dashboard__section--scope" aria-labelledby="dashboard-scope-heading">
        <h2 id="dashboard-scope-heading" className="dashboard__section-heading">
          Vista do escopo
        </h2>
        {profile.dashboardScope === 'franchise' && <FranchiseDashboardView snapshot={snapshot} />}
        {profile.dashboardScope === 'regional' && <RegionalDashboardView snapshot={snapshot} />}
        {profile.dashboardScope === 'holding' && (
          <HoldingCockpitView derived={holdingDerived} onPatchFilters={patchHoldingFilters} />
        )}
        {profile.dashboardScope === 'controladoria' && (
          <ControladoriaDashboardView snapshot={snapshot} />
        )}
      </section>

      <InsightsPanel
        accessProfile={profile}
        accessToken={session?.access_token ?? null}
        holdingDerived={holdingDerived}
        onInvestigateEvidence={handleInsightInvestigate}
      />
    </div>
  );
}
