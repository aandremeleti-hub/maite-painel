import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import styles from './styles.module.css';

export interface IProtectedRouteProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: IProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className={styles.loadingContainer} role="status" aria-label="Carregando">
        <div className={styles.spinnerWrapper}>
          <Loader2 className={styles.spinner} aria-hidden="true" />
          <span className={styles.loadingText}>Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
