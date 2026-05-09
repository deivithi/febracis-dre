import type { DreStatementRow } from '../shared/portal.types';

export interface DrePreviewValues {
  grossRevenue: number;
  deductionsTotal: number;
  mc1: number;
  eventExpensesTotal: number;
  marketingTotal: number;
  defaultNet: number;
  variableExpensesTotal: number;
  mc2: number;
  ebitda1: number;
  ebitda2: number;
}

export type DreInputValueMap = Record<string, number>;

/** Origem da prévia exibida: declarado no workspace para alinhar KPI ao motor após gravar. */
export type DrePreviewSource = 'local_draft' | 'server_statement';

function readNumericCell(value: DreStatementRow['value_currency']): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Prévia alinhada ao motor: lê subtotais de `vw_submission_dre_statement` / `submission_calculated_values`.
 */
export function dreStatementToPreview(rows: DreStatementRow[]): DrePreviewValues | null {
  if (!rows.length) {
    return null;
  }

  const byCode = new Map(rows.map((row) => [row.line_code, row]));

  const read = (code: string) => {
    const row = byCode.get(code);
    return row ? readNumericCell(row.value_currency) : 0;
  };

  return {
    grossRevenue: read('gross_revenue'),
    deductionsTotal: read('deductions_total'),
    mc1: read('mc1'),
    eventExpensesTotal: read('event_expenses_total'),
    marketingTotal: read('marketing_total'),
    defaultNet: read('default_net'),
    variableExpensesTotal: read('variable_expenses_total'),
    mc2: read('mc2'),
    ebitda1: read('ebitda_1'),
    ebitda2: read('ebitda_2'),
  };
}

function readValue(values: DreInputValueMap, key: string) {
  const value = values[key];
  return Number.isFinite(value) ? value : 0;
}

export function calculateDrePreview(values: DreInputValueMap): DrePreviewValues {
  const grossRevenue = readValue(values, 'gross_revenue');

  const deductionsTotal =
    readValue(values, 'discounts_returns') +
    readValue(values, 'split_holding') +
    readValue(values, 'cispay') +
    readValue(values, 'ed_commission') +
    readValue(values, 'franchise_fee');

  const mc1 = grossRevenue - deductionsTotal;

  const eventExpensesTotal =
    readValue(values, 'event_trainer_cost') +
    readValue(values, 'event_space_rent') +
    readValue(values, 'event_decoration') +
    readValue(values, 'event_food') +
    readValue(values, 'event_gifts') +
    readValue(values, 'event_audiovisual') +
    readValue(values, 'event_logistics');

  const variableExpensesTotal =
    readValue(values, 'variable_card_fees') +
    readValue(values, 'variable_logistics') +
    readValue(values, 'variable_room_rent');

  const marketingTotal =
    readValue(values, 'marketing_digital') +
    readValue(values, 'marketing_gifts') +
    readValue(values, 'marketing_regional') +
    readValue(values, 'marketing_offline');

  const defaultNet =
    readValue(values, 'default_gross') -
    readValue(values, 'default_recovery');

  const mc2 = mc1 - eventExpensesTotal - variableExpensesTotal - marketingTotal - defaultNet;

  const ebitda1 =
    mc2 -
    readValue(values, 'people_total') -
    readValue(values, 'cto_total') -
    readValue(values, 'utilities_services_total') -
    readValue(values, 'general_expenses_total');

  const ebitda2 = ebitda1 - readValue(values, 'taxes');

  return {
    grossRevenue,
    deductionsTotal,
    mc1,
    eventExpensesTotal,
    marketingTotal,
    defaultNet,
    variableExpensesTotal,
    mc2,
    ebitda1,
    ebitda2,
  };
}
