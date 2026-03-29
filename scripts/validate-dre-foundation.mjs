import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));

const options = {
  allowLocalOnly: args.has('--allow-local-only'),
  applyMigration: args.has('--apply-migration'),
};

const requiredRemoteLineCodes = [
  'event_trainer_cost',
  'variable_card_fees',
  'variable_logistics',
  'variable_room_rent',
  'marketing_gifts',
  'marketing_offline',
];

const canonicalInputValues = {
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

const updatedInputValues = {
  ...canonicalInputValues,
  marketing_offline: 1200,
};

const reportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = join(root, 'output', 'validation');
const reportMarkdownPath = join(outputDir, `fase-pesada-01-${reportTimestamp}.md`);
const reportJsonPath = join(outputDir, `fase-pesada-01-${reportTimestamp}.json`);

const results = [];
const failures = [];
const warnings = [];
const notes = [];

loadEnvFile(join(root, '.env.local'));

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');
const projectRef = readEnv('DRE_SUPABASE_PROJECT_REF') || readProjectRef();

function readEnv(name) {
  return process.env[name]?.trim() || '';
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const source = readFileSync(filePath, 'utf8');

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function readProjectRef() {
  const tempRefPath = join(root, 'supabase', '.temp', 'project-ref');

  if (!existsSync(tempRefPath)) {
    return '';
  }

  return readFileSync(tempRefPath, 'utf8').trim();
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function record(status, step, detail, extra = {}) {
  results.push({ status, step, detail, ...extra });

  const message = `[${status.toUpperCase()}] ${step}${detail ? ` - ${detail}` : ''}`;
  console.log(message);

  if (status === 'fail') {
    failures.push(message);
  }

  if (status === 'warn') {
    warnings.push(message);
  }
}

function addNote(message) {
  notes.push(message);
  console.log(`[NOTE] ${message}`);
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function numberOrZero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const ebitda1 =
    mc2 -
    values.people_total -
    values.cto_total -
    values.utilities_services_total -
    values.general_expenses_total;
  const ebitda2 = ebitda1 - values.taxes;

  return {
    grossRevenue: values.gross_revenue,
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

function toRpcInputs(values) {
  return Object.entries(values).map(([line_code, value_currency]) => ({
    line_code,
    value_currency,
  }));
}

function resolveCommandName(command) {
  if (process.platform !== 'win32') {
    return command;
  }

  if (command === 'npm') {
    return 'npm.cmd';
  }

  return command;
}

function escapeCmdArgument(value) {
  if (!value) {
    return '""';
  }

  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function runCommand(command, args, label) {
  const commandName = resolveCommandName(command);
  const result =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', [commandName, ...args.map(escapeCmdArgument)].join(' ')], {
          cwd: root,
          encoding: 'utf8',
          shell: false,
          env: process.env,
        })
      : spawnSync(commandName, args, {
          cwd: root,
          encoding: 'utf8',
          shell: false,
          env: process.env,
        });

  const stdout = result.stdout?.trim() ?? '';
  const stderr = result.stderr?.trim() ?? '';

  if (result.error) {
    throw new Error(`${label} falhou. ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${label} falhou. ${stderr || stdout || `Exit code ${result.status ?? 'desconhecido'}`}`);
  }

  return {
    stdout,
    stderr,
  };
}

function createPortalClient() {
  ensure(supabaseUrl, 'VITE_SUPABASE_URL não configurada.');
  ensure(supabaseAnonKey, 'VITE_SUPABASE_ANON_KEY não configurada.');

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signInWithPassword(email, password, label) {
  const client = createPortalClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(`Não foi possível autenticar ${label}. ${error?.message ?? 'Sessão ausente.'}`);
  }

  return client;
}

async function getCurrentUser(client) {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error(`Não foi possível resolver o usuário autenticado. ${error?.message ?? 'Usuário ausente.'}`);
  }

  return data.user;
}

async function resolveAccessProfile(client) {
  const user = await getCurrentUser(client);

  const [profileResult, roleLinksResult, scopesResult] = await Promise.all([
    client
      .from('profiles')
      .select('id, full_name, email, status')
      .eq('id', user.id)
      .maybeSingle(),
    client
      .from('user_roles')
      .select('role_id')
      .eq('profile_id', user.id),
    client
      .from('user_scopes')
      .select('id, scope_type, franchise_id, regional_id')
      .eq('profile_id', user.id),
  ]);

  if (profileResult.error) {
    throw new Error(`Não foi possível carregar o perfil autenticado. ${profileResult.error.message}`);
  }

  if (roleLinksResult.error) {
    throw new Error(`Não foi possível carregar os papéis autenticados. ${roleLinksResult.error.message}`);
  }

  if (scopesResult.error) {
    throw new Error(`Não foi possível carregar os escopos autenticados. ${scopesResult.error.message}`);
  }

  const roleIds = [...new Set((roleLinksResult.data ?? []).map((entry) => entry.role_id).filter(Boolean))];
  const scopes = scopesResult.data ?? [];
  const franchiseIds = [...new Set(scopes.map((scope) => scope.franchise_id).filter(Boolean))];
  const regionalIds = [...new Set(scopes.map((scope) => scope.regional_id).filter(Boolean))];

  const [rolesResult, franchisesResult, regionalsResult] = await Promise.all([
    roleIds.length
      ? client.from('roles').select('id, code, name').in('id', roleIds)
      : Promise.resolve({ data: [], error: null }),
    franchiseIds.length
      ? client.from('franchises').select('id, code, trade_name, regional_id').in('id', franchiseIds)
      : Promise.resolve({ data: [], error: null }),
    regionalIds.length
      ? client.from('regionals').select('id, code, name').in('id', regionalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (rolesResult.error) {
    throw new Error(`Não foi possível resolver o catálogo de papéis. ${rolesResult.error.message}`);
  }

  if (franchisesResult.error) {
    throw new Error(`Não foi possível resolver as franquias autenticadas. ${franchisesResult.error.message}`);
  }

  if (regionalsResult.error) {
    throw new Error(`Não foi possível resolver as regionais autenticadas. ${regionalsResult.error.message}`);
  }

  return {
    profile: profileResult.data,
    roleCodes: (rolesResult.data ?? []).map((role) => role.code),
    scopes,
    franchiseIds,
    regionalIds,
    franchises: franchisesResult.data ?? [],
    regionals: regionalsResult.data ?? [],
  };
}

async function invokeRpc(client, functionName, params = {}) {
  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function expectRpcFailure(client, functionName, params, matcher, label) {
  const { error } = await client.rpc(functionName, params);

  if (!error) {
    throw new Error(`${label} deveria falhar, mas a RPC respondeu com sucesso.`);
  }

  if (matcher && !matcher.test(error.message)) {
    throw new Error(`${label} falhou com mensagem inesperada: ${error.message}`);
  }

  return error.message;
}

async function invokeProvisionUser(adminClient, payload) {
  const { data, error } = await adminClient.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error(`Não foi possível obter o token administrativo da sessão. ${error?.message ?? 'Sessão ausente.'}`);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/admin-provision-user`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new Error(body?.error ?? `Provisionamento falhou com status ${response.status}.`);
  }

  return body;
}

async function fetchDemoTargets(adminClient) {
  const [franchisesResult, regionalsResult, currentPeriodResult] = await Promise.all([
    adminClient
      .from('franchises')
      .select('id, code, trade_name, regional_id')
      .like('code', 'DEMO-%')
      .order('code', { ascending: true }),
    adminClient
      .from('regionals')
      .select('id, code, name')
      .like('code', 'DEMO-%')
      .order('code', { ascending: true }),
    adminClient
      .from('reporting_periods')
      .select('id, label, year, month, status')
      .eq('year', 2026)
      .eq('month', 3)
      .maybeSingle(),
  ]);

  if (franchisesResult.error) {
    throw new Error(`Não foi possível carregar as franquias demo. ${franchisesResult.error.message}`);
  }

  if (regionalsResult.error) {
    throw new Error(`Não foi possível carregar as regionais demo. ${regionalsResult.error.message}`);
  }

  if (currentPeriodResult.error || !currentPeriodResult.data) {
    throw new Error(`Não foi possível localizar a competência demo corrente. ${currentPeriodResult.error?.message ?? 'Período ausente.'}`);
  }

  const franchiseMap = new Map((franchisesResult.data ?? []).map((row) => [row.code, row]));
  const regionalMap = new Map((regionalsResult.data ?? []).map((row) => [row.code, row]));

  const fortaleza = franchiseMap.get('DEMO-FOR');
  const campinas = franchiseMap.get('DEMO-CPS');
  const beloHorizonte = franchiseMap.get('DEMO-BHZ');
  const regionalNordeste = regionalMap.get('DEMO-NE');

  ensure(fortaleza, 'Franquia demo DEMO-FOR não encontrada após o seed.');
  ensure(campinas, 'Franquia demo DEMO-CPS não encontrada após o seed.');
  ensure(beloHorizonte, 'Franquia demo DEMO-BHZ não encontrada após o seed.');
  ensure(regionalNordeste, 'Regional demo DEMO-NE não encontrada após o seed.');

  return {
    fortaleza,
    campinas,
    beloHorizonte,
    regionalNordeste,
    currentPeriod: currentPeriodResult.data,
  };
}

async function probeRemoteSchema(adminClient) {
  const { data, error } = await adminClient
    .from('dre_lines')
    .select('code')
    .in('code', requiredRemoteLineCodes);

  if (error) {
    throw new Error(`Não foi possível inspecionar o catálogo remoto da DRE. ${error.message}`);
  }

  const present = new Set((data ?? []).map((row) => row.code));
  const missing = requiredRemoteLineCodes.filter((code) => !present.has(code));

  return {
    ready: missing.length === 0,
    missing,
  };
}

async function createTemporaryOpenPeriod(systemAdminClient) {
  const { data: existingPeriods, error: existingPeriodsError } = await systemAdminClient
    .from('reporting_periods')
    .select('year, month');

  if (existingPeriodsError) {
    throw new Error(`Não foi possível listar as competências existentes. ${existingPeriodsError.message}`);
  }

  const used = new Set((existingPeriods ?? []).map((row) => `${row.year}-${row.month}`));
  let candidateYear = 2026;
  let candidateMonth = 4;

  while (used.has(`${candidateYear}-${candidateMonth}`)) {
    candidateMonth += 1;

    if (candidateMonth > 12) {
      candidateMonth = 1;
      candidateYear += 1;
    }
  }

  const openAt = new Date(Date.UTC(candidateYear, candidateMonth - 1, 1, 11, 0, 0)).toISOString();
  const submissionDeadline = new Date(Date.UTC(candidateYear, candidateMonth - 1, 25, 2, 59, 0)).toISOString();
  const adjustmentDeadline = new Date(Date.UTC(candidateYear, candidateMonth - 1, 28, 21, 0, 0)).toISOString();

  const { data, error } = await systemAdminClient
    .from('reporting_periods')
    .insert({
      year: candidateYear,
      month: candidateMonth,
      status: 'open',
      open_at: openAt,
      submission_deadline_at: submissionDeadline,
      adjustment_deadline_at: adjustmentDeadline,
      closed_at: null,
    })
    .select('id, label, year, month')
    .single();

  if (error || !data) {
    throw new Error(`Não foi possível criar a competência temporária de validação. ${error?.message ?? 'Período ausente.'}`);
  }

  return data;
}

async function cleanupTemporaryPeriod(adminClient, periodId) {
  const { error } = await adminClient
    .from('reporting_periods')
    .delete()
    .eq('id', periodId);

  if (error) {
    throw new Error(`Não foi possível remover a competência temporária ${periodId}. ${error.message}`);
  }
}

async function fetchSubmissionWorkspace(client, submissionId) {
  const [
    submissionResult,
    kpiResult,
    statementResult,
    validationsResult,
    historyResult,
    issuesResult,
  ] = await Promise.all([
    client
      .from('submissions')
      .select('id, franchise_id, reporting_period_id, event_id, version_number, status, notes, submitted_at, created_at')
      .eq('id', submissionId)
      .maybeSingle(),
    client
      .from('submission_kpis')
      .select('submission_id, gross_revenue, mc1, mc2, ebitda_1, ebitda_2, marketing_pct, default_pct, tax_pct, updated_at')
      .eq('submission_id', submissionId)
      .maybeSingle(),
    client
      .from('vw_submission_dre_statement')
      .select('line_code, value_currency, percent_of_gross_revenue')
      .eq('submission_id', submissionId),
    client
      .from('submission_validation_results')
      .select(`
        id,
        status,
        message,
        validation_rules!inner (
          code,
          name,
          severity
        )
      `)
      .eq('submission_id', submissionId),
    client
      .from('submission_status_history')
      .select('id, from_status, to_status, reason, changed_at')
      .eq('submission_id', submissionId)
      .order('changed_at', { ascending: false }),
    client
      .from('submission_issues')
      .select('id, description, status, severity, opened_at, resolved_at')
      .eq('submission_id', submissionId)
      .order('opened_at', { ascending: false }),
  ]);

  if (submissionResult.error) {
    throw new Error(`Não foi possível carregar a submissão ${submissionId}. ${submissionResult.error.message}`);
  }

  if (kpiResult.error) {
    throw new Error(`Não foi possível carregar os KPIs da submissão ${submissionId}. ${kpiResult.error.message}`);
  }

  if (statementResult.error) {
    throw new Error(`Não foi possível carregar a DRE da submissão ${submissionId}. ${statementResult.error.message}`);
  }

  if (validationsResult.error) {
    throw new Error(`Não foi possível carregar as validações da submissão ${submissionId}. ${validationsResult.error.message}`);
  }

  if (historyResult.error) {
    throw new Error(`Não foi possível carregar o histórico da submissão ${submissionId}. ${historyResult.error.message}`);
  }

  if (issuesResult.error) {
    throw new Error(`Não foi possível carregar as pendências da submissão ${submissionId}. ${issuesResult.error.message}`);
  }

  return {
    submission: submissionResult.data,
    kpis: kpiResult.data,
    statement: statementResult.data ?? [],
    validations: validationsResult.data ?? [],
    history: historyResult.data ?? [],
    issues: issuesResult.data ?? [],
  };
}

function assertClose(actual, expected, label) {
  const difference = Math.abs(numberOrZero(actual) - numberOrZero(expected));

  if (difference > 0.001) {
    throw new Error(`${label} divergente. Esperado ${expected}, recebido ${actual}.`);
  }
}

function assertReferenceParity(workspace, reference, label) {
  ensure(workspace.kpis, `${label}: KPIs ausentes após o recálculo.`);

  assertClose(workspace.kpis.gross_revenue, reference.grossRevenue, `${label}: gross_revenue`);
  assertClose(workspace.kpis.mc1, reference.mc1, `${label}: mc1`);
  assertClose(workspace.kpis.mc2, reference.mc2, `${label}: mc2`);
  assertClose(workspace.kpis.ebitda_1, reference.ebitda1, `${label}: ebitda_1`);
  assertClose(workspace.kpis.ebitda_2, reference.ebitda2, `${label}: ebitda_2`);

  const lineMap = new Map(workspace.statement.map((row) => [row.line_code, row]));

  assertClose(lineMap.get('deductions_total')?.value_currency, reference.deductionsTotal, `${label}: deductions_total`);
  assertClose(lineMap.get('event_expenses_total')?.value_currency, reference.eventExpensesTotal, `${label}: event_expenses_total`);
  assertClose(lineMap.get('variable_expenses_total')?.value_currency, reference.variableExpensesTotal, `${label}: variable_expenses_total`);
  assertClose(lineMap.get('marketing_total')?.value_currency, reference.marketingTotal, `${label}: marketing_total`);
  assertClose(lineMap.get('default_net')?.value_currency, reference.defaultNet, `${label}: default_net`);
  assertClose(lineMap.get('mc1')?.value_currency, reference.mc1, `${label}: mc1 na DRE`);
  assertClose(lineMap.get('mc2')?.value_currency, reference.mc2, `${label}: mc2 na DRE`);
  assertClose(lineMap.get('ebitda_1')?.value_currency, reference.ebitda1, `${label}: ebitda_1 na DRE`);
  assertClose(lineMap.get('ebitda_2')?.value_currency, reference.ebitda2, `${label}: ebitda_2 na DRE`);

  const blockingFailures = workspace.validations.filter(
    (row) => row.validation_rules?.severity === 'blocking' && row.status === 'failed',
  );

  ensure(
    blockingFailures.length === 0,
    `${label}: ainda existem validações bloqueantes após salvar os inputs canônicos.`,
  );
}

async function fetchCurrentSubmission(client, franchiseId, reportingPeriodId) {
  const { data, error } = await client
    .from('vw_current_submissions')
    .select('submission_id, franchise_id, reporting_period_id, version_number, status')
    .eq('franchise_id', franchiseId)
    .eq('reporting_period_id', reportingPeriodId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível consultar a submissão corrente. ${error.message}`);
  }

  return data;
}

async function fetchFranchiseDashboardRow(client, submissionId) {
  const { data, error } = await client
    .from('vw_franchise_dashboard')
    .select('submission_id, submission_status, gross_revenue, mc1, mc2, ebitda_1, ebitda_2')
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível consultar o dashboard da franquia. ${error.message}`);
  }

  return data;
}

async function validateReadOnlyScope(userClient, roleLabel, demoTargets, tempPeriodId) {
  const profile = await resolveAccessProfile(userClient);

  const { data: fortalezaRows, error: fortalezaError } = await userClient
    .from('vw_current_submissions')
    .select('submission_id, franchise_id, franchise_code, regional_name')
    .eq('franchise_id', demoTargets.fortaleza.id);

  if (fortalezaError) {
    throw new Error(`${roleLabel}: não foi possível ler a submissão visível da franquia demo. ${fortalezaError.message}`);
  }

  ensure((fortalezaRows ?? []).length >= 1, `${roleLabel}: a submissão da Fortaleza demo deveria estar visível.`);

  const { data: campinasRows, error: campinasError } = await userClient
    .from('vw_current_submissions')
    .select('submission_id, franchise_id, franchise_code, regional_name')
    .eq('franchise_id', demoTargets.campinas.id);

  if (campinasError) {
    throw new Error(`${roleLabel}: não foi possível testar o filtro de escopo. ${campinasError.message}`);
  }

  if (roleLabel === 'regional_manager') {
    ensure((campinasRows ?? []).length === 0, `${roleLabel}: não deveria enxergar a franquia DEMO-CPS fora da regional.`);
  }

  const forbiddenMessage = await expectRpcFailure(
    userClient,
    'fn_create_submission_version',
    {
      p_franchise_id: demoTargets.fortaleza.id,
      p_reporting_period_id: tempPeriodId,
      p_event_id: null,
    },
    /Acesso negado/i,
    `${roleLabel}: tentativa indevida de operar submissão`,
  );

  return {
    roleCodes: profile.roleCodes,
    forbiddenMessage,
  };
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  addNote(`Modo local flexível: ${options.allowLocalOnly ? 'ativado' : 'desativado'}.`);
  addNote(`Aplicação automática da migration pendente: ${options.applyMigration ? 'ativada' : 'desativada'}.`);

  ensure(supabaseUrl, 'VITE_SUPABASE_URL não encontrada em .env.local/process.env.');
  ensure(supabaseAnonKey, 'VITE_SUPABASE_ANON_KEY não encontrada em .env.local/process.env.');

  try {
    const buildResult = runCommand('npm', ['run', 'build'], 'Build');
    record('pass', 'Build local', buildResult.stdout.split('\n').slice(-1)[0] || 'Build executado com sucesso.');
  } catch (error) {
    record('fail', 'Build local', formatError(error));
  }

  try {
    runCommand('npm', ['run', 'lint'], 'Lint');
    record('pass', 'Lint local', 'ESLint executado sem erros.');
  } catch (error) {
    record('fail', 'Lint local', formatError(error));
  }

  try {
    const guardrailResult = runCommand('node', ['scripts/verify-dre-guardrails.mjs'], 'Guardrails');
    record('pass', 'Guardrails locais', guardrailResult.stdout || 'Guardrails DRE validados.');
  } catch (error) {
    record('fail', 'Guardrails locais', formatError(error));
  }

  let migrationState = null;

  try {
    const migrationListResult = runCommand('supabase', ['migration', 'list', '--linked'], 'Supabase migration list');
    const remoteHas011 = /^\s*011\s*\|\s*011\s*\|/m.test(migrationListResult.stdout);
    const remoteMissing011 = /^\s*011\s*\|\s*\|\s*011\s*$/m.test(migrationListResult.stdout);

    migrationState = {
      remoteHas011,
      remoteMissing011,
      output: migrationListResult.stdout,
    };

    record(
      remoteHas011 ? 'pass' : 'warn',
      'Estado remoto das migrations',
      remoteHas011
        ? 'A migration 011 já aparece aplicada no projeto vinculado.'
        : remoteMissing011
          ? 'A migration 011 continua pendente no projeto vinculado.'
          : 'Não foi possível confirmar a aplicação da migration 011 pelo output atual.',
      {
        output: migrationListResult.stdout,
      },
    );
  } catch (error) {
    record('warn', 'Estado remoto das migrations', formatError(error));
  }

  if (options.applyMigration && migrationState?.remoteMissing011) {
    const dbPassword = readEnv('SUPABASE_DB_PASSWORD');

    if (!dbPassword || !projectRef) {
      record(
        options.allowLocalOnly ? 'warn' : 'fail',
        'Aplicação automática da migration 011',
        'SUPABASE_DB_PASSWORD ou project-ref ausente para religar o CLI e aplicar a migration.',
      );
    } else {
      try {
        runCommand('supabase', ['link', '--project-ref', projectRef, '--password', dbPassword, '--yes'], 'Supabase link');
        runCommand('supabase', ['db', 'push', '--linked', '--password', dbPassword], 'Supabase db push');
        const recheckResult = runCommand('supabase', ['migration', 'list', '--linked', '--password', dbPassword], 'Supabase migration list pós-push');
        const remoteHas011 = /^\s*011\s*\|\s*011\s*\|/m.test(recheckResult.stdout);
        ensure(remoteHas011, 'A migration 011 ainda não aparece como aplicada após o db push.');

        migrationState = {
          remoteHas011: true,
          remoteMissing011: false,
          output: recheckResult.stdout,
        };

        record('pass', 'Aplicação automática da migration 011', 'A migration 011 foi aplicada e confirmada pelo CLI.');
      } catch (error) {
        record(options.allowLocalOnly ? 'warn' : 'fail', 'Aplicação automática da migration 011', formatError(error));
      }
    }
  }

  const adminEmail = readEnv('DRE_ADMIN_EMAIL');
  const adminPassword = readEnv('DRE_ADMIN_PASSWORD');
  const remoteValidationAllowed = Boolean(adminEmail && adminPassword);

  if (!remoteValidationAllowed) {
    const status = options.allowLocalOnly ? 'warn' : 'fail';
    record(status, 'Credenciais administrativas', 'DRE_ADMIN_EMAIL e DRE_ADMIN_PASSWORD não foram fornecidos para o smoke autenticado.');
  }

  let adminClient = null;
  let tempPeriod = null;

  if (remoteValidationAllowed) {
    try {
      adminClient = await signInWithPassword(adminEmail, adminPassword, 'o administrador');
      const adminProfile = await resolveAccessProfile(adminClient);
      ensure(adminProfile.roleCodes.includes('system_admin'), 'A conta administrativa autenticada não possui o papel system_admin.');
      record('pass', 'Autenticação administrativa', `Admin autenticado com papéis: ${adminProfile.roleCodes.join(', ')}.`);
    } catch (error) {
      record(options.allowLocalOnly ? 'warn' : 'fail', 'Autenticação administrativa', formatError(error));
      adminClient = null;
    }
  }

  if (adminClient) {
    try {
      const seedResult = await invokeRpc(adminClient, 'fn_admin_seed_demo_environment');
      record(
        'pass',
        'Seed demo controlado',
        `${seedResult.message} ${seedResult.franchises} franquias demo e ${seedResult.current_submissions} submissões correntes.`,
      );

      const schemaProbe = await probeRemoteSchema(adminClient);

      if (!schemaProbe.ready) {
        throw new Error(`O catálogo remoto ainda não contém as linhas: ${schemaProbe.missing.join(', ')}.`);
      }

      record('pass', 'Catálogo remoto da DRE', 'As linhas novas de MC2 já estão disponíveis no Supabase autenticado.');

      const demoTargets = await fetchDemoTargets(adminClient);
      const smokeDomain = readEnv('DRE_SMOKE_DOMAIN') || 'local.test';
      const smokeNamespace = readEnv('DRE_SMOKE_NAMESPACE') || 'validacao-dre';
      const randomPassword = () => `Dre${crypto.randomBytes(9).toString('base64url')}!`;

      const smokeUsers = {
        systemAdmin: {
          email: `system-admin.${smokeNamespace}@${smokeDomain}`,
          password: randomPassword(),
          fullName: 'Smoke System Admin DRE',
          roleCode: 'system_admin',
          scopeType: 'network',
        },
        franchise: {
          email: `franchise.${smokeNamespace}@${smokeDomain}`,
          password: randomPassword(),
          fullName: 'Smoke Franquia DRE',
          roleCode: 'franchise_user',
          scopeType: 'franchise',
          franchiseId: demoTargets.fortaleza.id,
        },
        controller: {
          email: `controller.${smokeNamespace}@${smokeDomain}`,
          password: randomPassword(),
          fullName: 'Smoke Controladoria DRE',
          roleCode: 'finance_controller',
          scopeType: 'network',
        },
        regional: {
          email: `regional.${smokeNamespace}@${smokeDomain}`,
          password: randomPassword(),
          fullName: 'Smoke Regional DRE',
          roleCode: 'regional_manager',
          scopeType: 'regional',
          regionalId: demoTargets.regionalNordeste.id,
        },
        viewer: {
          email: `viewer.${smokeNamespace}@${smokeDomain}`,
          password: randomPassword(),
          fullName: 'Smoke Viewer DRE',
          roleCode: 'viewer',
          scopeType: 'network',
        },
      };

      for (const [key, user] of Object.entries(smokeUsers)) {
        const provisionResult = await invokeProvisionUser(adminClient, {
          email: user.email,
          fullName: user.fullName,
          password: user.password,
          status: 'active',
          roleCode: user.roleCode,
          scopeType: user.scopeType,
          franchiseId: user.franchiseId ?? null,
          regionalId: user.regionalId ?? null,
        });

        record('pass', `Provisionamento ${key}`, provisionResult.message);
      }

      const systemAdminClient = await signInWithPassword(
        smokeUsers.systemAdmin.email,
        smokeUsers.systemAdmin.password,
        'o usuário smoke system_admin',
      );
      const franchiseClient = await signInWithPassword(
        smokeUsers.franchise.email,
        smokeUsers.franchise.password,
        'o usuário smoke franchise_user',
      );
      const controllerClient = await signInWithPassword(
        smokeUsers.controller.email,
        smokeUsers.controller.password,
        'o usuário smoke finance_controller',
      );
      const regionalClient = await signInWithPassword(
        smokeUsers.regional.email,
        smokeUsers.regional.password,
        'o usuário smoke regional_manager',
      );
      const viewerClient = await signInWithPassword(
        smokeUsers.viewer.email,
        smokeUsers.viewer.password,
        'o usuário smoke viewer',
      );

      const [systemAdminProfile, franchiseProfile, controllerProfile, regionalProfile, viewerProfile] = await Promise.all([
        resolveAccessProfile(systemAdminClient),
        resolveAccessProfile(franchiseClient),
        resolveAccessProfile(controllerClient),
        resolveAccessProfile(regionalClient),
        resolveAccessProfile(viewerClient),
      ]);

      ensure(systemAdminProfile.roleCodes.includes('system_admin'), 'Smoke system_admin sem papel correto.');
      ensure(franchiseProfile.roleCodes.includes('franchise_user'), 'Smoke franchise_user sem papel correto.');
      ensure(controllerProfile.roleCodes.includes('finance_controller'), 'Smoke finance_controller sem papel correto.');
      ensure(regionalProfile.roleCodes.includes('regional_manager'), 'Smoke regional_manager sem papel correto.');
      ensure(viewerProfile.roleCodes.includes('viewer'), 'Smoke viewer sem papel correto.');

      record('pass', 'Autenticação dos perfis smoke', 'system_admin, franchise_user, finance_controller, regional_manager e viewer autenticaram com sucesso.');

      tempPeriod = await createTemporaryOpenPeriod(systemAdminClient);
      record('pass', 'Competência temporária de validação', `Competência ${tempPeriod.label} criada para provar criação de draft sem poluir a linha oficial.`);

      const createDraftResult = await invokeRpc(franchiseClient, 'fn_create_submission_version', {
        p_franchise_id: demoTargets.fortaleza.id,
        p_reporting_period_id: tempPeriod.id,
        p_event_id: null,
      });

      ensure(createDraftResult.reused === false, 'A criação do draft deveria gerar uma nova versão na competência temporária.');
      ensure(createDraftResult.status === 'draft', 'A submissão recém-criada deveria começar em draft.');
      record('pass', 'Franchise create draft', `Submissão ${createDraftResult.submission_id} criada em draft para ${tempPeriod.label}.`);

      const saveDraftResult = await invokeRpc(franchiseClient, 'fn_save_submission_inputs', {
        p_submission_id: createDraftResult.submission_id,
        p_inputs: toRpcInputs(canonicalInputValues),
        p_notes: 'Validação automática da fundação DRE.',
      });

      ensure(saveDraftResult.validation_count >= 1, 'Era esperado pelo menos uma rodada de validações após salvar o draft.');

      const firstWorkspace = await fetchSubmissionWorkspace(franchiseClient, createDraftResult.submission_id);
      const firstReference = calculateReference(canonicalInputValues);
      assertReferenceParity(firstWorkspace, firstReference, 'Paridade inicial');
      record('pass', 'Paridade preview x backend', 'KPIs e DRE oficial bateram com o conjunto canônico na primeira gravação.');

      const submitDraftResult = await invokeRpc(franchiseClient, 'fn_submit_submission', {
        p_submission_id: createDraftResult.submission_id,
        p_notes: 'Envio smoke da competência temporária.',
      });

      ensure(submitDraftResult.ok === true, 'O envio da competência temporária deveria concluir com sucesso.');
      ensure(submitDraftResult.status === 'submitted', 'Após o envio a submissão deveria ficar em submitted.');
      record('pass', 'Franchise submit draft', `Submissão ${createDraftResult.submission_id} enviada para revisão.`);

      const blockedSaveMessage = await expectRpcFailure(
        franchiseClient,
        'fn_save_submission_inputs',
        {
          p_submission_id: createDraftResult.submission_id,
          p_inputs: toRpcInputs(canonicalInputValues),
          p_notes: 'Tentativa indevida após envio.',
        },
        /nao pode ser editada no status atual|Acesso negado/i,
        'Bloqueio de edição após envio',
      );

      const blockedVersionMessage = await expectRpcFailure(
        franchiseClient,
        'fn_create_submission_version',
        {
          p_franchise_id: demoTargets.fortaleza.id,
          p_reporting_period_id: tempPeriod.id,
          p_event_id: null,
        },
        /bloqueada no status|Acesso negado/i,
        'Bloqueio de nova versão após envio',
      );

      record('pass', 'Guardrails pós-envio', `${blockedSaveMessage} | ${blockedVersionMessage}`);

      const startReviewResult = await invokeRpc(controllerClient, 'fn_review_submission', {
        p_submission_id: createDraftResult.submission_id,
        p_action: 'start_review',
        p_reason: 'Smoke: triagem da controladoria.',
      });

      ensure(startReviewResult.status === 'under_review', 'A submissão deveria entrar em under_review.');
      record('pass', 'Controller start review', 'A controladoria assumiu a submissão em revisão.');

      const requestAdjustmentResult = await invokeRpc(controllerClient, 'fn_review_submission', {
        p_submission_id: createDraftResult.submission_id,
        p_action: 'request_adjustment',
        p_reason: 'Smoke: ajuste solicitado para reabrir a mesma versão.',
      });

      ensure(requestAdjustmentResult.status === 'pending_adjustment', 'A submissão deveria voltar para pending_adjustment.');
      record('pass', 'Controller request adjustment', 'A controladoria devolveu a mesma versão para ajuste.');

      const resaveResult = await invokeRpc(franchiseClient, 'fn_save_submission_inputs', {
        p_submission_id: createDraftResult.submission_id,
        p_inputs: toRpcInputs(updatedInputValues),
        p_notes: 'Ajuste aplicado após retorno da controladoria.',
      });

      ensure(resaveResult.validation_count >= 1, 'As validações deveriam rodar novamente após o ajuste.');

      const adjustedWorkspace = await fetchSubmissionWorkspace(franchiseClient, createDraftResult.submission_id);
      const adjustedReference = calculateReference(updatedInputValues);
      assertReferenceParity(adjustedWorkspace, adjustedReference, 'Paridade após ajuste');
      ensure(
        adjustedWorkspace.submission?.id === createDraftResult.submission_id,
        'O retorno para ajuste deveria manter a mesma versão da submissão.',
      );

      record('pass', 'Franchise resave after adjustment', 'A franquia ajustou e recalculou a mesma versão em pending_adjustment.');

      const resubmitResult = await invokeRpc(franchiseClient, 'fn_submit_submission', {
        p_submission_id: createDraftResult.submission_id,
        p_notes: 'Reenvio smoke após ajustes.',
      });

      ensure(resubmitResult.ok === true, 'O reenvio após ajuste deveria concluir com sucesso.');
      ensure(resubmitResult.status === 'submitted', 'Após o reenvio a submissão deveria retornar a submitted.');
      record('pass', 'Franchise resubmit after adjustment', 'A versão ajustada voltou para submitted sem criar nova submissão.');

      const approveResult = await invokeRpc(controllerClient, 'fn_review_submission', {
        p_submission_id: createDraftResult.submission_id,
        p_action: 'approve',
        p_reason: 'Smoke: aprovação final após ajuste.',
      });

      ensure(approveResult.status === 'approved', 'A submissão deveria terminar aprovada.');
      record('pass', 'Controller approve submission', 'A controladoria aprovou a submissão ajustada.');

      const currentSubmissionRow = await fetchCurrentSubmission(systemAdminClient, demoTargets.fortaleza.id, tempPeriod.id);
      ensure(currentSubmissionRow?.status === 'approved', 'A view de submissões correntes deveria refletir o status approved.');

      const dashboardRow = await fetchFranchiseDashboardRow(systemAdminClient, createDraftResult.submission_id);
      ensure(dashboardRow?.submission_status === 'approved', 'O dashboard da franquia deveria consumir apenas a submissão aprovada.');
      assertClose(dashboardRow?.gross_revenue, adjustedReference.grossRevenue, 'Dashboard gross_revenue');
      assertClose(dashboardRow?.mc1, adjustedReference.mc1, 'Dashboard mc1');
      assertClose(dashboardRow?.mc2, adjustedReference.mc2, 'Dashboard mc2');
      assertClose(dashboardRow?.ebitda_1, adjustedReference.ebitda1, 'Dashboard ebitda_1');
      assertClose(dashboardRow?.ebitda_2, adjustedReference.ebitda2, 'Dashboard ebitda_2');
      record('pass', 'Consumo oficial no dashboard', 'A view oficial refletiu o registro aprovado com os KPIs esperados.');

      const regionalReadOnly = await validateReadOnlyScope(regionalClient, 'regional_manager', demoTargets, tempPeriod.id);
      record('pass', 'Regional manager em leitura', `Escopo confirmado com papéis ${regionalReadOnly.roleCodes.join(', ')}.`);

      const viewerReadOnly = await validateReadOnlyScope(viewerClient, 'viewer', demoTargets, tempPeriod.id);
      record('pass', 'Viewer em leitura', `Escopo confirmado com papéis ${viewerReadOnly.roleCodes.join(', ')}.`);

      const resetResult = await invokeRpc(adminClient, 'fn_admin_reset_demo_environment');
      record('pass', 'Reset demo pós-smoke', `${resetResult.message} ${resetResult.deleted_submissions} submissões removidas do sandbox.`);

      await cleanupTemporaryPeriod(adminClient, tempPeriod.id);
      record('pass', 'Limpeza da competência temporária', `Competência ${tempPeriod.label} removida após o reset.`);
      tempPeriod = null;

      const reseedResult = await invokeRpc(adminClient, 'fn_admin_seed_demo_environment');
      record('pass', 'Restauração do demo oficial', `${reseedResult.message} Ambiente devolvido ao estado padrão.`);
    } catch (error) {
      record(options.allowLocalOnly ? 'warn' : 'fail', 'Smoke híbrido remoto', formatError(error));

      if (adminClient && tempPeriod?.id) {
        try {
          await invokeRpc(adminClient, 'fn_admin_reset_demo_environment');
        } catch {}

        try {
          await cleanupTemporaryPeriod(adminClient, tempPeriod.id);
        } catch {}
      }
    }
  }

  const strictFailure = failures.length > 0;
  const localOnlyBlocked = !options.allowLocalOnly && !results.some((item) => item.step === 'Restauração do demo oficial' && item.status === 'pass');
  const finalStatus = strictFailure || localOnlyBlocked ? 'fail' : warnings.length > 0 ? 'warn' : 'pass';

  const markdownLines = [
    '# Validação da Fundação DRE — Fase Pesada 01',
    '',
    `- Data: ${new Date().toISOString()}`,
    `- Workspace: \`${root}\``,
    `- Status final: **${finalStatus.toUpperCase()}**`,
    '',
    '## Parâmetros',
    '',
    `- allowLocalOnly: ${options.allowLocalOnly}`,
    `- applyMigration: ${options.applyMigration}`,
    `- projectRef: ${projectRef || 'não encontrado'}`,
    '',
    '## Resultados',
    '',
    ...results.map((item) => `- [${item.status.toUpperCase()}] ${item.step}: ${item.detail}`),
    '',
    '## Notas',
    '',
    ...(notes.length ? notes.map((note) => `- ${note}`) : ['- Nenhuma nota adicional.']),
  ];

  writeFileSync(reportMarkdownPath, `${markdownLines.join('\n')}\n`, 'utf8');
  writeFileSync(
    reportJsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        finalStatus,
        options,
        projectRef,
        results,
        notes,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`Relatório Markdown: ${reportMarkdownPath}`);
  console.log(`Relatório JSON: ${reportJsonPath}`);

  if (strictFailure || localOnlyBlocked) {
    if (!strictFailure && localOnlyBlocked) {
      console.error('A validação estrita não pôde ser concluída: faltou fechar o smoke híbrido remoto.');
    }

    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

main().catch((error) => {
  record('fail', 'Execução do runner', formatError(error));

  const markdownLines = [
    '# Validação da Fundação DRE — Fase Pesada 01',
    '',
    `- Data: ${new Date().toISOString()}`,
    `- Workspace: \`${root}\``,
    `- Status final: **FAIL**`,
    '',
    '## Resultados',
    '',
    ...results.map((item) => `- [${item.status.toUpperCase()}] ${item.step}: ${item.detail}`),
  ];

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(reportMarkdownPath, `${markdownLines.join('\n')}\n`, 'utf8');
  writeFileSync(
    reportJsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        finalStatus: 'fail',
        options,
        projectRef,
        results,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.error(error);
  console.log(`Relatório Markdown: ${reportMarkdownPath}`);
  console.log(`Relatório JSON: ${reportJsonPath}`);
  process.exitCode = 1;
});
