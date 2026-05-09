import type { SavedViewPage } from './savedView.types';

/** Versão do payload em `filters` jsonb — discrimina por `page` na coluna. */
export const SAVED_FILTERS_VERSION = 1 as const;

/** Filtros do cockpit holding (`HoldingCockpitView`). Comparativo de competências (useCompareMode) pode acrescentar-se numa v2 quando estiver exposto na página. */
export type DashboardSavedFiltersV1 = {
  v: typeof SAVED_FILTERS_VERSION;
  holding?: {
    selectedPeriodLabel: string;
    selectedRegionalId: string;
    selectedFranchiseId: string;
  };
};

export type SubmissionsSavedFiltersV1 = {
  v: typeof SAVED_FILTERS_VERSION;
  franchiseId?: string;
  periodId?: string;
  eventId?: string;
  focusSubmissionId?: string | null;
};

export type ApprovalsSavedFiltersV1 = {
  v: typeof SAVED_FILTERS_VERSION;
  submissionId?: string | null;
};

/** Presets de data na página de auditoria (BRT). */
export type AuditDatePreset = 'all' | '24h' | '7d' | 'month' | 'custom';

export type AuditSavedFiltersV1 = {
  v: typeof SAVED_FILTERS_VERSION;
  /** Limite de linhas pedido ao servidor (cap na página). */
  limit?: number;
  datePreset?: AuditDatePreset;
  customStart?: string;
  customEnd?: string;
  /** Nomes de tabelas selecionadas (conjunto na UI). */
  tableNames?: string[];
  /** Parâmetros `sort` / `dir` da tabela (alinhados ao DataTable). */
  sortColumn?: string;
  sortDir?: 'asc' | 'desc';
};

export type SavedViewFiltersV1 =
  | ({ page: 'dashboard' } & DashboardSavedFiltersV1)
  | ({ page: 'submissions' } & SubmissionsSavedFiltersV1)
  | ({ page: 'approvals' } & ApprovalsSavedFiltersV1)
  | ({ page: 'audit' } & AuditSavedFiltersV1);

export function emptyFiltersForPage(page: SavedViewPage): SavedViewFiltersV1 {
  const base = { v: SAVED_FILTERS_VERSION } as const;
  switch (page) {
    case 'dashboard':
      return { page: 'dashboard', ...base };
    case 'submissions':
      return { page: 'submissions', ...base };
    case 'approvals':
      return { page: 'approvals', ...base };
    case 'audit':
      return { page: 'audit', ...base };
    default: {
      const _x: never = page;
      return _x;
    }
  }
}

export function parseSavedFilters(page: SavedViewPage, raw: unknown): SavedViewFiltersV1 {
  if (!raw || typeof raw !== 'object') {
    return emptyFiltersForPage(page);
  }
  const o = raw as Record<string, unknown>;
  const v = o.v === SAVED_FILTERS_VERSION ? SAVED_FILTERS_VERSION : SAVED_FILTERS_VERSION;
  switch (page) {
    case 'dashboard':
      return {
        page: 'dashboard',
        v,
        holding:
          o.holding && typeof o.holding === 'object'
            ? {
                selectedPeriodLabel: String((o.holding as Record<string, unknown>).selectedPeriodLabel ?? ''),
                selectedRegionalId: String((o.holding as Record<string, unknown>).selectedRegionalId ?? 'all'),
                selectedFranchiseId: String((o.holding as Record<string, unknown>).selectedFranchiseId ?? 'all'),
              }
            : undefined,
      };
    case 'submissions':
      return {
        page: 'submissions',
        v,
        franchiseId: typeof o.franchiseId === 'string' ? o.franchiseId : undefined,
        periodId: typeof o.periodId === 'string' ? o.periodId : undefined,
        eventId: typeof o.eventId === 'string' ? o.eventId : undefined,
        focusSubmissionId:
          o.focusSubmissionId === null
            ? null
            : typeof o.focusSubmissionId === 'string'
              ? o.focusSubmissionId
              : undefined,
      };
    case 'approvals':
      return {
        page: 'approvals',
        v,
        submissionId:
          o.submissionId === null
            ? null
            : typeof o.submissionId === 'string'
              ? o.submissionId
              : undefined,
      };
    case 'audit': {
      const lim = o.limit;
      const dp = o.datePreset;
      const validPreset: AuditDatePreset | undefined =
        dp === 'all' || dp === '24h' || dp === '7d' || dp === 'month' || dp === 'custom' ? dp : undefined;
      const tables = Array.isArray(o.tableNames)
        ? o.tableNames.filter((x): x is string => typeof x === 'string')
        : undefined;
      const sc = o.sortColumn;
      const sd = o.sortDir;
      return {
        page: 'audit',
        v,
        limit: typeof lim === 'number' && Number.isFinite(lim) ? Math.min(1000, Math.max(1, Math.floor(lim))) : undefined,
        datePreset: validPreset,
        customStart: typeof o.customStart === 'string' ? o.customStart : undefined,
        customEnd: typeof o.customEnd === 'string' ? o.customEnd : undefined,
        tableNames: tables && tables.length > 0 ? tables : undefined,
        sortColumn: typeof sc === 'string' ? sc : undefined,
        sortDir: sd === 'asc' || sd === 'desc' ? sd : undefined,
      };
    }
    default: {
      const _p: never = page;
      return _p;
    }
  }
}

export function filtersToJson(filters: SavedViewFiltersV1): Record<string, unknown> {
  const { page, ...rest } = filters;
  void page;
  return rest as Record<string, unknown>;
}

export function humanizeSavedFilters(filters: SavedViewFiltersV1): string[] {
  switch (filters.page) {
    case 'dashboard': {
      const lines: string[] = [];
      if (filters.holding) {
        const { selectedPeriodLabel, selectedRegionalId, selectedFranchiseId } = filters.holding;
        if (selectedPeriodLabel) {
          lines.push(`Competência: ${selectedPeriodLabel}`);
        }
        lines.push(
          selectedRegionalId && selectedRegionalId !== 'all'
            ? `Regional: ${selectedRegionalId}`
            : 'Regional: toda a rede',
        );
        lines.push(
          selectedFranchiseId && selectedFranchiseId !== 'all'
            ? `Unidade: ${selectedFranchiseId}`
            : 'Unidade: todas',
        );
      } else {
        lines.push('Sem filtros do cockpit (escopo não holding ou padrão).');
      }
      return lines;
    }
    case 'submissions': {
      const lines: string[] = [];
      if (filters.franchiseId) {
        lines.push(`Franquia: ${filters.franchiseId}`);
      }
      if (filters.periodId) {
        lines.push(`Competência (id): ${filters.periodId}`);
      }
      if (filters.eventId) {
        lines.push(`Evento: ${filters.eventId}`);
      }
      if (filters.focusSubmissionId) {
        lines.push(`Submissão em foco: ${filters.focusSubmissionId}`);
      }
      if (lines.length === 0) {
        lines.push('Padrão da página (primeira franquia / competência atual).');
      }
      return lines;
    }
    case 'approvals': {
      if (filters.submissionId) {
        return [`Submissão selecionada: ${filters.submissionId}`];
      }
      return ['Primeiro item da fila (padrão).'];
    }
    case 'audit': {
      const lines: string[] = [];
      if (filters.limit != null) {
        lines.push(`Limite de linhas (servidor): ${filters.limit}`);
      }
      if (filters.datePreset && filters.datePreset !== 'all') {
        const labels: Record<AuditDatePreset, string> = {
          all: 'Todo o período carregado',
          '24h': 'Últimas 24 horas',
          '7d': 'Últimos 7 dias',
          month: 'Mês atual (BRT)',
          custom: 'Intervalo personalizado',
        };
        lines.push(`Período: ${labels[filters.datePreset]}`);
      }
      if (filters.datePreset === 'custom' && (filters.customStart || filters.customEnd)) {
        lines.push(`Intervalo: ${filters.customStart || '…'} → ${filters.customEnd || '…'}`);
      }
      if (filters.tableNames && filters.tableNames.length > 0) {
        lines.push(`Tabelas: ${filters.tableNames.slice().sort().join(', ')}`);
      }
      if (filters.sortColumn) {
        lines.push(`Ordenação: ${filters.sortColumn} (${filters.sortDir ?? 'desc'})`);
      }
      if (lines.length === 0) {
        lines.push('Vista padrão da auditoria (sem filtros persistidos).');
      }
      return lines;
    }
    default: {
      const _e: never = filters;
      return _e;
    }
  }
}

export function stableFiltersFingerprint(filters: SavedViewFiltersV1): string {
  try {
    return JSON.stringify(filters);
  } catch {
    return '';
  }
}
