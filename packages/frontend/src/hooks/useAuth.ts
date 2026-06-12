import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/services/api';
import type {
  ILoginResponse,
  IRefreshTokenResponse,
  ICurrentUserResponse,
  IUser,
} from '@/types/auth';

/**
 * Auth hook return interface.
 */
interface UseAuthReturn {
  /** Current authenticated user */
  currentUser: IUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Login with email + password, store tokens, redirect to dashboard */
  login: (email: string, password: string) => Promise<void>;
  /** Logout: clear tokens and redirect to login */
  logout: () => void;
  /** Refresh access token using stored refresh token */
  refreshToken: () => Promise<void>;
  /** Fetch current user from API */
  fetchCurrentUser: () => Promise<IUser>;
}

/**
 * Authentication hook — provides login, logout, token refresh, and currentUser access.
 */
export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const {
    user: currentUser,
    isAuthenticated,
    setTokens,
    setUser,
    clearAuth,
    refreshToken: storedRefreshToken,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await api.post<ILoginResponse['data']>('/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user } = response.data.data;

      setTokens(accessToken, refreshToken);
      setUser(user);
      navigate('/app/dashboard');
    },
    [navigate, setTokens, setUser],
  );

  const logout = useCallback((): void => {
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  const refreshTokenAction = useCallback(async (): Promise<void> => {
    if (!storedRefreshToken) {
      clearAuth();
      navigate('/login');
      return;
    }

    const response = await api.post<IRefreshTokenResponse['data']>(
      '/auth/refresh',
      { refreshToken: storedRefreshToken },
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    setTokens(accessToken, newRefreshToken);
  }, [storedRefreshToken, clearAuth, navigate, setTokens]);

  const fetchCurrentUser = useCallback(async (): Promise<IUser> => {
    const response = await api.get<ICurrentUserResponse['data']>('/auth/me');
    const user = response.data.data;
    setUser(user);
    return user;
  }, [setUser]);

  return {
    currentUser,
    isAuthenticated,
    login,
    logout,
    refreshToken: refreshTokenAction,
    fetchCurrentUser,
  };
}
