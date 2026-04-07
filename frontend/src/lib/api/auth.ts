import { apiClient } from './client';
import type {
  LoginRequest,
  AuthResponse,
  CurrentUserProfile,
  UpdateProfileRequest,
  RegisterContributorRequest,
  EmailActionResponse,
  ConfirmEmailVerificationResponse,
  PasswordChangeResponse,
} from '@/lib/types';
import { useAuthStore } from '@/lib/store/authStore';

const REFRESH_KEY = 'fh_refresh';
const PREFIX = '/api/v1/auth';

export const authApi = {
  /**
   * Log in with email + password.
   * Stores the refresh token in localStorage and hydrates the auth store.
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(`${PREFIX}/login`, credentials, {
      skipAuth: true,
      skipRefresh: true,
    });
    // Persist refresh token
    if (res.refreshToken) {
      localStorage.setItem(REFRESH_KEY, res.refreshToken);
    }
    useAuthStore.getState().setSession(res.accessToken, res.user);
    return res;
  },

  register: async (payload: RegisterContributorRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(`${PREFIX}/register`, payload, {
      skipAuth: true,
      skipRefresh: true,
    });
    if (res.refreshToken) {
      localStorage.setItem(REFRESH_KEY, res.refreshToken);
    }
    useAuthStore.getState().setSession(res.accessToken, res.user);
    return res;
  },

  /**
   * Log out — clears auth store and removes the refresh token.
   * Best-effort: ignores server errors.
   */
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
      if (refreshToken) {
        await apiClient.post(`${PREFIX}/logout`, { refreshToken });
      }
    } catch {
      // ignore
    } finally {
      useAuthStore.getState().clearSession();
    }
  },

  /**
   * Attempt a silent token refresh using the stored refresh token.
   * Returns true on success.
   */
  refresh: async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const res = await apiClient.post<AuthResponse>(
        `${PREFIX}/refresh`,
        { refreshToken },
        { skipAuth: true, skipRefresh: true },
      );
      if (res.refreshToken) {
        localStorage.setItem(REFRESH_KEY, res.refreshToken);
      }
      useAuthStore.getState().setSession(res.accessToken, res.user);
      return true;
    } catch {
      useAuthStore.getState().clearSession();
      return false;
    }
  },

  /** Fetch the currently authenticated user's full profile */
  me: () => apiClient.get<CurrentUserProfile>(`${PREFIX}/me`),

  /** Update the currently authenticated user's profile (PATCH /auth/me/profile) */
  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<CurrentUserProfile>(`${PREFIX}/me/profile`, data),

  requestPasswordReset: (email: string) =>
    apiClient.post<EmailActionResponse>(`${PREFIX}/password/reset/request`, { email }, {
      skipAuth: true,
      skipRefresh: true,
    }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    apiClient.post<PasswordChangeResponse>(`${PREFIX}/password/reset/confirm`, { token, newPassword }, {
      skipAuth: true,
      skipRefresh: true,
    }),

  requestEmailVerification: () =>
    apiClient.post<EmailActionResponse>(`${PREFIX}/email/verification/request`),

  confirmEmailVerification: (token: string) =>
    apiClient.post<ConfirmEmailVerificationResponse>(`${PREFIX}/email/verification/confirm`, { token }, {
      skipAuth: true,
      skipRefresh: true,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<PasswordChangeResponse>(`${PREFIX}/password/change`, {
      currentPassword,
      newPassword,
    }),
};
