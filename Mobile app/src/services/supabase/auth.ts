import { supabase, isSupabaseEnabled } from './client';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: User | null;
}

/**
 * Auth service. All methods no-op gracefully in local-only mode so screens
 * can call them unconditionally.
 */
export const authService = {
  isEnabled: isSupabaseEnabled,

  async getSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, error: 'OFFLINE_MODE' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, error: 'OFFLINE_MODE' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  onAuthChange(cb: (session: Session | null) => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
    return () => data.subscription.unsubscribe();
  },
};
