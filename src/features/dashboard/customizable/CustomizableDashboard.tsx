/**
 * Painel com react-grid-layout (`Responsive` + `WidthProvider`).
 * **Mobile (U21):** por baixo de 768px não usamos o grid interativo — apenas coluna única estática
 * (sem drag/resize). Isto evita o RGL de “lutar” com breakpoints e hydration.
 * **Fallback se RGL falhar com SSR/hydration (não é o caso típico nesta SPA Vite):** trocar por
 * `@dnd-kit/core` com layout JSON compatível (mesmos `x,y,w,h` normalizados).
 */
import type { Layout, Layouts } from 'react-grid-layout';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, PencilLine, RotateCcw, Share2, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { AccessProfile } from '../../auth/auth.types';
import type { DashboardScope } from '../../auth/auth.types';
import type { RoleCode } from '../../auth/auth.types';
import type { DerivedHoldingView } from '../holdingDerivations';
import type { DashboardSnapshot } from '../../shared/portal.types';
import type { ExecutiveKpiItem } from '../ExecutiveKpiGrid';
import type { DashboardKpiSparklineState } from '../../../components/ui/KpiCard';
import type { DashboardWidgetRuntimeProps } from './dashboard-widget.types';
import { useAuth } from '../../auth/useAuth';
import type { WidgetConfig, WidgetLayoutRgl, WidgetType } from './dashboardLayout.types';
import { normalizeRoleCode } from './dashboardLayout.types';
import { cloneDefaultWidgets } from './defaultLayouts';
import { fetchDashboardLayout, upsertDashboardLayout } from './dashboardLayouts.api';
import { decodeLayoutShare, encodeLayoutShare, payloadByteSize, LAYOUT_SHARE_MAX_BYTES } from './layoutCodec';
import { LazyWidget } from './LazyWidget';
import { WidgetGallery } from './WidgetGallery';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './CustomizableDashboard.css';

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 8, sm: 4, xs: 4, xxs: 2 };

const ALLOWED_WIDGET_TYPES = new Set<WidgetType>([
  'kpi',
  'sparkline',
  'ranking',
  'trend-chart',
  'pending-queue',
  'audit-feed',
]);

const lazyWidgets: Record<
  WidgetType,
  React.LazyExoticComponent<React.ComponentType<DashboardWidgetRuntimeProps>>
> = {
  kpi: lazy(() => import('./widgets/KpiWidget')),
  sparkline: lazy(() => import('./widgets/SparklineWidget')),
  ranking: lazy(() => import('./widgets/RankingWidget')),
  'trend-chart': lazy(() => import('./widgets/TrendChartWidget')),
  'pending-queue': lazy(() => import('./widgets/PendingQueueWidget')),
  'audit-feed': lazy(() => import('./widgets/AuditFeedWidget')),
};

export type CustomizableDashboardProps = {
  dashboardScope: DashboardScope;
  snapshot: DashboardSnapshot;
  accessProfile: AccessProfile;
  holdingDerived: DerivedHoldingView | null;
  queries: {
    kpis: ExecutiveKpiItem[];
    kpiSparklineStates: DashboardKpiSparklineState[];
  };
};

function useMediaMaxWidth767() {
  const query = '(max-width: 767px)';
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);

  return matches;
}

function coerceWidgets(raw: unknown): WidgetConfig[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((w): WidgetConfig[] => {
    if (!w || typeof w !== 'object') {
      return [];
    }
    const o = w as Record<string, unknown>;
    const type = o.type as WidgetType;
    if (!ALLOWED_WIDGET_TYPES.has(type)) {
      return [];
    }
    const layout = o.layout as WidgetLayoutRgl | undefined;
    if (!layout || typeof layout.w !== 'number') {
      return [];
    }
    const id = typeof o.id === 'string' ? o.id : crypto.randomUUID();
    const props = typeof o.props === 'object' && o.props !== null ? (o.props as Record<string, unknown>) : {};
    return [{ id, type, layout: { ...layout }, props }];
  });
}

function toLayout(items: WidgetConfig[], maxCols: number): Layout[] {
  return items.map((w) => ({
    i: w.id,
    x: Math.max(0, Math.min(w.layout.x, Math.max(maxCols - 1, 0))),
    y: w.layout.y,
    w: Math.max(1, Math.min(w.layout.w, maxCols)),
    h: Math.max(w.layout.minH ?? 2, w.layout.h),
    minW: w.layout.minW,
    minH: w.layout.minH,
  }));
}

function stackLayouts(items: WidgetConfig[], cols: number): Layout[] {
  let y = 0;
  return items.map((w) => {
    const h = Math.max(w.layout.minH ?? 2, w.layout.h);
    const lay: Layout = {
      i: w.id,
      x: 0,
      y,
      w: cols,
      h,
      minH: w.layout.minH ?? 2,
      minW: Math.min(w.layout.minW ?? 2, cols),
    };
    y += h;
    return lay;
  });
}

function buildResponsiveLayouts(ws: WidgetConfig[]): Layouts {
  return {
    lg: toLayout(ws, cols.lg),
    md: toLayout(ws, cols.md),
    sm: stackLayouts(ws, cols.sm),
    xs: stackLayouts(ws, cols.xs),
    xxs: stackLayouts(ws, cols.xxs),
  };
}

function mergeLayoutIntoWidgets(widgets: WidgetConfig[], layout: Layout[]): WidgetConfig[] {
  const byId = new Map(layout.map((l) => [l.i, l]));
  return widgets.map((w) => {
    const l = byId.get(w.id);
    if (!l) {
      return w;
    }
    return {
      ...w,
      layout: {
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        minW: w.layout.minW,
        minH: w.layout.minH,
      },
    };
  });
}

function defaultBlueprint(type: WidgetType): Omit<WidgetConfig, 'id'> {
  switch (type) {
    case 'kpi':
      return { type, layout: { x: 0, y: 0, w: 12, h: 6, minW: 4, minH: 4 }, props: {} };
    case 'sparkline':
      return {
        type,
        layout: { x: 0, y: 0, w: 6, h: 5, minW: 3, minH: 4 },
        props: { kpiIndex: 0 },
      };
    case 'ranking':
      return {
        type,
        layout: { x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
        props: { variant: 'top-ebitda', limit: 6 },
      };
    case 'trend-chart':
      return {
        type,
        layout: { x: 0, y: 0, w: 8, h: 7, minW: 4, minH: 5 },
        props: { metric: 'ebitda_2' },
      };
    case 'pending-queue':
      return {
        type,
        layout: { x: 0, y: 0, w: 12, h: 7, minW: 4, minH: 5 },
        props: { limit: 10 },
      };
    case 'audit-feed':
      return {
        type,
        layout: { x: 0, y: 0, w: 6, h: 7, minW: 4, minH: 5 },
        props: { limit: 8 },
      };
    default:
      return {
        type: 'kpi',
        layout: { x: 0, y: 0, w: 12, h: 6, minW: 4, minH: 4 },
        props: {},
      };
  }
}

function appendWidgetAtBottom(widgets: WidgetConfig[], type: WidgetType): WidgetConfig[] {
  const bottom = widgets.reduce((m, w) => Math.max(m, w.layout.y + w.layout.h), 0);
  const bp = defaultBlueprint(type);
  return [...widgets, { ...bp, id: crypto.randomUUID(), layout: { ...bp.layout, y: bottom } }];
}

export function CustomizableDashboard({
  dashboardScope,
  snapshot,
  accessProfile,
  holdingDerived,
  queries,
}: CustomizableDashboardProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaMaxWidth767();

  const roleCode: RoleCode = normalizeRoleCode(accessProfile.primaryRole?.code ?? accessProfile.roleCodes[0]);

  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => cloneDefaultWidgets(roleCode, dashboardScope));
  const [editMode, setEditMode] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const debounceTimer = useRef<number | null>(null);
  const [importBanner, setImportBanner] = useState<{ ok: boolean; detail?: string } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await fetchDashboardLayout(user.id, dashboardScope);
      if (cancelled) {
        return;
      }
      if (row?.widgets?.length) {
        setWidgets(coerceWidgets(row.widgets));
      } else {
        setWidgets(cloneDefaultWidgets(roleCode, dashboardScope));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, dashboardScope, roleCode]);

  /** Oferta de importação (?layout=) */
  useEffect(() => {
    const token = searchParams.get('layout');
    if (!token) {
      return;
    }
    const decoded = decodeLayoutShare(token);
    if (!decoded?.widgets?.length) {
      setImportBanner({
        ok: false,
        detail: 'O parâmetro de layout está inválido ou excede o tamanho máximo.',
      });
      return;
    }
    setImportBanner({ ok: true, detail: 'Encontramos um layout partilhado.' });
    // Mantém banner até o utilizador aceitar/recusar
  }, [searchParams]);

  const layouts = useMemo(() => buildResponsiveLayouts(widgets), [widgets]);

  const flushPersist = useCallback(
    async (next: WidgetConfig[]) => {
      const payload = { widgets: next };
      const bytes = payloadByteSize(payload);
      if (bytes > LAYOUT_SHARE_MAX_BYTES) {
        console.warn('[dashboard] layout omitido pelo limite', bytes);
        return;
      }
      if (!user?.id) {
        return;
      }
      await upsertDashboardLayout({
        userId: user.id,
        scope: dashboardScope,
        roleCode,
        widgets: next,
      });
    },
    [dashboardScope, roleCode, user],
  );

  const schedulePersist = useCallback(
    (next: WidgetConfig[]) => {
      window.clearTimeout(debounceTimer.current ?? undefined);
      debounceTimer.current = window.setTimeout(() => {
        void flushPersist(next);
      }, 1000);
    },
    [flushPersist],
  );

  const handleLayoutChange = useCallback(
    (_layout: Layout[], allLayouts: Layouts) => {
      if (!editMode || isMobile) {
        return;
      }
      const lg = allLayouts.lg;
      if (!lg) {
        return;
      }
      setWidgets((prev) => {
        const merged = mergeLayoutIntoWidgets(prev, lg);
        schedulePersist(merged);
        return merged;
      });
    },
    [editMode, isMobile, schedulePersist],
  );

  const exitEditMode = useCallback(async () => {
    setEditMode(false);
    window.clearTimeout(debounceTimer.current ?? undefined);
    await flushPersist(widgets);
  }, [flushPersist, widgets]);

  const onPropsPatch = useCallback((id: string, nextProps: Record<string, unknown>) => {
    setWidgets((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, props: { ...w.props, ...nextProps } } : w,
      );
      schedulePersist(next);
      return next;
    });
  }, [schedulePersist]);

  const removeWidget = useCallback(
    (id: string) => {
      setWidgets((prev) => {
        const next = prev.filter((w) => w.id !== id);
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  const onPickGallery = useCallback(
    (type: WidgetType) => {
      setWidgets((prev) => {
        const next = appendWidgetAtBottom(prev, type);
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  const handleResetTemplate = useCallback(() => {
    if (
      !window.confirm(
        'Repor para o modelo padrão deste papel? O layout atual deixa de ser utilizado até voltar a personalizar.',
      )
    ) {
      return;
    }
    const next = cloneDefaultWidgets(roleCode, dashboardScope);
    setWidgets(next);
    void flushPersist(next);
  }, [dashboardScope, flushPersist, roleCode]);

  const copyShareLink = useCallback(async () => {
    const payload = { widgets };
    try {
      const encoded = encodeLayoutShare(payload);
      const base = `${window.location.origin}${window.location.pathname}`;
      const link = `${base}?layout=${encoded}`;
      await navigator.clipboard.writeText(link);
    } catch {
      alert('O layout ficou grande demais para copiar (>50 kb). Elimine widgets ou simplifique antes de partilhar.');
    }
  }, [widgets]);

  const acceptImportedLayout = useCallback(() => {
    const token = searchParams.get('layout');
    if (!token) {
      return;
    }
    const decoded = decodeLayoutShare(token);
    if (!decoded) {
      return;
    }
    const next = coerceWidgets(decoded.widgets);
    setWidgets(next);
    void flushPersist(next);
    setImportBanner(null);
    const params = new URLSearchParams(searchParams);
    params.delete('layout');
    setSearchParams(params, { replace: true });
  }, [flushPersist, searchParams, setSearchParams]);

  const dismissImport = useCallback(() => {
    setImportBanner(null);
    const params = new URLSearchParams(searchParams);
    params.delete('layout');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const runtimeProps = (cfg: WidgetConfig): DashboardWidgetRuntimeProps => ({
    config: cfg,
    onPropsPatch,
    kpis: queries.kpis,
    kpiSparklineStates: queries.kpiSparklineStates,
    snapshot,
    accessProfile,
    holdingDerived,
    editMode,
  });

  const renderWidgetBody = (cfg: WidgetConfig) => {
    const Comp = lazyWidgets[cfg.type];
    return (
      <Suspense fallback={<p className="text-secondary">A carregar widget…</p>}>
        <LazyWidget className="dashboard-grid-tile__lazy">
          <Comp {...runtimeProps(cfg)} />
        </LazyWidget>
      </Suspense>
    );
  };

  const gridItems = widgets.map((w) => (
    <div key={w.id} className="dashboard-grid-tile">
      {editMode ? (
        <button
          type="button"
          className="dashboard-grid-tile__remove no-drag"
          aria-label="Remover widget"
          onClick={() => removeWidget(w.id)}
        >
          ×
        </button>
      ) : null}
      {renderWidgetBody(w)}
    </div>
  ));

  const mobileStack = (
    <div className="dashboard-mobile-stack">{widgets.map((w) => (
      <div key={w.id} className="dashboard-grid-tile">
        {editMode ? (
          <button type="button" className="dashboard-grid-tile__remove no-drag" onClick={() => removeWidget(w.id)} aria-label="Remover widget">
            ×
          </button>
        ) : null}
        {renderWidgetBody(w)}
      </div>
    ))}</div>
  );

  return (
    <>
      <div className="dashboard-custom-toolbar">
        <button
          type="button"
          className={editMode ? 'btn btn--gold' : 'btn btn--secondary'}
          onClick={() => (editMode ? void exitEditMode() : setEditMode(true))}
        >
          {editMode ? <PencilLine size={18} /> : <LayoutGrid size={18} />}
          {editMode ? 'Concluir personalização' : 'Personalizar'}
        </button>
        {editMode ? (
          <button type="button" className="btn btn--secondary no-drag" onClick={() => setGalleryOpen(true)}>
            <Plus size={18} />
            Adicionar widget
          </button>
        ) : null}
        <button type="button" className="btn btn--secondary no-drag" onClick={handleResetTemplate}>
          <RotateCcw size={18} />
          Repor layout
        </button>
        <button type="button" className="btn btn--secondary no-drag" onClick={() => void copyShareLink()}>
          <Share2 size={18} />
          Copiar link com layout
        </button>
      </div>

      {importBanner?.ok ? (
        <div className="dashboard-custom-toolbar__notice" role="status">
          Layout partilhado na URL.&nbsp;
          <button type="button" className="btn btn--secondary btn--small" onClick={acceptImportedLayout}>
            Importar layout
          </button>{' '}
          <button type="button" className="btn btn--ghost btn--small" onClick={dismissImport}>
            Ignorar
          </button>
        </div>
      ) : null}

      {!importBanner?.ok && importBanner?.detail ? (
        <div className="inline-message inline-message--danger" role="alert">
          {importBanner.detail}
        </div>
      ) : null}

      <section className="dashboard__section" aria-labelledby="dashboard-custom-widgets-heading">
        <h2 id="dashboard-custom-widgets-heading" className="dashboard__section-heading">
          Painel personalizável
        </h2>
        {isMobile ? (
          mobileStack
        ) : (
          <ResponsiveReactGridLayout
            className={`dashboard-rgl layout${editMode ? ' dashboard-rgl--edit' : ''}`}
            layouts={layouts}
            breakpoints={breakpoints}
            cols={cols}
            draggableCancel=".no-drag"
            rowHeight={32}
            margin={[12, 12]}
            compactType="vertical"
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={handleLayoutChange}
          >
            {gridItems}
          </ResponsiveReactGridLayout>
        )}
      </section>

      <WidgetGallery open={galleryOpen} onOpenChange={setGalleryOpen} onPick={onPickGallery} />
    </>
  );
}
