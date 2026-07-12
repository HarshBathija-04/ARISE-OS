/**
 * SOLO OS — AI provider factory.
 *
 * Selects a provider from `env.ai.provider`. The default (`mock`) is fully
 * offline. Remote providers require Supabase to be configured (the edge
 * function holds the key); if it is not, they transparently fall back to mock.
 */
import { env } from '@/config/env';
import type { AIProvider } from './types';
import { MockAIProvider } from './MockAIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';

let cached: AIProvider | null = null;

/** Resolve the active AI provider (memoized). */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  cached = buildProvider();
  return cached;
}

function buildProvider(): AIProvider {
  switch (env.ai.provider) {
    case 'claude':
      return new ClaudeProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'mock':
    default:
      return new MockAIProvider();
  }
}

/** Test/hot-reload helper: forget the memoized provider. */
export function resetAIProvider(): void {
  cached = null;
}

export * from './types';
export { MockAIProvider } from './MockAIProvider';
export { ClaudeProvider } from './ClaudeProvider';
export { OpenAIProvider } from './OpenAIProvider';
export { GeminiProvider } from './GeminiProvider';
