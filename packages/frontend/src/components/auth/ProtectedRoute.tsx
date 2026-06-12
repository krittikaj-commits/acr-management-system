import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Checks if user is authenticated. Redirects to login if not.
 *
 * TODO: Replace `isAuthenticated` logic with actual auth store (Zustand)
 * once the auth module is implemented.
 */

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Temporary auth check — always returns true until auth store is connected.
 * This will be replaced with the real Zustand auth store in a later task.
 */
function useIsAuthenticated(): boolean {
  // TODO: Connect to Zustand auth store
  // const { accessToken } = useAuthStore();
  // return !!accessToken;
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
