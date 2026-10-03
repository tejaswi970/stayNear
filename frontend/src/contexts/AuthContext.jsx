import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const clearSession = () => {
      localStorage.removeItem('sn_token');
      localStorage.removeItem('sn_user');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    };
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('staynear:auth-invalid', handleUnauthorized);

    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('sn_token');
        const stored = localStorage.getItem('sn_user');
        if (!token || !stored) return;

        let cachedUser;
        try { cachedUser = JSON.parse(stored); }
        catch { clearSession(); return; }

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await api.get('/auth/me');
          if (active) {
            const currentUser = response.data.data.user || response.data.data;
            setUser(currentUser);
            localStorage.setItem('sn_user', JSON.stringify(currentUser));
          }
        } catch (error) {
          if (error.status === 401) clearSession();
          else if (active) {
            // Keep the cached session through temporary API or database outages.
            setUser(cachedUser);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      active = false;
      window.removeEventListener('staynear:auth-invalid', handleUnauthorized);
    };
  }, []);

  const login = useCallback((userData, token) => {
    localStorage.setItem('sn_token', token);
    localStorage.setItem('sn_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sn_token');
    localStorage.removeItem('sn_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  const isAuthenticated = !!user;
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const isTenant = user?.role === 'tenant';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated, isOwner, isAdmin, isTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
