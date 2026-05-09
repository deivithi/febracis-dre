import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Command } from 'cmdk';
import { Activity, CalendarRange, Filter, History as HistoryIcon, Search, X } from 'lucide-react';
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { CommandPalette } from '../../components/CommandPalette';
import { EmptyState } from '../../components/EmptyState';
import { DataTable, type DataTableUrlSortConfig } from '../../components/ui/DataTable';
import { useSavedViewById, useSavedViewsList, useSavedViewsMutations } from '../../hooks/useSavedViews';
import { BRAZIL_IANA_TIMEZONE, getBrazilCalendarDateParts } from '../../utils/brazilTimezone';
import { formatDateTime, formatStatusLabel } from '../../utils/formatters';
import { useAuth } from '../auth/useAuth';
import { SaveViewDialog } from '../saved-views/SaveViewDialog';
import { SavedViewsBar } from '../saved-views/SavedViewsBar';
import type { AuditDatePreset } from '../saved-views/savedViewFilters';
import {
  emptyFiltersForPage,
  parseSavedFilters,
  stableFiltersFingerprint,
  type SavedViewFiltersV1,
} from '../saved-views/savedViewFilters';
import {
  applyFiltersToSearchParams,
  clearFilterParams,
  readFiltersFromSearchParams,
} from '../saved-views/savedViewUrl';
import { useHydrateViewFromUrl } from '../saved-views/hydrateViewFromUrl';
import { useSaveViewSuggestion } from '../saved-views/useSaveViewSuggestion';
import { fetchAuditEntries } from '../shared/portal.api';
import type { AuditLogRow } from '../shared/portal.types';
import { useShortcutsEnabled } from '../../hooks/useShortcutsEnabled';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import {
  SHORTCUT_AUDIT_FOCUS_SEARCH,
  SHORTCUT_AUDIT_TOGGLE_PALETTE,
} from '../../lib/shortcutEvents';
import './AuditPage.css';

/** Mantém &lt; 1001 linhas para não ativar paginação interna do DataTable (50/página). */
const AUDIT_FETCH_LIMIT = 1000;

const AUDIT_INITIAL_SORT: SortingState = [{ id: 'performed_at', desc: true }];

const AUDIT_URL_SORT: DataTableUrlSortConfig = {
  columnIdToSortParam: {
    table_name: 'table_name',
    action: 'action',
    origin: 'origin',
    record_id: 'record_id',
    performed_at: 'performed_at',
  },
};

function isTypingTarget(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null;
  const tag = t?.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t?.getAttribute?.('contenteditable') === 'true'
  );
}

function isMacPlatform() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

/** `datetime-local` interpretado como horário civil de Brasília (UTC−3 permanente). */
function fromBrtCivilDateTime(localYmdHm: string): Date {
  const [datePart, timePart = '00:00'] = localYmdHm.split('T');
  const t = timePart.length >= 5 ? timePart.slice(0, 5) : '00:00';
  return new Date(`${datePart}T${t}:00-03:00`);
}

function isInCurrentBrazilMonth(performedAtIso: string, reference: Date): boolean {
  const inst = new Date(performedAtIso);
  const a = getBrazilCalendarDateParts(inst);
  const b = getBrazilCalendarDateParts(reference);
  return a.year === b.year && a.month === b.month;
}

function rowMatchesDateRange(
  performedAt: string,
  preset: AuditDatePreset,
  customStart: string,
  customEnd: string,
  nowRef: Date,
): boolean {
  const t = new Date(performedAt).getTime();
  if (preset === 'all') return true;
  if (preset === '24h') return t >= nowRef.getTime() - 24 * 60 * 60 * 1000;
  if (preset === '7d') return t >= nowRef.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (preset === 'month') return isInCurrentBrazilMonth(performedAt, nowRef);
  if (preset === 'custom') {
    if (customStart) {
      const a = fromBrtCivilDateTime(customStart).getTime();
      if (t < a) return false;
    }
    if (customEnd) {
      const b = fromBrtCivilDateTime(customEnd).getTime();
      if (t > b) return false;
    }
    return true;
  }
  return true;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="audit-text-mark">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function rowSearchBlob(row: AuditLogRow): string {
  return [
    row.table_name,
    row.action,
    formatStatusLabel(row.action),
    row.origin,
    row.record_id,
    row.id,
    formatDateTime(row.performed_at),
  ]
    .join(' ')
    .toLowerCase();
}

export function AuditPage() {
  const customRangeId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const paletteOpenRef = useRef(false);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTables, setSelectedTables] = useState<Set<string>>(() => new Set());
  const [datePreset, setDatePreset] = useState<AuditDatePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [nowTick] = useState(() => Date.now());

  const [searchParams, setSearchParams] = useSearchParams();
  const viewIdParam = searchParams.get('view');
  const { user } = useAuth();

  const limitFromUrl = useMemo(() => {
    const lim = searchParams.get('limit');
    if (!lim) return undefined;
    const n = Number.parseInt(lim, 10);
    return Number.isFinite(n) ? Math.min(1000, Math.max(1, n)) : undefined;
  }, [searchParams]);

  const effectiveFetchLimit = limitFromUrl ?? AUDIT_FETCH_LIMIT;

  const auditQuery = useQuery({
    queryKey: ['audit-log', effectiveFetchLimit],
    queryFn: () => fetchAuditEntries(effectiveFetchLimit),
  });

  const savedViewRowQuery = useSavedViewById(user?.id, viewIdParam);
  useHydrateViewFromUrl('audit', viewIdParam, savedViewRowQuery.data ?? null, setSearchParams);
  const savedViewsList = useSavedViewsList(user?.id, 'audit');
  const savedViewsMut = useSavedViewsMutations(user?.id);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useLayoutEffect(() => {
    paletteOpenRef.current = paletteOpen;
  }, [paletteOpen]);

  const shortcutsEnabled = useShortcutsEnabled();

  /** Retrocompat: quando os atalhos globais estão desligados, mantém Cmd/Ctrl+K só nesta página. */
  useEffect(() => {
    if (shortcutsEnabled) return;

    const onKeyDownWindow = (e: globalThis.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== 'k' && e.key !== 'K') return;
      if (!paletteOpenRef.current && isTypingTarget(e.target)) return;
      e.preventDefault();
      setPaletteOpen((o) => !o);
    };
    window.addEventListener('keydown', onKeyDownWindow);
    return () => window.removeEventListener('keydown', onKeyDownWindow);
  }, [shortcutsEnabled]);

  const sourceRows = auditQuery.data ?? [];
  const nowRef = useMemo(() => new Date(nowTick), [nowTick]);

  const distinctTableNames = useMemo(() => {
    const s = new Set<string>();
    for (const r of sourceRows) {
      if (r.table_name) s.add(r.table_name);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [sourceRows]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return sourceRows.filter((row) => {
      if (selectedTables.size > 0 && !selectedTables.has(row.table_name)) {
        return false;
      }
      if (!rowMatchesDateRange(row.performed_at, datePreset, customStart, customEnd, nowRef)) {
        return false;
      }
      if (q && !rowSearchBlob(row).includes(q)) {
        return false;
      }
      return true;
    });
  }, [sourceRows, searchText, selectedTables, datePreset, customStart, customEnd, nowRef]);

  const auditFiltersTyped: SavedViewFiltersV1 = useMemo(() => {
    const sortCol = searchParams.get('sort') ?? undefined;
    const dirRaw = searchParams.get('dir');
    const sortDir = dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : undefined;
    return {
      page: 'audit',
      v: 1,
      limit: limitFromUrl,
      datePreset: datePreset === 'all' ? undefined : datePreset,
      customStart: datePreset === 'custom' ? customStart || undefined : undefined,
      customEnd: datePreset === 'custom' ? customEnd || undefined : undefined,
      tableNames: selectedTables.size > 0 ? [...selectedTables].sort() : undefined,
      sortColumn: sortCol,
      sortDir,
    };
  }, [limitFromUrl, searchParams, datePreset, customStart, customEnd, selectedTables]);

  const filtersRef = useRef(auditFiltersTyped);
  useLayoutEffect(() => {
    filtersRef.current = auditFiltersTyped;
  }, [auditFiltersTyped]);
  const filtersFp = stableFiltersFingerprint(auditFiltersTyped);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const view = prev.get('view');
        const next = applyFiltersToSearchParams('audit', prev, filtersRef.current, { viewId: view });
        return next.toString() === prev.toString() ? prev : next;
      },
      { replace: true },
    );
  }, [filtersFp, setSearchParams]);

  const urlSyncTag = searchParams.toString();
  useEffect(() => {
    const f = readFiltersFromSearchParams('audit', searchParams);
    if (f.page !== 'audit') {
      return;
    }
    setDatePreset((p) => {
      const next = f.datePreset ?? 'all';
      return p === next ? p : next;
    });
    setCustomStart((p) => {
      const next = f.customStart ?? '';
      return p === next ? p : next;
    });
    setCustomEnd((p) => {
      const next = f.customEnd ?? '';
      return p === next ? p : next;
    });
    setSelectedTables((prev) => {
      const names = f.tableNames ?? [];
      if (prev.size !== names.length) return new Set(names);
      for (const x of names) {
        if (!prev.has(x)) return new Set(names);
      }
      return prev;
    });
  }, [urlSyncTag, searchParams]);

  const defaultAuditFp = stableFiltersFingerprint(emptyFiltersForPage('audit'));
  const suggestion = useSaveViewSuggestion('audit', stableFiltersFingerprint(auditFiltersTyped), {
    isDefaultFingerprint: stableFiltersFingerprint(auditFiltersTyped) === defaultAuditFp,
  });

  const auditFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (datePreset === 'all') parts.push('Todo o período');
    else if (datePreset === '24h') parts.push('Últimas 24 h');
    else if (datePreset === '7d') parts.push('Últimos 7 dias');
    else if (datePreset === 'month') parts.push('Mês atual (BRT)');
    else parts.push('Intervalo personalizado');
    if (selectedTables.size > 0) {
      parts.push(`${selectedTables.size} tabela(s)`);
    }
    const q = searchText.trim();
    if (q) {
      parts.push(`Busca “${q.length > 28 ? `${q.slice(0, 27)}…` : q}”`);
    }
    parts.push(`${filteredRows.length} linhas`);
    return parts.join(' · ');
  }, [datePreset, selectedTables, searchText, filteredRows.length]);

  const auditBreadcrumbSegments = useMemo(
    () => [
      { label: 'Portal', href: '/app/dashboard' },
      { label: 'Auditoria', href: '/app/audit' },
      { label: auditFilterSummary },
    ],
    [auditFilterSummary],
  );

  useBreadcrumb(auditBreadcrumbSegments);

  const toggleTable = useCallback((name: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const clearTableFilters = useCallback(() => setSelectedTables(new Set()), []);

  const clearFilters = useCallback(() => {
    setSearchText('');
    setSelectedTables(new Set());
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd('');
    setSearchParams((prev) => clearFilterParams('audit', prev), { replace: true });
  }, [setSearchParams]);

  const focusPageSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    if (!shortcutsEnabled) return;

    const onToggle = () => setPaletteOpen((o) => !o);
    const onFocus = () => focusPageSearch();

    window.addEventListener(SHORTCUT_AUDIT_TOGGLE_PALETTE, onToggle);
    window.addEventListener(SHORTCUT_AUDIT_FOCUS_SEARCH, onFocus);
    return () => {
      window.removeEventListener(SHORTCUT_AUDIT_TOGGLE_PALETTE, onToggle);
      window.removeEventListener(SHORTCUT_AUDIT_FOCUS_SEARCH, onFocus);
    };
  }, [shortcutsEnabled, focusPageSearch]);

  const modKLabel = useMemo(() => (isMacPlatform() ? '⌘K' : 'Ctrl+K'), []);

  const stopPropagationWhenCmdK = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.stopPropagation();
    }
  };

  const auditColumns = useMemo<ColumnDef<AuditLogRow, unknown>[]>(
    () => [
      {
        accessorKey: 'table_name',
        header: 'Tabela',
        cell: ({ getValue }) => highlightText(String(getValue() ?? ''), searchText),
      },
      {
        accessorKey: 'action',
        header: 'Ação',
        cell: ({ getValue }) => highlightText(formatStatusLabel(String(getValue() ?? '')), searchText),
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'origin',
        header: 'Origem',
        cell: ({ getValue }) => highlightText(String(getValue() ?? ''), searchText),
      },
      {
        accessorKey: 'record_id',
        header: 'Registro',
        cell: ({ getValue }) => highlightText(String(getValue() ?? ''), searchText),
        meta: { tdClassName: 'font-mono' },
      },
      {
        accessorKey: 'performed_at',
        id: 'performed_at',
        header: 'Executado em',
        cell: ({ getValue }) => highlightText(formatDateTime(String(getValue() ?? '')), searchText),
      },
    ],
    [searchText],
  );

  if (auditQuery.error) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar o log de auditoria.
      </div>
    );
  }

  return (
    <div className="page-stack">
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        label="Paleta da Auditoria"
        searchPlaceholder="Comandos e filtros rápidos…"
      >
        <Command.Empty className="cmd-palette-empty">
          <p className="cmd-palette-empty__title">Nenhum comando correspondente.</p>
        </Command.Empty>

        <Command.Group heading="Navegação" className="cmd-palette-group">
          <Command.Item
            value="foco busca principal auditoria"
            className="cmd-palette-item"
            onSelect={() => {
              focusPageSearch();
              setPaletteOpen(false);
            }}
          >
            <Search className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Focar busca da página</span>
            <kbd className="cmd-palette-kbd">↵</kbd>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Período (BRT)" className="cmd-palette-group">
          <Command.Item
            value="periodo todas datas"
            className="cmd-palette-item"
            onSelect={() => {
              setDatePreset('all');
              setPaletteOpen(false);
            }}
          >
            <CalendarRange className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Todo o período carregado</span>
          </Command.Item>
          <Command.Item
            value="periodo 24 horas"
            className="cmd-palette-item"
            onSelect={() => {
              setDatePreset('24h');
              setPaletteOpen(false);
            }}
          >
            <CalendarRange className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Últimas 24 horas</span>
          </Command.Item>
          <Command.Item
            value="periodo 7 dias"
            className="cmd-palette-item"
            onSelect={() => {
              setDatePreset('7d');
              setPaletteOpen(false);
            }}
          >
            <CalendarRange className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Últimos 7 dias</span>
          </Command.Item>
          <Command.Item
            value="periodo mes atual brt"
            className="cmd-palette-item"
            onSelect={() => {
              setDatePreset('month');
              setPaletteOpen(false);
            }}
          >
            <CalendarRange className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Mês atual ({BRAZIL_IANA_TIMEZONE})</span>
          </Command.Item>
          <Command.Item
            value="periodo personalizado"
            className="cmd-palette-item"
            onSelect={() => {
              setDatePreset('custom');
              setPaletteOpen(false);
            }}
          >
            <CalendarRange className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Intervalo personalizado</span>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Tabelas" className="cmd-palette-group">
          <Command.Item
            value="limpar filtro tabelas"
            className="cmd-palette-item"
            onSelect={() => {
              clearTableFilters();
              setPaletteOpen(false);
            }}
          >
            <Filter className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Limpar filtro de tabelas</span>
          </Command.Item>
          {distinctTableNames.map((name) => (
            <Command.Item
              key={`pal-${name}`}
              value={`tabela alternar ${name}`}
              className="cmd-palette-item"
              onSelect={() => {
                toggleTable(name);
              }}
            >
              <Filter className="cmd-palette-item__icon" aria-hidden />
              <span className="cmd-palette-item__label">
                {selectedTables.has(name) ? 'Desmarcar' : 'Incluir'}: {name}
              </span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Busca" className="cmd-palette-group">
          <Command.Item
            value="limpar texto busca auditoria"
            className="cmd-palette-item"
            onSelect={() => {
              setSearchText('');
              setPaletteOpen(false);
            }}
          >
            <X className="cmd-palette-item__icon" aria-hidden />
            <span className="cmd-palette-item__label">Limpar texto de busca</span>
          </Command.Item>
        </Command.Group>
      </CommandPalette>

      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Auditoria</h1>
          <p className="page-container__subtitle">
            Últimos eventos no trilho de auditoria. período e chips usam o fuso {BRAZIL_IANA_TIMEZONE}.
          </p>
        </div>
      </div>

      <SavedViewsBar
        page="audit"
        views={savedViewsList.data ?? []}
        activeViewId={viewIdParam}
        currentFilters={auditFiltersTyped}
        shareBasePath="/app/audit"
        onApplyView={(row) => {
          const f = parseSavedFilters('audit', row.filters);
          setSearchParams((prev) => applyFiltersToSearchParams('audit', prev, f, { viewId: row.id }), {
            replace: true,
          });
        }}
        onClearDefault={() => {
          setSearchParams((prev) => clearFilterParams('audit', prev), { replace: true });
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
        page="audit"
        draftFilters={auditFiltersTyped}
        defaultPinned
        isSaving={savedViewsMut.insertMutation.isPending}
        onSave={({ name, isPinned }) => {
          savedViewsMut.insertMutation.mutate(
            { page: 'audit', name, filters: auditFiltersTyped, isPinned },
            {
              onSuccess: (row) => {
                setSaveDialogOpen(false);
                setSearchParams(
                  (prev) => applyFiltersToSearchParams('audit', prev, auditFiltersTyped, { viewId: row.id }),
                  { replace: true },
                );
              },
              onError: (e) =>
                window.alert(e instanceof Error ? e.message : 'Não foi possível guardar a vista.'),
            },
          );
        }}
      />

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Últimas alterações</h3>
        </div>
        <div className="card__body card__body--compact">
          <div className="audit-filter-bar">
            <div className="audit-filter-bar__search-wrap">
              <div className="form-field audit-filter-bar__search">
                <label className="form-label sr-only" htmlFor="audit-search">
                  Busca na auditoria
                </label>
                <input
                  ref={searchRef}
                  id="audit-search"
                  type="search"
                  className="input input--dense"
                  placeholder="Buscar tabela, ação, registro ou ID..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={stopPropagationWhenCmdK}
                  autoComplete="off"
                />
              </div>
              <span className="audit-filter-bar__kbd-hint">
                Paleta rápida <kbd>{modKLabel}</kbd>
              </span>
            </div>

            <div className="audit-filter-bar__row">
              <span className="audit-filter-bar__label">Tabelas</span>
              <div className="audit-chips" role="group" aria-label="Filtrar por tabela (múltipla escolha)">
                {distinctTableNames.length === 0 ? (
                  <span className="text-sm text-muted">Nenhuma tabela nos eventos carregados.</span>
                ) : (
                  distinctTableNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`audit-chip ${selectedTables.has(name) ? 'audit-chip--active' : ''}`}
                      onClick={() => toggleTable(name)}
                      aria-pressed={selectedTables.has(name)}
                    >
                      {name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="audit-filter-bar__row">
              <span className="audit-filter-bar__label">Período</span>
              <div className="audit-date-presets" role="group" aria-label="Presets de data (BRT)">
                {(
                  [
                    ['all', 'Todo o período'],
                    ['24h', 'Últimas 24h'],
                    ['7d', 'Últimos 7 dias'],
                    ['month', 'Mês atual'],
                    ['custom', 'Personalizado'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`btn btn--secondary btn--sm ${datePreset === id ? 'btn--gold' : ''}`}
                    onClick={() => setDatePreset(id)}
                    aria-pressed={datePreset === id}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {datePreset === 'custom' ? (
                <div className="audit-date-presets__custom" id={customRangeId}>
                  <label>
                    Início (Brasília){' '}
                    <input
                      type="datetime-local"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                  </label>
                  <label>
                    Fim (Brasília){' '}
                    <input
                      type="datetime-local"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <p className="audit-events-count" aria-live="polite">
            <strong>
              {filteredRows.length} de {sourceRows.length}
            </strong>{' '}
            eventos
            {selectedTables.size > 0 ? ` · ${selectedTables.size} tabela(s) na seleção` : null}
          </p>

          {!auditQuery.isLoading && sourceRows.length === 0 ? (
            <EmptyState
              icon={HistoryIcon}
              title="Trilha de auditoria vazia"
              description="O log passará a aparecer assim que o sistema registrar eventos auditáveis."
            />
          ) : !auditQuery.isLoading && filteredRows.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nenhum evento corresponde aos filtros"
              description="Tente ampliar o intervalo de datas ou remover filtros de tabela."
              action={{ label: 'Limpar filtros', onClick: clearFilters }}
            />
          ) : (
            <DataTable<AuditLogRow>
              columns={auditColumns}
              data={filteredRows}
              getRowId={(row) => row.id}
              isLoading={auditQuery.isLoading}
              initialSort={AUDIT_INITIAL_SORT}
              urlSort={AUDIT_URL_SORT}
            />
          )}
        </div>
      </div>
    </div>
  );
}
