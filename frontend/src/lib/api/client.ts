/**
 * Fonthabesha API client
 *
 * - Injects Authorization: Bearer <accessToken> from authStore
 * - On 401: attempts one silent refresh via POST /auth/refresh (cookie-based)
 *   then retries the original request once
 * - Throws ApiError for non-2xx responses
 */

import { useAuthStore } from '@/lib/store/authStore';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';
const REFRESH_KEY = 'fh_refresh';

// ── Error class ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Additional headers merged on top of defaults */
  headers?: Record<string, string>;
  /** Skip Authorization header (e.g. for login/refresh) */
  skipAuth?: boolean;
  /** Skip the 401-retry logic */
  skipRefresh?: boolean;
  /** Raw Response needed (e.g. for blob downloads) */
  raw?: boolean;
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders = {}, skipAuth = false, skipRefresh = false, raw = false } = options;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (!skipAuth) {
      const token = useAuthStore.getState().accessToken;
      if (token) h['Authorization'] = `Bearer ${token}`;
    }

    return h;
  };

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include', // send httpOnly refresh cookie when present
    });

  let res = await doFetch();

  // ── 401 refresh retry ──────────────────────────────────────────────────────
  if (res.status === 401 && !skipRefresh && !skipAuth) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      res = await doFetch(); // retry with new token
    } else {
      useAuthStore.getState().clearSession();
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
    }
  }

  if (raw) return res as unknown as T;

  // ── Parse response ─────────────────────────────────────────────────────────
  if (res.status === 204) return undefined as unknown as T;

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const errBody = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        (errBody as { code?: string }).code ?? 'API_ERROR',
        (errBody as { message?: string }).message ?? res.statusText,
      );
    }
    throw new ApiError(res.status, 'API_ERROR', res.statusText);
  }

  if (isJson) return res.json() as Promise<T>;
  return res.text() as unknown as T;
}

// ── Silent refresh helper ──────────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  // Deduplicate concurrent 401s
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return false;

      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!res.ok) return false;

      const data = (await res.json()) as {
        accessToken: string;
        refreshToken?: string;
      };

      useAuthStore.getState().setAccessToken(data.accessToken);

      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
      }

      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Convenience methods ────────────────────────────────────────────────────────

export const apiClient = {
  get: <T = unknown>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  put: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),

  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T = unknown>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),

  /** Returns the raw Response (useful for blob downloads) */
  rawGet: (path: string, opts?: Omit<RequestOptions, 'method' | 'raw'>) =>
    request<Response>(path, { ...opts, method: 'GET', raw: true }),
};
