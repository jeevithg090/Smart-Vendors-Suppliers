import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'vendor' | 'supplier';
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

  // Check for existing session on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: 'vendor' | 'supplier'): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call - in a real app, this would be an actual API request
    try {
      // Simple validation for demo purposes
      if (email && password.length >= 4) {
        const newUser: User = {
          id: `${role}_${Date.now()}`,
          email,
          firstName: email.split('@')[0],
          role
        };
        
        setUser(newUser);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
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
    
    // Simulate API call
    try {
      if (email && password.length >= 4 && firstName) {
        const newUser: User = {
          id: `${role}_${Date.now()}`,
          email,
          firstName,
          lastName,
          role
        };
        
        setUser(newUser);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Signup error:', error);
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
