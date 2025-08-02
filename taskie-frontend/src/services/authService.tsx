import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  async verifyOTP(email: string, otp: string) {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      return response.data;
    } catch (error: any) {
      console.error('OTP verification error:', error.response?.data || error.message);
      throw error;
    }
  },

  async register( data: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    workspace_domain?: string;
  }) {
    try {
      // Validate password before sending
      if (!data.password|| data.password.length < 4) {
        throw new Error('Password must be at least 4 characters long');
      }

      console.log('Registering user with data:', { ...data, password: '[HIDDEN]' });
      const response = await api.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  async resendOTP(email: string) {
    try {
      const response = await api.post('/auth/resend-otp', { email });
      return response.data;
    } catch (error: any) {
      console.error('Resend OTP error:', error.response?.data || error.message);
      throw error;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');
    }
  }
};

export default api;