import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outputDir = join(root, 'output', 'validation');
const reportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportMarkdownPath = join(outputDir, `configuracoes-coligada-${reportTimestamp}.md`);
const reportJsonPath = join(outputDir, `configuracoes-coligada-${reportTimestamp}.json`);

const results = [];
const notes = [];
const failures = [];

loadEnvFile(join(root, '.env.local'));

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');
const adminEmail = readEnv('DRE_ADMIN_EMAIL');
const adminPassword = readEnv('DRE_ADMIN_PASSWORD');
const smokeDomain = readEnv('DRE_SETTINGS_SMOKE_DOMAIN') || readEnv('DRE_SMOKE_DOMAIN') || 'local.test';
const smokeNamespace = readEnv('DRE_SETTINGS_SMOKE_NAMESPACE') || 'configuracoes-coligada';

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

function readEnv(name) {
  return process.env[name]?.trim() || '';
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function record(status, step, detail, extra = {}) {
  results.push({ status, step, detail, ...extra });
  console.log(`[${status.toUpperCase()}] ${step} - ${detail}`);

  if (status === 'fail') {
    failures.push(`${step}: ${detail}`);
  }
}

function addNote(message) {
  notes.push(message);
  console.log(`[NOTE] ${message}`);
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

  const rolesResult = roleIds.length
    ? await client.from('roles').select('id, code, name').in('id', roleIds)
    : { data: [], error: null };

  if (rolesResult.error) {
    throw new Error(`Não foi possível resolver o catálogo de papéis. ${rolesResult.error.message}`);
  }

  return {
    profile: profileResult.data,
    roleCodes: (rolesResult.data ?? []).map((role) => role.code),
    scopes,
    franchiseIds,
    regionalIds,
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

  const targets = {
    campinas: franchiseMap.get('DEMO-CPS'),
    beloHorizonte: franchiseMap.get('DEMO-BHZ'),
    fortaleza: franchiseMap.get('DEMO-FOR'),
    regionalSudeste: regionalMap.get('DEMO-SE'),
    regionalNordeste: regionalMap.get('DEMO-NE'),
    currentPeriod: currentPeriodResult.data,
  };

  ensure(targets.campinas, 'Franquia demo DEMO-CPS não encontrada.');
  ensure(targets.beloHorizonte, 'Franquia demo DEMO-BHZ não encontrada.');
  ensure(targets.fortaleza, 'Franquia demo DEMO-FOR não encontrada.');
  ensure(targets.regionalSudeste, 'Regional demo DEMO-SE não encontrada.');
  ensure(targets.regionalNordeste, 'Regional demo DEMO-NE não encontrada.');

  return targets;
}

async function createTemporaryOpenPeriod(adminClient) {
  const { data: existingPeriods, error } = await adminClient
    .from('reporting_periods')
    .select('year, month');

  if (error) {
    throw new Error(`Não foi possível listar as competências existentes. ${error.message}`);
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

  const { data, error: insertError } = await adminClient
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

  if (insertError || !data) {
    throw new Error(`Não foi possível criar a competência temporária de validação. ${insertError?.message ?? 'Período ausente.'}`);
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

async function fetchVisibleFranchises(client, accessProfile) {
  let query = client
    .from('franchises')
    .select('id, code, trade_name, regional_id')
    .order('code', { ascending: true });

  if (accessProfile.franchiseIds.length) {
    query = query.in('id', accessProfile.franchiseIds);
  } else if (accessProfile.regionalIds.length) {
    query = query.in('regional_id', accessProfile.regionalIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Não foi possível carregar as franquias visíveis. ${error.message}`);
  }

  return data ?? [];
}

async function fetchVisibleCurrentSubmissions(client, accessProfile) {
  let query = client
    .from('vw_current_submissions')
    .select('submission_id, franchise_id, franchise_code, regional_id, regional_name, period_label, status')
    .order('franchise_code', { ascending: true });

  if (accessProfile.franchiseIds.length) {
    query = query.in('franchise_id', accessProfile.franchiseIds);
  } else if (accessProfile.regionalIds.length) {
    query = query.in('regional_id', accessProfile.regionalIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Não foi possível carregar as submissões correntes visíveis. ${error.message}`);
  }

  return data ?? [];
}

async function fetchVisibleDashboardRows(client, accessProfile) {
  let query = client
    .from('vw_franchise_dashboard')
    .select('submission_id, franchise_id, franchise_code, regional_id, period_label, submission_status')
    .order('franchise_code', { ascending: true });

  if (accessProfile.franchiseIds.length) {
    query = query.in('franchise_id', accessProfile.franchiseIds);
  } else if (accessProfile.regionalIds.length) {
    query = query.in('regional_id', accessProfile.regionalIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Não foi possível carregar o dashboard visível por franquia. ${error.message}`);
  }

  return data ?? [];
}

async function fetchDirectoryRow(adminClient, email) {
  const { data, error } = await adminClient
    .from('vw_user_access_directory')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar o diretório administrativo para ${email}. ${error.message}`);
  }

  return data;
}

async function expectNoRows(queryPromise, label) {
  const { data, error } = await queryPromise;

  if (error) {
    throw new Error(`${label} falhou ao consultar o banco. ${error.message}`);
  }

  if ((data ?? []).length > 0) {
    throw new Error(`${label} retornou ${(data ?? []).length} registro(s), mas deveria estar vazio.`);
  }
}

function assertCodes(rows, selector, expectedCodes, label) {
  const actualCodes = [...new Set(rows.map(selector).filter(Boolean))].sort();
  const sortedExpected = [...expectedCodes].sort();

  ensure(
    JSON.stringify(actualCodes) === JSON.stringify(sortedExpected),
    `${label} divergente. Esperado ${sortedExpected.join(', ')}, recebido ${actualCodes.join(', ') || 'vazio'}.`,
  );
}

async function validateFranchiseIsolation(client, accessProfile, allowedTarget, forbiddenTarget, tempPeriodId, label) {
  const visibleFranchises = await fetchVisibleFranchises(client, accessProfile);
  const visibleSubmissions = await fetchVisibleCurrentSubmissions(client, accessProfile);
  const visibleDashboard = await fetchVisibleDashboardRows(client, accessProfile);

  assertCodes(visibleFranchises, (row) => row.code, [allowedTarget.code], `${label}: franquias visíveis`);
  assertCodes(visibleSubmissions, (row) => row.franchise_code, [allowedTarget.code], `${label}: submissões visíveis`);
  assertCodes(visibleDashboard, (row) => row.franchise_code, [allowedTarget.code], `${label}: dashboard visível`);

  await expectNoRows(
    client.from('franchises').select('id, code').eq('id', forbiddenTarget.id),
    `${label}: leitura direta da coligada bloqueada`,
  );

  await expectNoRows(
    client
      .from('vw_current_submissions')
      .select('submission_id, franchise_code')
      .eq('franchise_id', forbiddenTarget.id),
    `${label}: submissões de outra coligada bloqueadas`,
  );

  const createResult = await invokeRpc(client, 'fn_create_submission_version', {
    p_franchise_id: allowedTarget.id,
    p_reporting_period_id: tempPeriodId,
    p_event_id: null,
  });

  ensure(createResult.status === 'draft', `${label}: a criação do draft deveria iniciar em draft.`);

  const blockedMessage = await expectRpcFailure(
    client,
    'fn_create_submission_version',
    {
      p_franchise_id: forbiddenTarget.id,
      p_reporting_period_id: tempPeriodId,
      p_event_id: null,
    },
    /Acesso negado/i,
    `${label}: operação fora da própria coligada`,
  );

  addNote(`${label}: tentativa fora da coligada retornou "${blockedMessage}".`);
}

async function validateRegionalIsolation(client, accessProfile, allowedCodes, forbiddenTarget, tempPeriodId, allowedTargetForWriteProbe, label) {
  const visibleFranchises = await fetchVisibleFranchises(client, accessProfile);
  const visibleSubmissions = await fetchVisibleCurrentSubmissions(client, accessProfile);
  const visibleDashboard = await fetchVisibleDashboardRows(client, accessProfile);

  assertCodes(visibleFranchises, (row) => row.code, allowedCodes, `${label}: franquias visíveis`);
  assertCodes(visibleSubmissions, (row) => row.franchise_code, allowedCodes, `${label}: submissões visíveis`);
  assertCodes(visibleDashboard, (row) => row.franchise_code, allowedCodes, `${label}: dashboard visível`);

  await expectNoRows(
    client.from('franchises').select('id, code').eq('id', forbiddenTarget.id),
    `${label}: leitura direta fora da regional`,
  );

  const blockedMessage = await expectRpcFailure(
    client,
    'fn_create_submission_version',
    {
      p_franchise_id: allowedTargetForWriteProbe.id,
      p_reporting_period_id: tempPeriodId,
      p_event_id: null,
    },
    /Acesso negado/i,
    `${label}: tentativa de escrita`,
  );

  addNote(`${label}: tentativa de escrita retornou "${blockedMessage}".`);
}

function makePassword() {
  return `Dre${crypto.randomBytes(9).toString('base64url')}!`;
}

function writeReports(finalStatus) {
  mkdirSync(outputDir, { recursive: true });

  const markdownLines = [
    '# Validacao de Configuracoes e Isolamento por Coligada',
    '',
    `- Data: ${new Date().toISOString()}`,
    `- Workspace: \`${root}\``,
    `- Status final: **${finalStatus.toUpperCase()}**`,
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
}

async function main() {
  ensure(adminEmail, 'DRE_ADMIN_EMAIL não configurado.');
  ensure(adminPassword, 'DRE_ADMIN_PASSWORD não configurado.');

  let adminClient = null;
  let tempPeriod = null;
  let smokeUsers = null;

  try {
    adminClient = await signInWithPassword(adminEmail, adminPassword, 'o administrador');
    const adminAccess = await resolveAccessProfile(adminClient);
    ensure(adminAccess.roleCodes.includes('system_admin'), 'A conta administrativa autenticada não possui o papel system_admin.');
    record('pass', 'Autenticação administrativa', `Admin autenticado com papéis: ${adminAccess.roleCodes.join(', ')}.`);

    const seedResult = await invokeRpc(adminClient, 'fn_admin_seed_demo_environment');
    record(
      'pass',
      'Seed demo controlado',
      `${seedResult.message} ${seedResult.franchises} coligadas demo e ${seedResult.current_submissions} submissões correntes.`,
    );

    let demoTargets = await fetchDemoTargets(adminClient);
    tempPeriod = await createTemporaryOpenPeriod(adminClient);
    record('pass', 'Competência temporária', `Competência ${tempPeriod.label} criada para os probes de acesso.`);

    smokeUsers = {
      franchiseUser: {
        email: `franchise.${smokeNamespace}@${smokeDomain}`,
        password: makePassword(),
        fullName: 'Smoke Coligada DRE',
      },
      regionalManager: {
        email: `regional.${smokeNamespace}@${smokeDomain}`,
        password: makePassword(),
        fullName: 'Smoke Regional DRE',
      },
      viewer: {
        email: `viewer.${smokeNamespace}@${smokeDomain}`,
        password: makePassword(),
        fullName: 'Smoke Viewer DRE',
      },
    };

    await invokeProvisionUser(adminClient, {
      email: smokeUsers.franchiseUser.email,
      fullName: smokeUsers.franchiseUser.fullName,
      password: smokeUsers.franchiseUser.password,
      status: 'active',
      roleCode: 'franchise_user',
      scopeType: 'franchise',
      franchiseId: demoTargets.fortaleza.id,
      regionalId: null,
    });
    record('pass', 'Provisionamento franchise_user', 'Usuário configurado inicialmente para a coligada DEMO-FOR.');

    await invokeProvisionUser(adminClient, {
      email: smokeUsers.regionalManager.email,
      fullName: smokeUsers.regionalManager.fullName,
      password: smokeUsers.regionalManager.password,
      status: 'active',
      roleCode: 'regional_manager',
      scopeType: 'regional',
      franchiseId: null,
      regionalId: demoTargets.regionalSudeste.id,
    });
    record('pass', 'Provisionamento regional_manager', 'Usuário configurado para a regional DEMO-SE.');

    await invokeProvisionUser(adminClient, {
      email: smokeUsers.viewer.email,
      fullName: smokeUsers.viewer.fullName,
      password: smokeUsers.viewer.password,
      status: 'active',
      roleCode: 'viewer',
      scopeType: 'franchise',
      franchiseId: demoTargets.beloHorizonte.id,
      regionalId: null,
    });
    record('pass', 'Provisionamento viewer', 'Usuário configurado em leitura para a coligada DEMO-BHZ.');

    const franchiseDirectory = await fetchDirectoryRow(adminClient, smokeUsers.franchiseUser.email);
    ensure(franchiseDirectory?.scope_type === 'franchise', 'O diretório deveria marcar o franchise_user como escopo de franquia.');
    ensure(franchiseDirectory?.franchise_code === 'DEMO-FOR', 'O diretório deveria exibir a coligada DEMO-FOR.');
    ensure(franchiseDirectory?.regional_code === 'DEMO-NE', 'O diretório deveria derivar a regional DEMO-NE a partir da coligada.');
    ensure(Boolean(franchiseDirectory?.regional_id), 'O diretório deveria expor o regional_id efetivo para a coligada.');
    record('pass', 'Diretório administrativo da coligada', 'A linha administrativa já expõe coligada e regional efetivas.');

    const regionalDirectory = await fetchDirectoryRow(adminClient, smokeUsers.regionalManager.email);
    ensure(regionalDirectory?.scope_type === 'regional', 'O diretório deveria marcar o regional_manager como escopo regional.');
    ensure(regionalDirectory?.regional_code === 'DEMO-SE', 'O diretório deveria exibir a regional DEMO-SE.');
    record('pass', 'Diretório administrativo da regional', 'A linha administrativa da regional ficou coerente com a liberação.');

    const viewerDirectory = await fetchDirectoryRow(adminClient, smokeUsers.viewer.email);
    ensure(viewerDirectory?.scope_type === 'franchise', 'O diretório deveria marcar o viewer como escopo de franquia.');
    ensure(viewerDirectory?.franchise_code === 'DEMO-BHZ', 'O viewer deveria apontar para a coligada DEMO-BHZ.');
    ensure(viewerDirectory?.regional_code === 'DEMO-SE', 'O viewer deveria herdar a regional correta da coligada.');
    record('pass', 'Diretório administrativo do viewer', 'O viewer ficou restrito à coligada escolhida em leitura.');

    const franchiseClient = await signInWithPassword(
      smokeUsers.franchiseUser.email,
      smokeUsers.franchiseUser.password,
      'o franchise_user smoke',
    );
    const regionalClient = await signInWithPassword(
      smokeUsers.regionalManager.email,
      smokeUsers.regionalManager.password,
      'o regional_manager smoke',
    );
    const viewerClient = await signInWithPassword(
      smokeUsers.viewer.email,
      smokeUsers.viewer.password,
      'o viewer smoke',
    );

    const franchiseAccess = await resolveAccessProfile(franchiseClient);
    ensure(franchiseAccess.roleCodes.includes('franchise_user'), 'O franchise_user não autenticou com o papel correto.');
    ensure(franchiseAccess.franchiseIds.length === 1, 'O franchise_user deveria ter exatamente uma coligada liberada.');

    await validateFranchiseIsolation(
      franchiseClient,
      franchiseAccess,
      demoTargets.fortaleza,
      demoTargets.campinas,
      tempPeriod.id,
      'Franchise user inicial',
    );
    record('pass', 'Isolamento da coligada inicial', 'O franchise_user enxergou apenas DEMO-FOR e operou somente a própria unidade.');

    await invokeProvisionUser(adminClient, {
      email: smokeUsers.franchiseUser.email,
      fullName: smokeUsers.franchiseUser.fullName,
      password: smokeUsers.franchiseUser.password,
      status: 'active',
      roleCode: 'franchise_user',
      scopeType: 'franchise',
      franchiseId: demoTargets.campinas.id,
      regionalId: null,
    });

    const franchiseDirectoryAfterSwap = await fetchDirectoryRow(adminClient, smokeUsers.franchiseUser.email);
    ensure(franchiseDirectoryAfterSwap?.franchise_code === 'DEMO-CPS', 'A troca de coligada deveria refletir DEMO-CPS no diretório.');
    ensure(franchiseDirectoryAfterSwap?.regional_code === 'DEMO-SE', 'A troca de coligada deveria atualizar a regional derivada para DEMO-SE.');
    record('pass', 'Troca de coligada no diretório', 'A troca administrativa refletiu imediatamente a nova unidade visível.');

    const franchiseClientAfterSwap = await signInWithPassword(
      smokeUsers.franchiseUser.email,
      smokeUsers.franchiseUser.password,
      'o franchise_user smoke após troca',
    );
    const franchiseAccessAfterSwap = await resolveAccessProfile(franchiseClientAfterSwap);
    await validateFranchiseIsolation(
      franchiseClientAfterSwap,
      franchiseAccessAfterSwap,
      demoTargets.campinas,
      demoTargets.fortaleza,
      tempPeriod.id,
      'Franchise user apos troca',
    );
    record('pass', 'Isolamento após troca de coligada', 'O mesmo usuário passou a enxergar somente DEMO-CPS após a reconfiguração.');

    const regionalAccess = await resolveAccessProfile(regionalClient);
    ensure(regionalAccess.roleCodes.includes('regional_manager'), 'O regional_manager não autenticou com o papel correto.');
    ensure(regionalAccess.regionalIds.length === 1, 'O regional_manager deveria ter exatamente uma regional liberada.');

    await validateRegionalIsolation(
      regionalClient,
      regionalAccess,
      ['DEMO-BHZ', 'DEMO-CPS'],
      demoTargets.fortaleza,
      tempPeriod.id,
      demoTargets.campinas,
      'Regional manager',
    );
    record('pass', 'Isolamento da regional', 'O regional_manager enxergou somente as coligadas DEMO-BHZ e DEMO-CPS.');

    const viewerAccess = await resolveAccessProfile(viewerClient);
    ensure(viewerAccess.roleCodes.includes('viewer'), 'O viewer não autenticou com o papel correto.');
    ensure(viewerAccess.franchiseIds.length === 1, 'O viewer deveria ter exatamente uma coligada liberada.');

    await validateRegionalIsolation(
      viewerClient,
      viewerAccess,
      ['DEMO-BHZ'],
      demoTargets.campinas,
      tempPeriod.id,
      demoTargets.beloHorizonte,
      'Viewer',
    );
    record('pass', 'Leitura restrita do viewer', 'O viewer ficou em leitura apenas na coligada DEMO-BHZ.');

    const cleanupReset = await invokeRpc(adminClient, 'fn_admin_reset_demo_environment');
    record('pass', 'Reset demo pós-validação', `${cleanupReset.message} Sandbox limpo antes da restauração final.`);

    await cleanupTemporaryPeriod(adminClient, tempPeriod.id);
    record('pass', 'Limpeza da competência temporária', `Competência ${tempPeriod.label} removida após os probes.`);
    tempPeriod = null;

    const restoreSeed = await invokeRpc(adminClient, 'fn_admin_seed_demo_environment');
    record('pass', 'Restauração do demo oficial', `${restoreSeed.message} Ambiente devolvido ao estado padrão.`);

    demoTargets = await fetchDemoTargets(adminClient);

    await invokeProvisionUser(adminClient, {
      email: smokeUsers.franchiseUser.email,
      fullName: smokeUsers.franchiseUser.fullName,
      password: smokeUsers.franchiseUser.password,
      status: 'active',
      roleCode: 'franchise_user',
      scopeType: 'franchise',
      franchiseId: demoTargets.fortaleza.id,
      regionalId: null,
    });

    await invokeProvisionUser(adminClient, {
      email: smokeUsers.regionalManager.email,
      fullName: smokeUsers.regionalManager.fullName,
      password: smokeUsers.regionalManager.password,
      status: 'active',
      roleCode: 'regional_manager',
      scopeType: 'regional',
      franchiseId: null,
      regionalId: demoTargets.regionalSudeste.id,
    });

    await invokeProvisionUser(adminClient, {
      email: smokeUsers.viewer.email,
      fullName: smokeUsers.viewer.fullName,
      password: smokeUsers.viewer.password,
      status: 'active',
      roleCode: 'viewer',
      scopeType: 'franchise',
      franchiseId: demoTargets.beloHorizonte.id,
      regionalId: null,
    });

    record('pass', 'Reposição dos acessos smoke', 'Os usuários técnicos ficaram apontando para IDs válidos do demo restaurado.');
  } catch (error) {
    record('fail', 'Execução da validação de configurações', formatError(error));

    if (adminClient) {
      try {
        await invokeRpc(adminClient, 'fn_admin_reset_demo_environment');
      } catch {}

      if (tempPeriod?.id) {
        try {
          await cleanupTemporaryPeriod(adminClient, tempPeriod.id);
        } catch {}
      }
    }
  }

  const finalStatus = failures.length > 0 ? 'fail' : 'pass';
  writeReports(finalStatus);

  if (finalStatus === 'fail') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  record('fail', 'Execução do runner', formatError(error));
  writeReports('fail');
  process.exitCode = 1;
});
