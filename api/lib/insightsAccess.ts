import { createClient } from '@supabase/supabase-js';

import type {
  AccessProfile,
  FranchiseRecord,
  ProfileRecord,
  RegionalRecord,
  RoleCode,
  RoleRecord,
  ScopeRecord,
} from '../../src/features/auth/auth.types.js';
import {
  resolveDashboardScope,
  resolvePrimaryRole,
  sortRolesByPriority,
} from '../../src/features/auth/access.js';
import type { DreInsightsRequestBody } from './insightsSchemas.js';

/** Reuso semântico do `fetchAccessProfile` do portal (sem React). */
interface RoleLinkRow {
  role_id: string;
}

interface ScopeRow {
  id: string;
  scope_type: ScopeRecord['scope_type'];
  franchise_id: string | null;
  regional_id: string | null;
}

function unique(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getEnv(name: string, fallback?: string) {
  return process.env[name] ?? fallback ?? null;
}

function createSupabaseUserClient(authorization: string) {
  const supabaseUrl = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL') ?? undefined);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', getEnv('VITE_SUPABASE_ANON_KEY') ?? undefined);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('supabase_env_missing');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authorization },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function hasReviewAccess(roleCodes: RoleCode[]) {
  return ['finance_controller', 'executive', 'system_admin'].some((r) => roleCodes.includes(r as RoleCode));
}

function hasSubmissionOperationAccess(roleCodes: RoleCode[]) {
  return ['franchise_user', 'system_admin'].some((r) => roleCodes.includes(r as RoleCode));
}

async function fetchAccessProfileForInsights(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userId: string,
): Promise<AccessProfile> {
  const [profileResult, roleLinksResult, scopesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, status')
      .eq('id', userId)
      .returns<ProfileRecord>()
      .maybeSingle(),
    supabase.from('user_roles').select('role_id').eq('profile_id', userId).returns<RoleLinkRow[]>(),
    supabase
      .from('user_scopes')
      .select('id, scope_type, franchise_id, regional_id')
      .eq('profile_id', userId)
      .returns<ScopeRow[]>(),
  ]);

  if (profileResult.error) {
    throw new Error(`profiles: ${profileResult.error.message}`);
  }
  if (roleLinksResult.error) {
    throw new Error(`user_roles: ${roleLinksResult.error.message}`);
  }
  if (scopesResult.error) {
    throw new Error(`user_scopes: ${scopesResult.error.message}`);
  }

  const roleIds = unique((roleLinksResult.data ?? []).map((entry) => entry.role_id));
  const scopeRows = scopesResult.data ?? [];
  const franchiseIds = unique(scopeRows.map((scope) => scope.franchise_id));
  const regionalIds = unique(scopeRows.map((scope) => scope.regional_id));

  const [rolesResult, franchisesResult, regionalsResult] = await Promise.all([
    roleIds.length
      ? supabase.from('roles').select('id, code, name, description').in('id', roleIds).returns<RoleRecord[]>()
      : Promise.resolve({ data: [] as RoleRecord[], error: null }),
    franchiseIds.length
      ? supabase
          .from('franchises')
          .select('id, code, trade_name, regional_id, status')
          .in('id', franchiseIds)
          .returns<FranchiseRecord[]>()
      : Promise.resolve({ data: [] as FranchiseRecord[], error: null }),
    regionalIds.length
      ? supabase.from('regionals').select('id, code, name').in('id', regionalIds).returns<RegionalRecord[]>()
      : Promise.resolve({ data: [] as RegionalRecord[], error: null }),
  ]);

  if (rolesResult.error) {
    throw new Error(`roles: ${rolesResult.error.message}`);
  }
  if (franchisesResult.error) {
    throw new Error(`franchises: ${franchisesResult.error.message}`);
  }
  if (regionalsResult.error) {
    throw new Error(`regionals: ${regionalsResult.error.message}`);
  }

  const roles = sortRolesByPriority(rolesResult.data ?? []);
  const franchiseMap = new Map((franchisesResult.data ?? []).map((franchise) => [franchise.id, franchise]));
  const regionalMap = new Map((regionalsResult.data ?? []).map((regional) => [regional.id, regional]));

  const scopes: ScopeRecord[] = scopeRows.map((scope) => ({
    id: scope.id,
    scope_type: scope.scope_type,
    franchise_id: scope.franchise_id,
    regional_id: scope.regional_id,
    franchise: scope.franchise_id
      ? (() => {
          const franchise = franchiseMap.get(scope.franchise_id);
          return franchise
            ? { id: franchise.id, code: franchise.code, trade_name: franchise.trade_name }
            : null;
        })()
      : null,
    regional: scope.regional_id
      ? (() => {
          const regional = regionalMap.get(scope.regional_id);
          return regional ? { id: regional.id, code: regional.code, name: regional.name } : null;
        })()
      : null,
  }));

  const roleCodes = roles.map((role) => role.code);

  return {
    profile: profileResult.data ?? null,
    roles,
    scopes,
    roleCodes,
    primaryRole: resolvePrimaryRole(roles),
    dashboardScope: resolveDashboardScope(roleCodes, scopes),
    isAdmin: roleCodes.includes('system_admin'),
    canManageReview: hasReviewAccess(roleCodes),
    canOperateSubmission: hasSubmissionOperationAccess(roleCodes),
    hasNetworkScope: scopes.some((scope) => scope.scope_type === 'network'),
    franchiseIds,
    regionalIds,
  };
}

export type EffectiveInsightsScope = {
  scopeKind: 'franchise' | 'regional' | 'network';
  /** Parâmetros RPC get_kpi_history */
  rpcFranchiseId: string | null;
  rpcRegionalId: string | null;
  /** Franquia alvo (cartões / evidência) */
  targetFranchiseId: string | null;
  targetRegionalId: string | null;
};

function isFranchiseAllowed(profile: AccessProfile, franchiseId: string): boolean {
  if (profile.isAdmin || profile.hasNetworkScope) {
    return true;
  }
  if (profile.franchiseIds.includes(franchiseId)) {
    return true;
  }
  return false;
}

function isRegionalAllowed(profile: AccessProfile, regionalId: string): boolean {
  if (profile.isAdmin || profile.hasNetworkScope) {
    return true;
  }
  if (profile.regionalIds.includes(regionalId)) {
    return true;
  }
  return false;
}

export function resolveEffectiveInsightsScope(
  profile: AccessProfile,
  body: DreInsightsRequestBody,
): EffectiveInsightsScope {
  const raw = body.scope;

  if (profile.franchiseIds.length > 0 && !profile.isAdmin && !profile.hasNetworkScope) {
    const fid = raw.franchiseId && profile.franchiseIds.includes(raw.franchiseId)
      ? raw.franchiseId
      : profile.franchiseIds[0]!;
    return {
      scopeKind: 'franchise',
      rpcFranchiseId: fid,
      rpcRegionalId: null,
      targetFranchiseId: fid,
      targetRegionalId: null,
    };
  }

  if (profile.regionalIds.length > 0 && !profile.isAdmin && !profile.hasNetworkScope) {
    const rid =
      raw.regionalId && profile.regionalIds.includes(raw.regionalId) ? raw.regionalId : null;
    return {
      scopeKind: 'regional',
      rpcFranchiseId: null,
      rpcRegionalId: rid,
      targetFranchiseId: null,
      targetRegionalId: rid,
    };
  }

  let rpcFranchiseId: string | null = null;
  let rpcRegionalId: string | null = null;
  let targetFranchiseId: string | null = null;
  let targetRegionalId: string | null = null;

  if (raw.kind === 'franchise' && raw.franchiseId) {
    if (!isFranchiseAllowed(profile, raw.franchiseId)) {
      throw new Error('franchise_scope_forbidden');
    }
    rpcFranchiseId = raw.franchiseId;
    targetFranchiseId = raw.franchiseId;
  } else if (raw.kind === 'regional') {
    if (raw.regionalId) {
      if (!isRegionalAllowed(profile, raw.regionalId)) {
        throw new Error('regional_scope_forbidden');
      }
      rpcRegionalId = raw.regionalId;
      targetRegionalId = raw.regionalId;
    }
  } else {
    if (raw.regionalId) {
      if (!isRegionalAllowed(profile, raw.regionalId)) {
        throw new Error('regional_scope_forbidden');
      }
      rpcRegionalId = raw.regionalId;
      targetRegionalId = raw.regionalId;
    }
    if (raw.franchiseId) {
      if (!isFranchiseAllowed(profile, raw.franchiseId)) {
        throw new Error('franchise_scope_forbidden');
      }
      rpcFranchiseId = raw.franchiseId;
      targetFranchiseId = raw.franchiseId;
    }
  }

  const scopeKind: EffectiveInsightsScope['scopeKind'] =
    rpcFranchiseId !== null ? 'franchise' : rpcRegionalId !== null ? 'regional' : 'network';

  return {
    scopeKind,
    rpcFranchiseId,
    rpcRegionalId,
    targetFranchiseId,
    targetRegionalId,
  };
}

export async function bootstrapInsightsContext(authorization: string) {
  const supabase = createSupabaseUserClient(authorization);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('unauthenticated');
  }
  const profile = await fetchAccessProfileForInsights(supabase, userData.user.id);
  return { supabase, userId: userData.user.id, profile };
}
