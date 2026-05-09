import type { SavedViewPage } from './savedView.types';

export function pathnameToSavedViewPage(pathname: string): SavedViewPage | null {
  const base = pathname.replace(/\/+$/, '') || '/';
  if (base.includes('/dashboard')) return 'dashboard';
  if (base.includes('/submissions')) return 'submissions';
  if (base.includes('/workflow')) return 'approvals';
  if (base.includes('/audit')) return 'audit';
  return null;
}

export function pageToHref(page: SavedViewPage): string {
  switch (page) {
    case 'dashboard':
      return '/app/dashboard';
    case 'submissions':
      return '/app/submissions';
    case 'approvals':
      return '/app/workflow';
    case 'audit':
      return '/app/audit';
    default: {
      const _x: never = page;
      return _x;
    }
  }
}

export function pageLabel(page: SavedViewPage): string {
  switch (page) {
    case 'dashboard':
      return 'Dashboard';
    case 'submissions':
      return 'Submissões';
    case 'approvals':
      return 'Aprovações';
    case 'audit':
      return 'Auditoria';
    default: {
      const _x: never = page;
      return _x;
    }
  }
}

/** Chaves de query consideradas “filtro” para partilha (sem PII). */
export const FILTER_PARAM_KEYS: Record<SavedViewPage, string[]> = {
  dashboard: ['periodLabel', 'regional', 'franchise', 'view'],
  submissions: ['franchise', 'period', 'event', 'submission', 'view'],
  approvals: ['submission', 'view'],
  audit: ['limit', 'view', 'auditPreset', 'auditStart', 'auditEnd', 'auditTables', 'sort', 'dir'],
};
