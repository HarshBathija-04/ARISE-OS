/**
 * SOLO OS — Remote ECHO provider base.
 *
 * SECURITY: the client NEVER holds an AI API key. Remote providers POST the
 * privacy-safe fact sheet to the Supabase `echo` edge function, which holds the
 * key server-side and calls the real model. If Supabase is not configured, or
 * the call fails/times out, we degrade gracefully to the offline MockAIProvider
 * so ECHO always returns something useful.
 */
import { env } from '@/config/env';
import type { AIProvider, AINarrationRequest, AINarrationResult } from './types';
import { MockAIProvider } from './MockAIProvider';

const REQUEST_TIMEOUT_MS = 12_000;

const fallback = new MockAIProvider();

export abstract class RemoteAIProvider implements AIProvider {
  abstract readonly name: string;
  readonly isLocal = false;

  async narrate(req: AINarrationRequest): Promise<AINarrationResult> {
    if (!env.supabase.isConfigured) {
      // No backend to hold the key — degrade to offline.
      return fallback.narrate(req);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${env.supabase.url}/functions/v1/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.supabase.anonKey}`,
          apikey: env.supabase.anonKey,
        },
        body: JSON.stringify({ provider: this.name, request: req }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`echo edge function returned ${res.status}`);

      const data = (await res.json()) as { text?: string };
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (!text) throw new Error('echo edge function returned empty narrative');

      return { text, provider: this.name, offline: false };
    } catch {
      // Any failure (offline, timeout, server error) → deterministic fallback.
      return fallback.narrate(req);
    } finally {
      clearTimeout(timer);
    }
  }
}
