import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Workspace, AuthContextType, RegisterData } from '../types/task.types';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedWorkspace = localStorage.getItem('workspace');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          if (storedWorkspace) {
            setWorkspace(JSON.parse(storedWorkspace));
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('workspace');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ requiresOTP: true; email: string } | { requiresOTP: false }> => {
    setIsLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success) {
        if (response.data.requiresOTP) {
          setIsLoading(false);
          return { requiresOTP: true, email: response.data.email };
        } else {
          const { token: authToken, user: userData, workspace: workspaceData } = response.data;
          setToken(authToken);
          setUser(userData);

          if (workspaceData) {
            setWorkspace(workspaceData);
            localStorage.setItem('workspace', JSON.stringify(workspaceData));
          }

          localStorage.setItem('token', authToken);
          localStorage.setItem('user', JSON.stringify(userData));

          setIsLoading(false);
          return { requiresOTP: false };
        }
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Login failed');
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setIsLoading(true);
    
    try {
      const response = await authService.verifyOTP(email, otp);
      
      if (response.success) {
        const { token: authToken, user: userData, workspace: workspaceData } = response.data;
        
        setToken(authToken);
        setUser(userData);
        
        if (workspaceData) {
          setWorkspace(workspaceData);
          localStorage.setItem('workspace', JSON.stringify(workspaceData));
        }
        
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setIsLoading(false);
        navigate('/dashboard');
      } else {
        throw new Error(response.error || 'OTP verification failed');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('OTP verification error:', error);
      throw new Error(error.response?.data?.error || error.message || 'OTP verification failed');
    }
  };

  const register = async (data: RegisterData): Promise<{ requiresOTP: true; email: string } | { requiresOTP: false }> => {
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!data.email || !data.password || !data.first_name || !data.last_name || !data.username) {
        throw new Error('Please fill in all required fields');
      }

      const response = await authService.register(data);
      
      if (response.success) {
        // Check if registration requires OTP verification
        if (response.data.requiresOTP) {
          setIsLoading(false);
          return { requiresOTP: true, email: data.email };
        } else {
          const { token: authToken, user: userData, workspace: workspaceData } = response.data;
          
          setToken(authToken);
          setUser(userData);
          
          if (workspaceData) {
            setWorkspace(workspaceData);
            localStorage.setItem('workspace', JSON.stringify(workspaceData));
          }
          
          localStorage.setItem('token', authToken);
          localStorage.setItem('user', JSON.stringify(userData));
          
          setIsLoading(false);
          return { requiresOTP: false };
        }
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setWorkspace(null);
      setToken(null);
      setIsLoading(false);
      navigate('/login');
    }
  };

  const value = {
    user,
    workspace,
    token,
    login,
    verifyOTP,
    register,
    logout,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};