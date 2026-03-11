import React, { createContext, useContext, useState, useCallback } from "react";
import * as api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.login(email, password);
      setUser(data.user);
      localStorage.setItem("userId", data.user.id);
      return data.user;
    } catch (e) {
      setError(e.response?.data?.error || "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAs = useCallback(async (demoUser) => {
    setUser(demoUser);
    localStorage.setItem("userId", demoUser.id);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("userId");
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const { data } = await api.getMe(user.id);
    setUser(data);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginAs, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
