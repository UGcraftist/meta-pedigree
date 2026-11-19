import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchAppUser } from '../lib/api';
import type { AppUserRow } from '../lib/types';

interface AuthState {
  session: Session | null;
  appUser: AppUserRow | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async (next: Session | null) => {
      setSession(next);
      if (!next) {
        setAppUser(null);
        setLoading(false);
        return;
      }
      try {
        const user = await fetchAppUser();
        if (alive) setAppUser(user);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void load(next);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      appUser,
      loading,
      error,
      async signIn(email, password) {
        setError(null);
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) setError(e.message);
      },
      async signOut() {
        await supabase.auth.signOut();
        setAppUser(null);
      },
    }),
    [session, appUser, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
