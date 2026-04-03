import { create } from 'zustand';

export type UserRole = 'user' | 'contributor' | 'reviewer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** Convenience getter derived from user.role */
  role: UserRole | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  setAccessToken: (token: string) => void;
}

const REFRESH_KEY = 'fh_refresh';

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  role: null,
  isAuthenticated: false,

  setSession: (accessToken, user) => {
    set({ accessToken, user, role: user.role, isAuthenticated: true });
  },

  clearSession: () => {
    localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, user: null, role: null, isAuthenticated: false });
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
  },
}));

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectIsAdmin = (s: AuthState) =>
  s.role === 'admin' || s.role === 'reviewer';

export const selectIsContributor = (s: AuthState) =>
  s.role === 'contributor' || s.role === 'admin' || s.role === 'reviewer';
