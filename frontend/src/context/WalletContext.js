import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

const WalletContext = createContext(null);

const TARGET_CHAIN_ID = Number(11155111);
const CHAIN_NAME = process.env.REACT_APP_CHAIN_NAME || "Ethereum Sepolia";
const RPC_URL = process.env.REACT_APP_RPC_URL || "https://ethereum-sepolia.publicnode.com";
const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";

export function WalletProvider({ children }) {

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState(null);

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Initialize provider once
  useEffect(() => {
    if (!window.ethereum) return;

    const prov = new ethers.BrowserProvider(window.ethereum, "any");
    setProvider(prov);

  }, []);

  const fetchBalance = useCallback(async (prov, addr) => {
    try {
      const bal = await prov.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch {
      setBalance(null);
    }
  }, []);

  const switchNetwork = async (prov) => {

    const chainHex = "0x" + TARGET_CHAIN_ID.toString(16);

    try {
      await prov.send("wallet_switchEthereumChain", [{ chainId: chainHex }]);
    } catch (switchError) {

      if (switchError.code === 4902) {

        await prov.send("wallet_addEthereumChain", [{
          chainId: chainHex,
          chainName: CHAIN_NAME,
          rpcUrls: [RPC_URL],
          nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18
          },
          ...(EXPLORER_URL ? { blockExplorerUrls: [EXPLORER_URL] } : {})
        }]);

      } else {
        throw switchError;
      }
    }
  };

  const connect = useCallback(async () => {

    if (!window.ethereum) {
      setError("MetaMask not installed");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {

      const prov = new ethers.BrowserProvider(window.ethereum, "any");

      await switchNetwork(prov);

      const accounts = await prov.send("eth_requestAccounts", []);
      const signer = await prov.getSigner();
      const network = await prov.getNetwork();

      setProvider(prov);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));

      await fetchBalance(prov, accounts[0]);

      localStorage.setItem("walletConnected", "true");

    } catch (err) {

      if (err.code === 4001) {
        setError("User rejected wallet connection");
      } else {
        setError(err.message);
      }

    } finally {
      setIsConnecting(false);
    }

  }, [fetchBalance]);

  const disconnect = useCallback(() => {

    setSigner(null);
    setAccount(null);
    setChainId(null);
    setBalance(null);
    setError(null);

    localStorage.removeItem("walletConnected");

  }, []);

  // Auto reconnect
  useEffect(() => {

    const reconnect = async () => {

      if (!provider) return;

      try {

        const accounts = await window.ethereum.request({
          method: "eth_accounts"
        });

        if (accounts.length === 0) return;

        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        setSigner(signer);
        setAccount(accounts[0]);
        setChainId(Number(network.chainId));

        await fetchBalance(provider, accounts[0]);

      } catch {}

    };

    reconnect();

  }, [provider, fetchBalance]);

  // Listen to metamask events
  useEffect(() => {

    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {

      if (accounts.length === 0) {
        disconnect();
        return;
      }

      setAccount(accounts[0]);

      if (provider) {
        await fetchBalance(provider, accounts[0]);
      }

    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };

  }, [provider, fetchBalance, disconnect]);

  const shortAddress = account
    ? `${account.slice(0,6)}...${account.slice(-4)}`
    : "";

  return (
    <WalletContext.Provider value={{
      provider,
      signer,
      account,
      chainId,
      balance,
      error,
      isConnecting,
      isConnected: !!account,
      connect,
      disconnect,
      shortAddress,
      explorerUrl: EXPLORER_URL,
      chainName: CHAIN_NAME
    }}>
      {children}
    </WalletContext.Provider>
  );

}

export const useWallet = () => useContext(WalletContext);