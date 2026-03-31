import type { FontFamilyDetail, FontListResponse, HealthResponse } from '../types/catalog';

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(
  /\/+$/,
  '',
);

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health/live');
}

export function fetchFonts(query: {
  q?: string;
  sort?: 'popular' | 'newest' | 'alphabetical';
  page?: number;
  pageSize?: number;
}): Promise<FontListResponse> {
  const params = new URLSearchParams();

  if (query.q?.trim()) {
    params.set('q', query.q.trim());
  }

  if (query.sort) {
    params.set('sort', query.sort);
  }

  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 12));

  return requestJson<FontListResponse>(`/fonts?${params.toString()}`);
}

export function fetchFamilyDetail(slug: string): Promise<FontFamilyDetail> {
  return requestJson<FontFamilyDetail>(`/fonts/${slug}`);
}
