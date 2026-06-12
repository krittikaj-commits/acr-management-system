import { create } from 'zustand';
import type { IUser } from '@/types/auth';

/**
 * Auth store state interface.
 */
interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

/**
 * Auth store actions interface.
 */
interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: IUser) => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

/**
 * Hydrate initial state from localStorage if available.
 */
function getInitialState(): AuthState {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? (JSON.parse(userStr) as IUser) : null;

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!accessToken,
  };
}

/**
 * Zustand auth store — manages authentication state.
 *
 * Persists tokens and user to localStorage for session continuity.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  ...getInitialState(),

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  setUser: (user: IUser) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
