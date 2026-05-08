import type { AccessProfile, DashboardScope, RoleCode, RoleRecord, ScopeRecord } from './auth.types';

const ROLE_PRIORITY: RoleCode[] = [
  'system_admin',
  'finance_controller',
  'executive',
  'regional_manager',
  'franchise_user',
  'viewer',
];

const REVIEW_ROLE_CODES: RoleCode[] = ['finance_controller', 'executive', 'system_admin'];
const SUBMISSION_OPERATOR_ROLE_CODES: RoleCode[] = ['franchise_user', 'system_admin'];

export function sortRolesByPriority(roles: RoleRecord[]) {
  return [...roles].sort(
    (left, right) => ROLE_PRIORITY.indexOf(left.code) - ROLE_PRIORITY.indexOf(right.code),
  );
}

export function resolvePrimaryRole(roles: RoleRecord[]) {
  return sortRolesByPriority(roles)[0] ?? null;
}

export function resolveDashboardScope(roleCodes: RoleCode[], scopes: ScopeRecord[]): DashboardScope {
  if (roleCodes.includes('finance_controller')) {
    return 'controladoria';
  }

  if (
    roleCodes.includes('system_admin') ||
    roleCodes.includes('executive') ||
    scopes.some((scope) => scope.scope_type === 'network')
  ) {
    return 'holding';
  }

  if (
    roleCodes.includes('regional_manager') ||
    scopes.some((scope) => scope.scope_type === 'regional')
  ) {
    return 'regional';
  }

  return 'franchise';
}

export function canAccessRoles(roleCodes: RoleCode[], allowedRoles?: RoleCode[]) {
  if (!allowedRoles?.length) {
    return true;
  }

  return allowedRoles.some((role) => roleCodes.includes(role));
}

export function hasReviewAccess(roleCodes: RoleCode[]) {
  return REVIEW_ROLE_CODES.some((role) => roleCodes.includes(role));
}

export function hasSubmissionOperationAccess(roleCodes: RoleCode[]) {
  return SUBMISSION_OPERATOR_ROLE_CODES.some((role) => roleCodes.includes(role));
}

export function getDashboardScopeLabel(scope: DashboardScope) {
  switch (scope) {
    case 'controladoria':
      return 'Controladoria';
    case 'holding':
      return 'Visão rede';
    case 'regional':
      return 'Regional';
    default:
      return 'Franquia';
  }
}

export function getScopeSummary(accessProfile: AccessProfile) {
  if (accessProfile.isAdmin) {
    return 'Rede completa';
  }

  if (accessProfile.hasNetworkScope) {
    return 'Rede completa';
  }

  if (accessProfile.scopes.length === 0) {
    return 'Escopo não configurado';
  }

  return accessProfile.scopes
    .map((scope) => {
      if (scope.scope_type === 'franchise' && scope.franchise) {
        return `${scope.franchise.code} • ${scope.franchise.trade_name}`;
      }

      if (scope.scope_type === 'regional' && scope.regional) {
        return `${scope.regional.code} • ${scope.regional.name}`;
      }

      return 'Rede completa';
    })
    .join(' • ');
}
