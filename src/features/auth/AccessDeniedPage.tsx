import { ShieldOff } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import type { RoleCode } from './auth.types';
import './AccessDeniedPage.css';

export interface AccessDeniedState {
  attemptedPath?: string;
  allowedRoles?: RoleCode[];
}

const ROUTE_LABELS: Record<string, string> = {
  '/app/submissions': 'Submissões',
  '/app/assistant': 'Assistente',
  '/app/workflow': 'Aprovações',
  '/app/franchises': 'Franquias',
  '/app/audit': 'Auditoria',
  '/app/admin': 'Configurações',
};

function labelForPath(path: string) {
  return ROUTE_LABELS[path] ?? path;
}

function formatRoleList(roles: RoleCode[] | undefined) {
  if (!roles?.length) return null;
  return roles
    .map((code) =>
      code === 'franchise_user'
        ? 'usuário de franquia'
        : code === 'regional_manager'
          ? 'gestor regional'
          : code === 'finance_controller'
            ? 'controladoria'
            : code === 'executive'
              ? 'executivo'
              : code === 'system_admin'
                ? 'administrador do sistema'
                : code === 'viewer'
                  ? 'leitura (viewer)'
                  : code,
    )
    .join(', ');
}

export function AccessDeniedPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as AccessDeniedState;
  const rawPath = state.attemptedPath;
  const attempted = rawPath ? labelForPath(rawPath) : 'esta área';
  const rolesHint = formatRoleList(state.allowedRoles);

  const accessDeniedBreadcrumbSegments = useMemo(
    () => [
      { label: 'Portal', href: '/app/dashboard' },
      { label: 'Acesso restrito', href: '/app/forbidden' },
      { label: attempted },
    ],
    [attempted],
  );
  useBreadcrumb(accessDeniedBreadcrumbSegments);

  return (
    <div className="page-stack access-denied-page">
      <div className="card card--accent access-denied-page__card">
        <div className="card__body access-denied-page__body">
          <div className="access-denied-page__icon" aria-hidden="true">
            <ShieldOff size={40} />
          </div>
          <h1 className="access-denied-page__title">Sem permissão para este conteúdo</h1>
          <p className="access-denied-page__text">
            O seu perfil não inclui acesso a <strong>{attempted}</strong>
            {rawPath && rawPath !== attempted ? (
              <span className="access-denied-page__path"> ({rawPath})</span>
            ) : null}
            .
            {rolesHint ? (
              <>
                {' '}
                Este módulo requer um dos seguintes papéis: {rolesHint}.
              </>
            ) : null}
          </p>
          <p className="access-denied-page__hint">
            Se precisar de acesso, solicite ao administrador do portal. Utilizadores em modo leitura
            (viewer) utilizam principalmente o <strong>Dashboard</strong> e o <strong>Guia</strong>.
          </p>
          <div className="access-denied-page__actions">
            <Link to="/app/dashboard" className="btn btn--gold">
              Ir para o dashboard
            </Link>
            <Link to="/app/guide" className="btn btn--secondary">
              Abrir o guia
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
