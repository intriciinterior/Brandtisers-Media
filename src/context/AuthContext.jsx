import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState({
    company_name: '',
    logo_url: '',
    tagline: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    time_zone: 'Asia/Kolkata',
    setup_completed: false
  });
  const [token, setToken] = useState(() => localStorage.getItem('it_token') || null);
  const [loading, setLoading] = useState(true);

  // Load company branding initially (even before login)
  useEffect(() => {
    async function loadCompany() {
      try {
        const comp = await api.getCompanySettings();
        if (comp) {
          setCompany(comp);
          if (comp.company_name) {
            document.title = `${comp.company_name} | IT Operations`;
          }
        }
      } catch (err) {
        // Ignore network error on initial load
      }
    }
    loadCompany();
  }, []);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('it_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        if (data && data.user) {
          setUser(data.user);
          if (data.company) {
            setCompany(data.company);
            if (data.company.company_name) {
              document.title = `${data.company.company_name} | IT Operations`;
            }
          }
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (loginId, password) => {
    const data = await api.login(loginId, password);
    if (data.token && data.user) {
      localStorage.setItem('it_token', data.token);
      setToken(data.token);
      setUser(data.user);
      if (data.company) {
        setCompany(data.company);
        if (data.company.company_name) {
          document.title = `${data.company.company_name} | IT Operations`;
        }
      }
      return { user: data.user, setup_completed: data.setup_completed };
    }
    throw new Error('Invalid login response from server');
  };

  const logout = () => {
    localStorage.removeItem('it_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
        if (data.company) {
          setCompany(data.company);
        }
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const updateCompanyBranding = (newCompany) => {
    setCompany(prev => {
      const updated = { ...prev, ...newCompany };
      if (updated.company_name) {
        document.title = `${updated.company_name} | IT Operations`;
      }
      return updated;
    });
  };

  const impersonate = async (targetUserId) => {
    const data = await api.impersonate(targetUserId);
    if (data.token && data.user) {
      localStorage.setItem('it_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.error || 'Failed to switch account');
  };

  const exitImpersonate = async () => {
    const data = await api.exitImpersonate();
    if (data.token && data.user) {
      localStorage.setItem('it_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.error || 'Failed to restore original account');
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const isImpersonated = Boolean(user?.is_impersonated);
  const originalUser = user?.original_user || null;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      company,
      setCompany: updateCompanyBranding,
      loading,
      login,
      logout,
      refreshUser,
      impersonate,
      exitImpersonate,
      isSuperAdmin,
      isEmployee,
      isImpersonated,
      originalUser,
      canManageEmployees: isSuperAdmin,
      canManageClients: isSuperAdmin,
      canManageWorkTypes: isSuperAdmin,
      canManageSettings: isSuperAdmin,
      canDeleteTasks: isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
