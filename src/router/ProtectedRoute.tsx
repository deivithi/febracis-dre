import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessRoles } from '../features/auth/access';
import type { RoleCode } from '../features/auth/auth.types';
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
    return <Navigate to="/login" replace state={{ from: location }} />;
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
        <div className="page-loading">
          <p className="page-loading__text">
            Não foi possível validar as permissões do seu usuário.
          </p>
        </div>
      );
    }

    if (!accessProfileQuery.data || !canAccessRoles(accessProfileQuery.data.roleCodes, allowedRoles)) {
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
