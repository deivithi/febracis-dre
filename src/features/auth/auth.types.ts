export type RoleCode =
  | 'franchise_user'
  | 'regional_manager'
  | 'finance_controller'
  | 'executive'
  | 'system_admin';

export type ScopeType = 'franchise' | 'regional' | 'network';

export type DashboardScope = 'franchise' | 'regional' | 'holding' | 'controladoria';

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  status: string;
}

export interface RoleRecord {
  id: string;
  code: RoleCode;
  name: string;
  description?: string | null;
}

export interface RegionalRecord {
  id: string;
  code: string;
  name: string;
}

export interface FranchiseRecord {
  id: string;
  code: string;
  trade_name: string;
  regional_id: string;
  status: string;
}

export interface ScopeRecord {
  id: string;
  scope_type: ScopeType;
  franchise_id: string | null;
  regional_id: string | null;
  franchise: Pick<FranchiseRecord, 'id' | 'code' | 'trade_name'> | null;
  regional: Pick<RegionalRecord, 'id' | 'code' | 'name'> | null;
}

export interface AccessProfile {
  profile: ProfileRecord | null;
  roles: RoleRecord[];
  scopes: ScopeRecord[];
  roleCodes: RoleCode[];
  primaryRole: RoleRecord | null;
  dashboardScope: DashboardScope;
  isAdmin: boolean;
  canManageReview: boolean;
  hasNetworkScope: boolean;
  franchiseIds: string[];
  regionalIds: string[];
}
