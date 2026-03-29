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
