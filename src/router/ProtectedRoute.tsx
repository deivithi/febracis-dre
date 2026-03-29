import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessRoles } from '../features/auth/access';
import type { RoleCode } from '../features/auth/auth.types';
import type { AccessDeniedState } from '../features/auth/AccessDeniedPage';
import { useAccessProfile } from '../features/auth/useAccessProfile';
import { useAuth } from '../features/auth/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: RoleCode[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const accessProfileQuery = useAccessProfile();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__spinner" />
        <p className="page-loading__text">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length) {
    if (accessProfileQuery.isLoading) {
      return (
        <div className="page-loading">
          <div className="page-loading__spinner" />
          <p className="page-loading__text">Validando permissões...</p>
        </div>
      );
    }

    if (accessProfileQuery.error) {
      return (
        <div className="page-loading page-loading--error">
          <p className="page-loading__text">
            Não foi possível validar as permissões do seu usuário.
          </p>
          {accessProfileQuery.error instanceof Error ? (
            <p className="page-loading__detail">{accessProfileQuery.error.message}</p>
          ) : null}
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void accessProfileQuery.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (!accessProfileQuery.data || !canAccessRoles(accessProfileQuery.data.roleCodes, allowedRoles)) {
      const deniedState: AccessDeniedState = {
        attemptedPath: location.pathname,
        allowedRoles,
      };
      return <Navigate to="/app/forbidden" replace state={deniedState} />;
    }
  }

  return <>{children}</>;
}
