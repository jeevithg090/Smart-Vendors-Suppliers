import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { withTimeout } from '../utils/timeout';
import { extractServerErrorMessage, isConnectivityFailure } from '../utils/authErrors';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'vendor' | 'supplier';
  profileId?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

const AUTH_STORAGE_KEY = 'auth_user';
const AUTH_TIMEOUT_MS = 10000;

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (typeof parsed.email === 'string' && (parsed.role === 'vendor' || parsed.role === 'supplier')) {
      return parsed as User;
    }
  } catch {
    // fall through and clear the corrupted value
  }
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — nothing to clean up
  }
  return null;
}

function persistUser(user: User | null) {
  try {
    if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // storage unavailable — session lasts for this tab only
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: 'vendor' | 'supplier') => Promise<AuthResult>;
  signup: (email: string, password: string, firstName: string, lastName: string, role: 'vendor' | 'supplier') => Promise<AuthResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fallbackAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  login: async () => ({ success: false, error: 'Authentication is unavailable' }),
  signup: async () => ({ success: false, error: 'Authentication is unavailable' }),
  logout: () => {},
  isAuthenticated: false,
};

// eslint-disable-next-line react-refresh/only-export-components -- hook is colocated with its provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      console.warn('useAuth used outside AuthProvider, falling back to guest auth context.');
    }
    return fallbackAuthContext;
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authenticateUser = useMutation(api.auth.authenticateUser);

  // Restore an existing session on app start
  useEffect(() => {
    setUser(readStoredUser());
    setIsLoading(false);
  }, []);

  const completeAuth = (nextUser: User): AuthResult => {
    setUser(nextUser);
    persistUser(nextUser);
    return { success: true };
  };

  /**
   * In local development without a reachable Convex backend, allow an offline
   * demo session so the UI can still be explored. Never enabled in production.
   */
  const devFallback = (email: string, role: User['role'], firstName?: string, lastName?: string): AuthResult | null => {
    if (!import.meta.env.DEV) return null;
    console.warn('Convex backend unreachable; starting an offline development session.');
    return completeAuth({
      id: email,
      email,
      firstName: firstName || email.split('@')[0],
      lastName: lastName || 'User',
      role,
      profileId: `${role}_${Date.now()}`,
    });
  };

  const runAuth = async (
    args: Parameters<typeof authenticateUser>[0],
    fallbackMessage: string,
  ): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const result = await withTimeout(authenticateUser(args), AUTH_TIMEOUT_MS);
      return completeAuth({
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        profileId: result.user.profileId,
      });
    } catch (error) {
      if (isConnectivityFailure(error)) {
        const offline = devFallback(args.email, args.role, args.firstName, args.lastName);
        if (offline) return offline;
        return { success: false, error: 'Unable to reach the server. Please check your connection and try again.' };
      }
      return { success: false, error: extractServerErrorMessage(error, fallbackMessage) };
    } finally {
      setIsLoading(false);
    }
  };

  const login = (email: string, password: string, role: User['role']) =>
    runAuth({ email, password, role, isSignup: false }, 'Login failed. Please check your credentials.');

  const signup = (email: string, password: string, firstName: string, lastName: string, role: User['role']) =>
    runAuth({ email, password, role, firstName, lastName, isSignup: true }, 'Signup failed. Please try again.');

  const logout = () => {
    setUser(null);
    persistUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
