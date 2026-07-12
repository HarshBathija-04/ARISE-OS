/**
 * SOLO OS — auth session store.
 *
 * Tracks the signed-in user for the shared backend. The app remains fully
 * usable while signed out (local-first); signing in enables cross-device sync.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import { getToken } from '@/services/api/client';
import { login as apiLogin, register as apiRegister, logout as apiLogout, type AuthUser } from '@/services/api/auth';

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'authenticating';
  error: string | null;
  /** True once a token has been confirmed present in secure storage. */
  hydrated: boolean;

  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: 'idle',
      error: null,
      hydrated: false,

      hydrate: async () => {
        const token = await getToken();
        set((s) => ({ hydrated: true, user: token ? s.user : null }));
      },

      signIn: async (email, password) => {
        set({ status: 'authenticating', error: null });
        const res = await apiLogin(email, password);
        if (res.ok) {
          set({ user: res.user ?? null, status: 'idle', error: null });
          return true;
        }
        set({ status: 'idle', error: res.error ?? 'Login failed' });
        return false;
      },

      signUp: async (email, password, name) => {
        set({ status: 'authenticating', error: null });
        const res = await apiRegister(email, password, name);
        if (res.ok) {
          set({ user: res.user ?? null, status: 'idle', error: null });
          return true;
        }
        set({ status: 'idle', error: res.error ?? 'Registration failed' });
        return false;
      },

      signOut: async () => {
        await apiLogout();
        set({ user: null, error: null });
      },
    }),
    {
      name: 'soloos-auth-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
