import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { hasReviewAccess, resolveDashboardScope, resolvePrimaryRole, sortRolesByPriority } from './access';
import type {
  AccessProfile,
  FranchiseRecord,
  ProfileRecord,
  RegionalRecord,
  RoleRecord,
  ScopeRecord,
} from './auth.types';
import { useAuth } from './useAuth';

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

async function fetchAccessProfile(userId: string): Promise<AccessProfile> {
  const [profileResult, roleLinksResult, scopesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, status')
      .eq('id', userId)
      .returns<ProfileRecord>()
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role_id')
      .eq('profile_id', userId)
      .returns<RoleLinkRow[]>(),
    supabase
      .from('user_scopes')
      .select('id, scope_type, franchise_id, regional_id')
      .eq('profile_id', userId)
      .returns<ScopeRow[]>(),
  ]);

  if (profileResult.error) {
    throw new Error(`Não foi possível carregar o perfil do usuário. ${profileResult.error.message}`);
  }

  if (roleLinksResult.error) {
    throw new Error(`Não foi possível carregar os papéis do usuário. ${roleLinksResult.error.message}`);
  }

  if (scopesResult.error) {
    throw new Error(`Não foi possível carregar os escopos do usuário. ${scopesResult.error.message}`);
  }

  const roleIds = unique((roleLinksResult.data ?? []).map((entry) => entry.role_id));
  const scopeRows = scopesResult.data ?? [];
  const franchiseIds = unique(scopeRows.map((scope) => scope.franchise_id));
  const regionalIds = unique(scopeRows.map((scope) => scope.regional_id));

  const [rolesResult, franchisesResult, regionalsResult] = await Promise.all([
    roleIds.length
      ? supabase
          .from('roles')
          .select('id, code, name, description')
          .in('id', roleIds)
          .returns<RoleRecord[]>()
      : Promise.resolve({ data: [] as RoleRecord[], error: null }),
    franchiseIds.length
      ? supabase
          .from('franchises')
          .select('id, code, trade_name, regional_id, status')
          .in('id', franchiseIds)
          .returns<FranchiseRecord[]>()
      : Promise.resolve({ data: [] as FranchiseRecord[], error: null }),
    regionalIds.length
      ? supabase
          .from('regionals')
          .select('id, code, name')
          .in('id', regionalIds)
          .returns<RegionalRecord[]>()
      : Promise.resolve({ data: [] as RegionalRecord[], error: null }),
  ]);

  if (rolesResult.error) {
    throw new Error(`Não foi possível resolver os papéis cadastrados. ${rolesResult.error.message}`);
  }

  if (franchisesResult.error) {
    throw new Error(`Não foi possível resolver as franquias vinculadas. ${franchisesResult.error.message}`);
  }

  if (regionalsResult.error) {
    throw new Error(`Não foi possível resolver as regionais vinculadas. ${regionalsResult.error.message}`);
  }

  const roles = sortRolesByPriority(rolesResult.data ?? []);
  const franchiseMap = new Map((franchisesResult.data ?? []).map((franchise) => [franchise.id, franchise]));
  const regionalMap = new Map((regionalsResult.data ?? []).map((regional) => [regional.id, regional]));
  const scopes: ScopeRecord[] = scopeRows.map((scope) => ({
    ...scope,
    franchise: scope.franchise_id
      ? (() => {
          const franchise = franchiseMap.get(scope.franchise_id);
          return franchise
            ? {
                id: franchise.id,
                code: franchise.code,
                trade_name: franchise.trade_name,
              }
            : null;
        })()
      : null,
    regional: scope.regional_id
      ? (() => {
          const regional = regionalMap.get(scope.regional_id);
          return regional
            ? {
                id: regional.id,
                code: regional.code,
                name: regional.name,
              }
            : null;
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
    hasNetworkScope: scopes.some((scope) => scope.scope_type === 'network'),
    franchiseIds,
    regionalIds,
  };
}

export function useAccessProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['auth', 'access-profile', user?.id],
    queryFn: () => fetchAccessProfile(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });
}
