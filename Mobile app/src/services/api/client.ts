/**
 * SOLO OS — REST client for the shared backend (the Next.js website API).
 *
 * The bearer token from `/api/auth/login` is stored in the device keychain via
 * expo-secure-store and attached to every request. When the API is not
 * configured (no base URL), the app stays in local-only mode.
 */
import * as SecureStore from 'expo-secure-store';
import { env } from '@/config/env';

const TOKEN_KEY = 'soloos_api_token';

let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    cachedToken = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* keychain unavailable — token stays in-memory for this session */
  }
}

export const isApiEnabled = env.api.isConfigured;

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  /** True for network/transport failures (retryable). */
  transport: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Perform a JSON request against the shared API. Never throws — always resolves
 * to an ApiResult so callers (sync engine) can classify RETRY vs REVIEW.
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<ApiResult<T>> {
  if (!isApiEnabled) {
    return { ok: false, status: 0, transport: true, data: null, error: 'API not configured' };
  }
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${env.api.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // Network / transport failure → retryable.
    return { ok: false, status: 0, transport: true, data: null, error: (e as Error)?.message ?? 'Network error' };
  }

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }

  if (res.ok) {
    return { ok: true, status: res.status, transport: false, data, error: null };
  }
  // 5xx → treat as transport (retry); 4xx → business rejection (review).
  const transport = res.status >= 500;
  const error = (data as { error?: string })?.error ?? `HTTP ${res.status}`;
  return { ok: false, status: res.status, transport, data, error };
}
