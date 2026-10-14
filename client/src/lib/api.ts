export const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/v1`;

/**
 * Safely removes any legacy session tokens from localStorage/sessionStorage.
 * In the same-origin proxy architecture, authentication relies strictly on
 * secure HttpOnly cookies (__Host-foss_session) and JavaScript never touches session JWTs.
 */
export function purgeLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('foss_session_token');
    localStorage.removeItem('foss_token');
    sessionStorage.removeItem('foss_session_token');
    sessionStorage.removeItem('foss_token');
  } catch {
    // Graceful fallback for restricted storage environments
  }
}

// Automatically purge legacy tokens on module initialization
purgeLegacyStorage();

/**
 * Returns the authoritative OIDC login URL.
 * In production, requests to /api/v1/* are proxied same-origin to the backend.
 */
export function getLoginUrl(): string {
  return `${API_BASE}/auth/login`;
}

export class ApiError extends Error {
  code?: string;
  details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends secure HttpOnly first-party cookies
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || (data && data.success === false)) {
    const error = data?.error || {};
    throw new ApiError(
      error.message || `Request failed with status ${response.status}`,
      error.code,
      error.details
    );
  }

  return data?.data !== undefined ? data.data : data;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
