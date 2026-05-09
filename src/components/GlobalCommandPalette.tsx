import type { AccessProfile } from '../features/auth/auth.types';
import { canAccessRoles } from '../features/auth/access';
import { fetchAccessibleFranchises, fetchReportingPeriods } from '../features/shared/portal.api';
import type { ReportingPeriodRow } from '../features/shared/portal.types';
import {
  dispatchClearSubmissionFocus,
  dispatchHoldingPeriodFilter,
  dispatchWorkspaceFilters,
  type WorkspaceFilterDetail,
} from '../lib/commandPaletteBridge';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { Command, useCommandState } from 'cmdk';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Command as CommandIcon,
  FileDown,
  FileSpreadsheet,
  Keyboard,
  Star,
  Sun,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatStatusLabel } from '../utils/formatters';
import { navigationSections } from '../layouts/app/navigation';
import { useAuth } from '../features/auth/useAuth';
import { pathnameToSavedViewPage } from '../features/saved-views/savedViewRoutes';
import { buildPinnedViewLocation } from '../features/saved-views/SavedViewsBar';
import { useSavedViewsList } from '../hooks/useSavedViews';
import './GlobalCommandPalette.css';

const RECENTS_KEY = 'febracis.cmdpalette.recents.v1';
const MAX_RECENTS = 5;

const PALETTE_NAV_ORDER = [
  '/app/dashboard',
  '/app/submissions',
  '/app/workflow',
  '/app/assistant',
  '/app/franchises',
  '/app/audit',
  '/app/admin',
] as const;

export type StoredRecent =
  | { kind: 'nav'; id: string; title: string; path: string; ts: number }
  | {
      kind: 'workspace';
      id: string;
      title: string;
      franchiseId?: string;
      periodId?: string;
      ts: number;
    }
  | { kind: 'holding-period'; id: string; title: string; periodLabel: string; ts: number }
  | { kind: 'action'; id: string; title: string; actionKey: string; ts: number };

/** Entrada da fila de recentes (sem timestamp) — evita `Omit` frágil sobre uniões. */
export type RecentPayload =
  | { kind: 'nav'; id: string; title: string; path: string }
  | {
      kind: 'workspace';
      id: string;
      title: string;
      franchiseId?: string;
      periodId?: string;
    }
  | { kind: 'holding-period'; id: string; title: string; periodLabel: string }
  | { kind: 'action'; id: string; title: string; actionKey: string };

function recentWithoutTs(entry: StoredRecent): RecentPayload {
  switch (entry.kind) {
    case 'nav':
      return { kind: 'nav', id: entry.id, title: entry.title, path: entry.path };
    case 'workspace':
      return {
        kind: 'workspace',
        id: entry.id,
        title: entry.title,
        franchiseId: entry.franchiseId,
        periodId: entry.periodId,
      };
    case 'holding-period':
      return { kind: 'holding-period', id: entry.id, title: entry.title, periodLabel: entry.periodLabel };
    case 'action':
      return { kind: 'action', id: entry.id, title: entry.title, actionKey: entry.actionKey };
  }
}

function loadRecents(): StoredRecent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRecent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecents(entries: StoredRecent[]) {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(entries.slice(0, MAX_RECENTS)));
}

function pushRecent(entry: RecentPayload) {
  const composite = `${entry.kind}:${entry.id}`;
  const row = { ...entry, ts: Date.now() } as StoredRecent;
  const prev = loadRecents().filter((r) => `${r.kind}:${r.id}` !== composite);
  saveRecents([row, ...prev].slice(0, MAX_RECENTS));
}

function periodCompetenceLabel(period: ReportingPeriodRow) {
  return `${String(period.month).padStart(2, '0')}/${period.year} · ${formatStatusLabel(period.status)}`;
}

function isMacPlatform() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

function CommandEmptyWithSearch() {
  const search = useCommandState((s) => s.search);
  return (
    <Command.Empty className="cmd-palette-empty">
      <p className="cmd-palette-empty__title">Nenhum resultado para “{search || '…'}”.</p>
      <p className="cmd-palette-empty__tip">
        Experimente outro termo — franquias e competências também entram na busca.
      </p>
    </Command.Empty>
  );
}

export type GlobalCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: AccessProfile;
};

export function GlobalCommandPalette({ open, onOpenChange, access }: GlobalCommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const currentSavedViewPage = useMemo(() => pathnameToSavedViewPage(location.pathname), [location.pathname]);
  const savedViewsForPage = useSavedViewsList(user?.id, currentSavedViewPage);
  const modSlashLabel = useMemo(() => (isMacPlatform() ? '⌘/' : 'Ctrl+/'), []);
  const modShiftLLabel = useMemo(() => (isMacPlatform() ? '⌘⇧L' : 'Ctrl+Shift+L'), []);

  const franchisesQuery = useQuery({
    queryKey: [
      'franchises',
      access.franchiseIds.join(',') ?? 'all-franchises',
      access.regionalIds.join(',') ?? 'all-regionals',
    ],
    queryFn: () => fetchAccessibleFranchises(access),
  });

  const periodsQuery = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: fetchReportingPeriods,
  });

  const navItems = useMemo(() => {
    const allowedPaths = new Set<string>(PALETTE_NAV_ORDER);
    const orderIdx = new Map<string, number>(PALETTE_NAV_ORDER.map((p, i) => [p, i]));
    const flat = navigationSections.flatMap((section) => section.items);
    const filtered = flat.filter(
      (item) => allowedPaths.has(item.to) && canAccessRoles(access.roleCodes, item.allowedRoles),
    );
    return [...filtered].sort(
      (a, b) => (orderIdx.get(a.to) ?? 99) - (orderIdx.get(b.to) ?? 99),
    );
  }, [access.roleCodes]);

  const topPeriods = useMemo(() => {
    const rows = periodsQuery.data ?? [];
    return [...rows]
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .slice(0, 12);
  }, [periodsQuery.data]);

  const recents = useMemo(() => loadRecents(), [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const runNavigate = useCallback(
    (path: string, recent?: RecentPayload) => {
      navigate(path);
      if (recent) {
        pushRecent(recent);
      }
      close();
    },
    [close, navigate],
  );

  const replayRecent = useCallback(
    (r: StoredRecent) => {
      switch (r.kind) {
        case 'nav':
          navigate(r.path);
          pushRecent({ kind: 'nav', id: r.id, title: r.title, path: r.path });
          break;
        case 'workspace': {
          const detail: WorkspaceFilterDetail = {};
          if (r.franchiseId !== undefined) {
            detail.franchiseId = r.franchiseId;
          }
          if (r.periodId !== undefined) {
            detail.periodId = r.periodId;
          }
          if (Object.keys(detail).length > 0) {
            dispatchWorkspaceFilters(detail);
          }
          navigate('/app/submissions');
          break;
        }
        case 'holding-period':
          dispatchHoldingPeriodFilter({ periodLabel: r.periodLabel });
          navigate('/app/dashboard');
          break;
        case 'action':
          if (r.actionKey === 'create-submission') {
            dispatchClearSubmissionFocus();
            navigate('/app/submissions');
          } else if (r.actionKey === 'approve-queue') {
            navigate('/app/workflow');
          } else if (r.actionKey === 'export-pdf') {
            window.alert('Exportar dashboard PDF — em desenvolvimento');
          }
          break;
        default:
          break;
      }
      pushRecent(recentWithoutTs(r));
      close();
    },
    [close, navigate],
  );

  const onSelectFranchise = (id: string, title: string) => {
    dispatchWorkspaceFilters({ franchiseId: id });
    pushRecent({
      kind: 'workspace',
      id: `f:${id}`,
      title: `Franquia: ${title}`,
      franchiseId: id,
    });
    navigate('/app/submissions');
    close();
  };

  const onSelectPeriod = (period: ReportingPeriodRow) => {
    const title = periodCompetenceLabel(period);
    if (access.dashboardScope === 'holding') {
      dispatchHoldingPeriodFilter({ periodLabel: period.label });
      pushRecent({
        kind: 'holding-period',
        id: period.id,
        title: `Competência (holding): ${title}`,
        periodLabel: period.label,
      });
      navigate('/app/dashboard');
    } else {
      dispatchWorkspaceFilters({ periodId: period.id });
      pushRecent({
        kind: 'workspace',
        id: `p:${period.id}`,
        title: `Competência: ${title}`,
        periodId: period.id,
      });
      navigate('/app/submissions');
    }
    close();
  };

  const onCreateSubmission = () => {
    dispatchClearSubmissionFocus();
    pushRecent({
      kind: 'action',
      id: 'create-submission',
      title: 'Criar nova submissão',
      actionKey: 'create-submission',
    });
    navigate('/app/submissions');
    close();
  };

  const onApproveQueue = () => {
    pushRecent({
      kind: 'action',
      id: 'approve-queue',
      title: 'Aprovar tudo da fila',
      actionKey: 'approve-queue',
    });
    navigate('/app/workflow');
    close();
  };

  const onExportPdf = () => {
    window.alert('Exportar dashboard PDF — em desenvolvimento');
    pushRecent({
      kind: 'action',
      id: 'export-pdf',
      title: 'Exportar dashboard PDF',
      actionKey: 'export-pdf',
    });
    close();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Paleta de comandos"
      overlayClassName="cmd-palette-overlay"
      contentClassName="cmd-palette-dialog"
    >
      <Dialog.Title id="febracis-cmd-palette-title" className="sr-only">
        Paleta de comandos
      </Dialog.Title>
      <div className="cmd-palette__header">
        <Command.Input placeholder="Buscar páginas, franquias, competências…" className="cmd-palette-input" />
      </div>
      <Command.List className="cmd-palette-list">
        <CommandEmptyWithSearch />

        {recents.length > 0 ? (
          <Command.Group heading="Recentes" className="cmd-palette-group">
            {recents.map((r) => (
              <Command.Item
                key={`${r.kind}:${r.id}:${r.ts}`}
                value={`recent ${r.title} ${r.kind}`}
                className="cmd-palette-item"
                onSelect={() => replayRecent(r)}
              >
                <ArrowRight className="cmd-palette-item__icon" aria-hidden />
                <span className="cmd-palette-item__label">{r.title}</span>
                <kbd className="cmd-palette-kbd">↵</kbd>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}

        {currentSavedViewPage && user?.id && (savedViewsForPage.data?.length ?? 0) > 0 ? (
          <Command.Group heading="Vistas" className="cmd-palette-group">
            {(savedViewsForPage.data ?? []).map((row) => {
              const loc = buildPinnedViewLocation(row);
              const path = `${loc.pathname}${loc.search}`;
              return (
                <Command.Item
                  key={row.id}
                  value={`vista guardada ${row.name} ${row.page}`}
                  className="cmd-palette-item"
                  onSelect={() => runNavigate(path)}
                >
                  <Star className="cmd-palette-item__icon" aria-hidden />
                  <span className="cmd-palette-item__label">{row.name}</span>
                  <kbd className="cmd-palette-kbd">↵</kbd>
                </Command.Item>
              );
            })}
          </Command.Group>
        ) : null}

        <Command.Group heading="Navegar" className="cmd-palette-group">
          {navItems.map((item) => {
            const Icon = item.icon as LucideIcon;
            return (
              <Command.Item
                key={item.to}
                value={`nav ${item.label} ${item.to}`}
                className="cmd-palette-item"
                onSelect={() =>
                  runNavigate(item.to, {
                    kind: 'nav',
                    id: item.to,
                    title: item.label,
                    path: item.to,
                  })
                }
              >
                <Icon className="cmd-palette-item__icon" aria-hidden />
                <span className="cmd-palette-item__label">{item.label}</span>
                <kbd className="cmd-palette-kbd">↵</kbd>
              </Command.Item>
            );
          })}
        </Command.Group>

        <Command.Group heading="Franquias" className="cmd-palette-group">
          {(franchisesQuery.data ?? []).map((f) => (
            <Command.Item
              key={f.id}
              value={`franchise ${f.trade_name} ${f.code} ${f.id}`}
              className="cmd-palette-item"
              onSelect={() => onSelectFranchise(f.id, f.trade_name)}
            >
              <Building2 className="cmd-palette-item__icon" aria-hidden />
              <span className="cmd-palette-item__label">
                {f.trade_name} <span className="cmd-palette-item__meta">{f.code}</span>
              </span>
              <kbd className="cmd-palette-kbd">↵</kbd>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Competências" className="cmd-palette-group">
          {topPeriods.map((p) => {
            const label = periodCompetenceLabel(p);
            return (
              <Command.Item
                key={p.id}
                value={`period ${p.label} ${label} ${p.id}`}
                className="cmd-palette-item"
                onSelect={() => onSelectPeriod(p)}
              >
                <FileSpreadsheet className="cmd-palette-item__icon" aria-hidden />
                <span className="cmd-palette-item__label">{label}</span>
                <kbd className="cmd-palette-kbd">↵</kbd>
              </Command.Item>
            );
          })}
        </Command.Group>

        <Command.Group heading="Ações" className="cmd-palette-group">
          <Command.Item
            value="action criar nova submissão"
            className="cmd-palette-item"
            onSelect={onCreateSubmission}
          >
            <FileSpreadsheet className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Criar nova submissão</span>
            <kbd className="cmd-palette-kbd">↵</kbd>
          </Command.Item>
          {access.canManageReview ? (
            <Command.Item
              value="action aprovar fila workflow"
              className="cmd-palette-item"
              onSelect={onApproveQueue}
            >
              <ClipboardCheck className="cmd-palette-item__icon" aria-hidden />
              <span className="cmd-palette-item__label">Aprovar tudo da fila</span>
              <kbd className="cmd-palette-kbd">↵</kbd>
            </Command.Item>
          ) : null}
          <Command.Item value="action exportar pdf dashboard" className="cmd-palette-item" onSelect={onExportPdf}>
            <FileDown className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Exportar dashboard PDF</span>
            <kbd className="cmd-palette-kbd">↵</kbd>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Atalhos" className="cmd-palette-group">
          <Command.Item
            value="atalho alternar tema claro escuro"
            className="cmd-palette-item cmd-palette-item--static"
            onSelect={() => close()}
          >
            <Sun className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Alternar tema claro / escuro</span>
            <kbd className="cmd-palette-kbd">{modShiftLLabel}</kbd>
          </Command.Item>
          <Command.Item
            value="atalho abrir paleta comando"
            className="cmd-palette-item cmd-palette-item--static"
            onSelect={() => close()}
          >
            <CommandIcon className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Abrir esta paleta</span>
            <kbd className="cmd-palette-kbd">{modSlashLabel}</kbd>
          </Command.Item>
          <Command.Item
            value="atalho fechar dialog esc"
            className="cmd-palette-item cmd-palette-item--static"
            onSelect={() => close()}
          >
            <Keyboard className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Fechar diálogo</span>
            <kbd className="cmd-palette-kbd">Esc</kbd>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
