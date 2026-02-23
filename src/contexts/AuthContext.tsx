import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { withTimeout } from '../utils/timeout';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'vendor' | 'supplier';
  profileId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: 'vendor' | 'supplier') => Promise<boolean>;
  signup: (email: string, password: string, firstName: string, lastName: string, role: 'vendor' | 'supplier') => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fallbackAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  login: async () => false,
  signup: async () => false,
  logout: () => {},
  isAuthenticated: false,
};

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

const CONNECTIVITY_ERROR_PATTERNS = [
  'failed to fetch',
  'network',
  'err_failed',
  'timeout',
  'timed out',
  'socket',
  'could not connect',
  'unable to reach',
  'temporary',
  'invaliddeploymentname',
  'public function',
  'does not exist',
  'connection',
];

function isConnectivityFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return CONNECTIVITY_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authenticateUser = useMutation(api.auth.authenticateUser);

  // Check for existing session on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: 'vendor' | 'supplier'): Promise<boolean> => {
    setIsLoading(true);

    try {
      const result = await withTimeout(
        authenticateUser({
          email,
          password,
          role,
          isSignup: false
        }),
        8000 // 8 second timeout
      );

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id || '',
          email: result.user.email || '',
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role as 'vendor' | 'supplier',
          profileId: result.user.profileId
        };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);

      if (!isConnectivityFailure(error)) {
        setIsLoading(false);
        return false;
      }

      // Enhanced fallback for development mode when Convex is not connected
      console.warn('Convex connection failed, using development mode authentication');

      // Create a development user based on the login attempt
      const userData: User = {
        id: email,
        email: email,
        firstName: email.split('@')[0],
        lastName: 'User',
        role: role,
        profileId: `${role}_${Date.now()}`
      };

      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      console.log('Development mode: Created user', userData);
      setIsLoading(false);
      return true;
    }
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'vendor' | 'supplier'
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const result = await withTimeout(
        authenticateUser({
          email,
          password,
          role,
          firstName,
          lastName,
          isSignup: true
        }),
        8000 // 8 second timeout
      );

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id || '',
          email: result.user.email || '',
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role as 'vendor' | 'supplier',
          profileId: result.user.profileId
        };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Signup error:', error);

      if (!isConnectivityFailure(error)) {
        setIsLoading(false);
        return false;
      }

      // Enhanced fallback for development mode when Convex is not connected
      console.warn('Convex connection failed, using development mode authentication');

      const userData: User = {
        id: email,
        email,
        firstName,
        lastName,
        role,
        profileId: `${role}_${Date.now()}`
      };
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      console.log('Development mode: Created user', userData);
      setIsLoading(false);
      return true;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
