import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '@/config/env';

/**
 * Supabase client.
 *
 * When Supabase is not configured (no env vars), `supabase` is `null` and the
 * app runs in local-only mode. Always guard with `isSupabaseEnabled`.
 */
export const isSupabaseEnabled = env.supabase.isConfigured;

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(env.supabase.url, env.supabase.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Throws if called when Supabase isn't configured — use in server-only paths. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
