import type { LucideIcon } from 'lucide-react';
import {
  BookOpenText,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import type { RoleCode } from '../../features/auth/auth.types';

export interface NavigationItem {
  to: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  allowedRoles?: RoleCode[];
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    label: 'Operação',
    items: [
      { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { to: '/app/guide', icon: BookOpenText, label: 'Guia' },
      {
        to: '/app/submissions',
        icon: FileSpreadsheet,
        label: 'Submissões',
        allowedRoles: ['franchise_user', 'regional_manager', 'finance_controller', 'executive', 'system_admin'],
      },
      {
        to: '/app/workflow',
        icon: ClipboardCheck,
        label: 'Aprovações',
        allowedRoles: ['finance_controller', 'executive', 'system_admin'],
      },
    ],
  },
  {
    label: 'Governança',
    items: [
      {
        to: '/app/franchises',
        icon: Building2,
        label: 'Franquias',
        allowedRoles: ['regional_manager', 'finance_controller', 'executive', 'system_admin'],
      },
      {
        to: '/app/audit',
        icon: History,
        label: 'Auditoria',
        allowedRoles: ['finance_controller', 'executive', 'system_admin'],
      },
      {
        to: '/app/admin',
        icon: Settings,
        label: 'Configurações',
        allowedRoles: ['system_admin'],
      },
    ],
  },
];
