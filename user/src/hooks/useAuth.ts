import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AuthUser = Omit<User, 'role'> & {
  role?: string | null;
  is_blocked?: boolean;
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  role: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const isSchemaFallbackError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|column .* does not exist|Could not find the table/i.test(message);
};

export function useAuthState(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const attachProfileStateToUser = (
    authUser: User | AuthUser,
    nextRole: string | null,
    nextIsBlocked: boolean
  ) => {
    return {
      ...authUser,
      role: nextRole,
      is_blocked: nextIsBlocked,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        role: nextRole,
        is_blocked: nextIsBlocked,
      },
    } as AuthUser;
  };

  const getOrCreateProfileState = async (authUser: User) => {
    const baseSelect = await supabase.from('profiles').select('role,is_blocked').eq('id', authUser.id).maybeSingle();

    if (baseSelect.error && !isSchemaFallbackError(baseSelect.error)) {
      return { role: null, isBlocked: false, error: baseSelect.error };
    }

    if (baseSelect.data) {
      return {
        role: baseSelect.data.role || 'user',
        isBlocked: Boolean(baseSelect.data.is_blocked),
        error: null,
      };
    }

    const fallbackSelect = await supabase.from('profiles').select('role').eq('id', authUser.id).maybeSingle();

    if (fallbackSelect.error && !isSchemaFallbackError(fallbackSelect.error)) {
      return { role: null, isBlocked: false, error: fallbackSelect.error };
    }

    if (fallbackSelect.data?.role) {
      return { role: fallbackSelect.data.role, isBlocked: false, error: null };
    }

    const { error: insertError } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name ?? null,
        role: 'user',
      },
      { onConflict: 'id' }
    );

    if (insertError) {
      return { role: 'user', isBlocked: false, error: insertError };
    }

    return { role: 'user', isBlocked: false, error: null };
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setUser(nextSession?.user ? (nextSession.user as AuthUser) : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ? (nextSession.user as AuthUser) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncProfileState = async () => {
      if (!session?.user) {
        if (!isMounted) return;
        setRole(null);
        setIsBlocked(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { role: nextRole, isBlocked: nextIsBlocked, error } = await getOrCreateProfileState(session.user);

      if (error) {
        console.error('useAuth profile sync error:', error);
      }

      if (!isMounted) return;

      if (nextIsBlocked) {
        await supabase.auth.signOut();
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setRole(null);
        setIsBlocked(false);
        setLoading(false);
        return;
      }

      setRole(nextRole);
      setIsBlocked(nextIsBlocked);
      setUser((prev) => {
        if (!prev) return prev;
        return attachProfileStateToUser(prev, nextRole, nextIsBlocked);
      });
      setLoading(false);
    };

    syncProfileState();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'User not found' };
      }

      const { role: nextRole, isBlocked: nextIsBlocked, error: profileError } = await getOrCreateProfileState(data.user);

      if (profileError) {
        console.error('useAuth signIn profile error:', profileError);
      }

      if (nextIsBlocked) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setRole(null);
        setIsBlocked(false);
        return { success: false, error: 'Tài khoản này đã bị khóa.' };
      }

      const userWithProfile = attachProfileStateToUser(data.user, nextRole || 'user', nextIsBlocked);

      setSession(data.session ?? null);
      setUser(userWithProfile);
      setRole(nextRole || 'user');
      setIsBlocked(nextIsBlocked);

      return {
        success: true,
        user: userWithProfile,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Đăng nhập thất bại.',
      };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email: data.user.email,
            full_name: fullName ?? null,
            role: 'user',
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          return { success: false, error: profileError.message };
        }
      }

      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Đăng ký thất bại.',
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin: role === 'admin' && !isBlocked,
    isBlocked,
    role,
  };
}

export function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setIsAuthenticated(!!nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAuthenticated, loading };
}

export function useCurrentUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}
