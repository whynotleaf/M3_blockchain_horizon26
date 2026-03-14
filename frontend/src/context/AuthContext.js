import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useWallet } from "./WalletContext";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { account, isConnected } = useWallet();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // When wallet connects/disconnects, sync user
  useEffect(() => {
    if (!isConnected || !account) {
      setUser(null);
      return;
    }

    const syncUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res  = await fetch(`${API_URL}/api/auth/wallet/${account}`);
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (e) {
        console.error("Auth sync error:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    syncUser();
  }, [account, isConnected]);

  const refreshUser = useCallback(async () => {
    if (!account) return;
    try {
      const res  = await fetch(`${API_URL}/api/auth/wallet/${account}`);
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (e) {
      console.error("Refresh error:", e);
    }
  }, [account]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
