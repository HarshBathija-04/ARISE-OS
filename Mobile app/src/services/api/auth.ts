/**
 * SOLO OS — shared-backend auth (login / register / logout).
 *
 * Talks to the website's token endpoints and persists the bearer token via the
 * API client's secure storage. All methods no-op cleanly when the API is not
 * configured, preserving local-only mode.
 */
import { apiFetch, setToken, isApiEnabled } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
}

interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  if (!isApiEnabled) return { ok: false, error: 'Cloud sync is not configured.' };
  const res = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  if (res.ok && res.data?.token) {
    await setToken(res.data.token);
    return { ok: true, user: res.data.user };
  }
  return { ok: false, error: res.error ?? 'Login failed' };
}

export async function register(email: string, password: string, name: string): Promise<AuthResult> {
  if (!isApiEnabled) return { ok: false, error: 'Cloud sync is not configured.' };
  const res = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, name },
  });
  if (res.ok && res.data?.token) {
    await setToken(res.data.token);
    return { ok: true, user: res.data.user };
  }
  return { ok: false, error: res.error ?? 'Registration failed' };
}

export async function logout(): Promise<void> {
  await setToken(null);
}
