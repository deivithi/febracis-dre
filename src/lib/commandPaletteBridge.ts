/** Eventos e chaves entre a palette e páginas (Submissões / Dashboard holding). */

export const COMMAND_PALETTE_WORKSPACE_FILTER = 'febracis-cmd-palette-workspace-filter';
export const COMMAND_PALETTE_HOLDING_PERIOD = 'febracis-cmd-palette-holding-period';
/** Limpa foco de submissão no workspace (ex.: “Criar nova submissão” na palette). */
export const COMMAND_PALETTE_CLEAR_SUBMISSION_FOCUS = 'febracis-cmd-palette-clear-submission-focus';

export type WorkspaceFilterDetail = {
  franchiseId?: string;
  /** Vazio limpa seleção; omitir o campo não altera o período nem sessionStorage. */
  periodId?: string;
};

export type HoldingPeriodDetail = {
  /** Deve coincidir com `reporting_periods.label` / `period_label` do snapshot. */
  periodLabel: string;
};

/** sessionStorage antes de navegar para submissões (montagem inicial do workspace). */
export const SS_FRANCHISE = 'febracis.cmdpalette.franchiseId';
export const SS_PERIOD = 'febracis.cmdpalette.periodId';

/**
 * Escreve/remover chaves só quando o campo correspondente é `!== undefined`.
 * Comportamento: valor truthy grava a chave; `''` ou outro falsy remove a chave.
 */
export function writeWorkspaceFiltersToSession(detail: WorkspaceFilterDetail) {
  if (detail.franchiseId !== undefined) {
    if (detail.franchiseId) {
      sessionStorage.setItem(SS_FRANCHISE, detail.franchiseId);
    } else {
      sessionStorage.removeItem(SS_FRANCHISE);
    }
  }
  if (detail.periodId !== undefined) {
    if (detail.periodId) {
      sessionStorage.setItem(SS_PERIOD, detail.periodId);
    } else {
      sessionStorage.removeItem(SS_PERIOD);
    }
  }
}

export function dispatchWorkspaceFilters(detail: WorkspaceFilterDetail) {
  writeWorkspaceFiltersToSession(detail);
  window.dispatchEvent(new CustomEvent<WorkspaceFilterDetail>(COMMAND_PALETTE_WORKSPACE_FILTER, { detail }));
}

export function dispatchHoldingPeriodFilter(detail: HoldingPeriodDetail) {
  window.dispatchEvent(new CustomEvent<HoldingPeriodDetail>(COMMAND_PALETTE_HOLDING_PERIOD, { detail }));
}

export function dispatchClearSubmissionFocus() {
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_CLEAR_SUBMISSION_FOCUS));
}
