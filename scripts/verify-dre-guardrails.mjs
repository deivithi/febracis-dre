import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const previewPath = join(root, 'src', 'features', 'submissions', 'drePreview.ts');
const migrationPath = join(root, 'supabase', 'migrations', '011_submission_lock_and_dre_validation.sql');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function calculateReference(values) {
  const deductionsTotal =
    values.discounts_returns +
    values.split_holding +
    values.cispay +
    values.ed_commission +
    values.franchise_fee;

  const mc1 = values.gross_revenue - deductionsTotal;

  const eventExpensesTotal =
    values.event_trainer_cost +
    values.event_space_rent +
    values.event_decoration +
    values.event_food +
    values.event_gifts +
    values.event_audiovisual +
    values.event_logistics;

  const variableExpensesTotal =
    values.variable_card_fees +
    values.variable_logistics +
    values.variable_room_rent;

  const marketingTotal =
    values.marketing_digital +
    values.marketing_gifts +
    values.marketing_regional +
    values.marketing_offline;

  const defaultNet = values.default_gross - values.default_recovery;
  const mc2 = mc1 - eventExpensesTotal - variableExpensesTotal - marketingTotal - defaultNet;
  const ebitda1 = mc2 - values.people_total - values.cto_total - values.utilities_services_total - values.general_expenses_total;
  const ebitda2 = ebitda1 - values.taxes;

  return {
    deductionsTotal,
    mc1,
    eventExpensesTotal,
    variableExpensesTotal,
    marketingTotal,
    defaultNet,
    mc2,
    ebitda1,
    ebitda2,
  };
}

const sample = {
  gross_revenue: 100000,
  discounts_returns: 2000,
  split_holding: 1000,
  cispay: 1500,
  ed_commission: 3500,
  franchise_fee: 2000,
  event_trainer_cost: 4000,
  event_space_rent: 6000,
  event_decoration: 2500,
  event_food: 1800,
  event_gifts: 700,
  event_audiovisual: 1200,
  event_logistics: 900,
  variable_card_fees: 2200,
  variable_logistics: 500,
  variable_room_rent: 800,
  marketing_digital: 3000,
  marketing_gifts: 600,
  marketing_regional: 1500,
  marketing_offline: 900,
  default_gross: 1800,
  default_recovery: 300,
  people_total: 14000,
  cto_total: 8000,
  utilities_services_total: 3500,
  general_expenses_total: 2500,
  taxes: 7000,
};

const result = calculateReference(sample);
assert(result.deductionsTotal === 10000, 'deductions_total divergiu do valor esperado');
assert(result.eventExpensesTotal === 17100, 'event_expenses_total divergiu do valor esperado');
assert(result.variableExpensesTotal === 3500, 'variable_expenses_total divergiu do valor esperado');
assert(result.marketingTotal === 6000, 'marketing_total divergiu do valor esperado');
assert(result.defaultNet === 1500, 'default_net divergiu do valor esperado');
assert(result.mc1 === 90000, 'mc1 divergiu do valor esperado');
assert(result.mc2 === 61900, 'mc2 divergiu do valor esperado');
assert(result.ebitda1 === 33900, 'ebitda_1 divergiu do valor esperado');
assert(result.ebitda2 === 26900, 'ebitda_2 divergiu do valor esperado');

const previewSource = readFileSync(previewPath, 'utf8');
assert(previewSource.includes("readValue(values, 'event_trainer_cost')"), 'preview sem event_trainer_cost');
assert(previewSource.includes("readValue(values, 'variable_card_fees')"), 'preview sem variable_card_fees');
assert(previewSource.includes("readValue(values, 'marketing_gifts')"), 'preview sem marketing_gifts');
assert(previewSource.includes("const mc2 = mc1 - eventExpensesTotal - variableExpensesTotal - marketingTotal - defaultNet;"), 'preview com formula de MC2 inesperada');

const migrationSource = readFileSync(migrationPath, 'utf8');
assert(migrationSource.includes('public.is_submission_editable_status'), 'migration sem helper de status editavel');
assert(migrationSource.includes('event_trainer_cost'), 'migration sem novos campos de evento');
assert(migrationSource.includes('variable_card_fees'), 'migration sem novos campos de despesas variaveis');
assert(migrationSource.includes('marketing_gifts'), 'migration sem novos campos de marketing');
assert(migrationSource.includes('A submissao atual esta bloqueada no status % e nao pode gerar nova versao.'), 'migration sem bloqueio de nova versao');
assert(migrationSource.includes("Submissao so pode ser aprovada quando estiver enviada ou em revisao."), 'migration sem guarda de aprovacao');
assert(migrationSource.includes('revoke insert, update, delete on public.submissions'), 'migration sem revoke de submissions');

console.log('DRE guardrails OK');
