/**
 * Typed environment configuration for SOLO OS.
 *
 * All values are read from `EXPO_PUBLIC_*` variables (inlined at build time).
 * The app is designed to run in a degraded "local-only" mode when Supabase is
 * not configured, so nothing here throws on missing values.
 */

export type AIProviderName = 'mock' | 'claude' | 'openai' | 'gemini';

function str(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

const supabaseUrl = str(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = str(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Shared backend: the Next.js website's REST API. When set, the app can log in,
// sync its game-state snapshot, and push timetable/study data cross-device.
const apiBaseUrl = str(process.env.EXPO_PUBLIC_API_BASE_URL).replace(/\/+$/, '');

const rawProvider = str(process.env.EXPO_PUBLIC_AI_PROVIDER).toLowerCase();
const aiProvider: AIProviderName = (
  ['mock', 'claude', 'openai', 'gemini'] as const
).includes(rawProvider as AIProviderName)
  ? (rawProvider as AIProviderName)
  : 'mock';

export const env = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    /** True only when both URL and key are present. */
    isConfigured: supabaseUrl.length > 0 && supabaseAnonKey.length > 0,
  },
  api: {
    baseUrl: apiBaseUrl,
    /** True when a shared-backend base URL is configured. */
    isConfigured: apiBaseUrl.length > 0,
  },
  ai: {
    provider: aiProvider,
  },
} as const;

export type Env = typeof env;
