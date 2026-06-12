import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DEMO_MODE } from '@/services/mock-data';

/**
 * Checks if user is authenticated. Redirects to login if not.
 * In DEMO_MODE, always allows access if a token is present.
 */

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Auth check — checks localStorage for access token.
 * In DEMO_MODE, presence of any token (including the mock token) is sufficient.
 */
function useIsAuthenticated(): boolean {
  if (DEMO_MODE) {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }
  const token = localStorage.getItem('accessToken');
  return !!token;
}

/**
 * Protected route wrapper.
 * If user is not authenticated, redirects to /login and preserves the
 * intended destination in location state for post-login redirect.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
