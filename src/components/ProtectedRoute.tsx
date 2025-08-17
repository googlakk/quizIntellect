import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole, UserRole } from '@/hooks/useRole';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-boundary';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  redirectTo = '/' 
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: roleLoading, hasRole } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (requiredRole && !hasRole(requiredRole)) {
        navigate(redirectTo);
        return;
      }
    }
  }, [user, profile, authLoading, roleLoading, requiredRole, navigate, redirectTo, hasRole]);

  if (authLoading || roleLoading) {
    return <LoadingState message="Проверка прав доступа..." />;
  }

  if (!user) {
    return null;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <ErrorMessage
        title="Доступ запрещен"
        message="У вас недостаточно прав для доступа к этой странице"
        showRetry={false}
      />
    );
  }

  return <>{children}</>;
};