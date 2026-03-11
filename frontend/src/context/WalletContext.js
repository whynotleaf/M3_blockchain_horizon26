import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const WalletContext = createContext(null);

const SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export function WalletProvider({ children }) {
  const [account,      setAccount]      = useState(null);  // base58 public key string
  const [balance,      setBalance]      = useState(null);  // SOL balance
  const [network,      setNetwork]      = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error,        setError]        = useState(null);

  const isPhantomInstalled = () =>
    typeof window !== "undefined" &&
    typeof window.solana !== "undefined" &&
    window.solana.isPhantom;

  // Fetch SOL balance via JSON-RPC
  const fetchBalance = useCallback(async (pubkey) => {
    if (!pubkey) return;
    try {
      const res = await fetch(SOLANA_MAINNET_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [pubkey, { commitment: "confirmed" }],
        }),
      });
      const json = await res.json();
      if (json.result?.value !== undefined) {
        const sol = (json.result.value / 1e9).toFixed(4);
        setBalance(sol);
      }
    } catch {
      setBalance(null);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    if (!isPhantomInstalled()) {
      setError("Phantom wallet not found. Install it at phantom.app");
      return;
    }
    setIsConnecting(true);
    try {
      const resp = await window.solana.connect();
      const pubkey = resp.publicKey.toString();
      setAccount(pubkey);
      setNetwork("mainnet-beta");
      await fetchBalance(pubkey);
    } catch (e) {
      if (e.code === 4001) {
        setError("Connection rejected. Please approve in Phantom.");
      } else {
        setError(e.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalance]);

  const disconnect = useCallback(async () => {
    try {
      if (isPhantomInstalled()) await window.solana.disconnect();
    } catch {}
    setAccount(null);
    setBalance(null);
    setNetwork(null);
    setError(null);
  }, []);

  // Auto-reconnect if Phantom already trusted
  useEffect(() => {
    if (!isPhantomInstalled()) return;
    window.solana.connect({ onlyIfTrusted: true })
      .then(async (resp) => {
        const pubkey = resp.publicKey.toString();
        setAccount(pubkey);
        setNetwork("mainnet-beta");
        await fetchBalance(pubkey);
      })
      .catch(() => {});
  }, [fetchBalance]);

  // Listen for Phantom wallet events
  useEffect(() => {
    if (!isPhantomInstalled()) return;

    const onConnect = async (publicKey) => {
      const pubkey = publicKey.toString();
      setAccount(pubkey);
      setNetwork("mainnet-beta");
      await fetchBalance(pubkey);
    };

    const onDisconnect = () => {
      setAccount(null);
      setBalance(null);
      setNetwork(null);
    };

    const onAccountChanged = async (publicKey) => {
      if (publicKey) {
        const pubkey = publicKey.toString();
        setAccount(pubkey);
        await fetchBalance(pubkey);
      } else {
        onDisconnect();
      }
    };

    window.solana.on("connect",        onConnect);
    window.solana.on("disconnect",     onDisconnect);
    window.solana.on("accountChanged", onAccountChanged);

    return () => {
      window.solana.off("connect",        onConnect);
      window.solana.off("disconnect",     onDisconnect);
      window.solana.off("accountChanged", onAccountChanged);
    };
  }, [fetchBalance]);

  const shortAddress = (addr) =>
    addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";

  return (
    <WalletContext.Provider value={{
      account,
      balance,
      network,
      isConnecting,
      error,
      isConnected: !!account,
      connect,
      disconnect,
      shortAddress: shortAddress(account),
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
