import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
      const result = await authenticateUser({
        email,
        password,
        role,
        isSignup: false
      });

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

      // Fallback for development mode when Convex is not connected
      // Check if user exists in localStorage for development
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser && (error.message && (error.message.includes('network') || error.message.includes('connection')))) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser.email === email) {
            console.warn('Convex connection failed, using local fallback for development');
            setUser(parsedUser);
            setIsLoading(false);
            return true;
          }
        } catch (parseError) {
          console.error('Error parsing saved user during fallback:', parseError);
        }
      }

      setIsLoading(false);
      return false;
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
      const result = await authenticateUser({
        email,
        password,
        role,
        firstName,
        lastName,
        isSignup: true
      });

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

      // Fallback for development mode when Convex is not connected
      if (error.message && error.message.includes('network') || error.message.includes('connection')) {
        console.warn('Convex connection failed, using local fallback for development');
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
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
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
