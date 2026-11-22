import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  ApiError,
  getSessionSnapshot,
  login,
  logout,
  subscribeSession,
  type Session,
} from '../api/client';

interface AuthValue {
  session: Session | null;
  signingIn: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Sign-in failed. Check the API is reachable.',
      );
      throw cause;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await logout();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      signingIn,
      error,
      signIn,
      signOut,
      clearError: () => setError(null),
    }),
    [session, signingIn, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
