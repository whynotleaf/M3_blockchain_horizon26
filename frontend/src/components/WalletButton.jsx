import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";

const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";

export default function WalletButton({ compact = false }) {
  const {
    account, isConnected, isConnecting,
    connect, disconnect,
    chainName, shortAddress, balance, error,
  } = useWallet();

  const [showMenu, setShowMenu] = useState(false);

  if (!isConnected) {
    return (
      <div className="w-full">
        <button
          onClick={connect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <MetaMaskIcon />
              Connect MetaMask
            </>
          )}
        </button>
        {error && (
          <p className="text-[10px] text-red-400 mt-1 px-1 text-center leading-tight">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <button
        onClick={() => setShowMenu(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all text-left"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-orange-300 truncate">{shortAddress}</p>
          {!compact && (
            <p className="text-[10px] text-gray-500 truncate">{chainName}</p>
          )}
        </div>
        <span className="text-gray-500 text-[10px]">▾</span>
      </button>

      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-700 bg-gray-900/60">
            <div className="flex items-center gap-2 mb-1">
              <MetaMaskIcon />
              <p className="text-xs font-semibold text-white">MetaMask</p>
              <span className="ml-auto text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full">{chainName}</span>
            </div>
            <p className="text-[10px] font-mono text-orange-300 break-all">{account}</p>
          </div>

          {/* Stats */}
          <div className="px-3 py-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Network</span>
              <span className="text-white font-medium">{chainName}</span>
            </div>
            {balance !== null && (
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Gas Balance</span>
                <span className="text-white font-medium">{parseFloat(balance).toFixed(4)} ETH</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-2 pb-2 space-y-1">
            <button
              onClick={() => { navigator.clipboard.writeText(account); setShowMenu(false); }}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-700 text-xs text-gray-300 transition-colors flex items-center gap-2"
            >
              <span>⧉</span> Copy Address
            </button>
            {EXPLORER_URL && (
              <button
                onClick={() => {
                  window.open(`${EXPLORER_URL}/address/${account}`, "_blank");
                  setShowMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-700 text-xs text-gray-300 transition-colors flex items-center gap-2"
              >
                <span>↗</span> View on Explorer
              </button>
            )}
            <button
              onClick={() => { disconnect(); setShowMenu(false); }}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-xs text-red-400 transition-colors flex items-center gap-2"
            >
              <span>⏏</span> Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 256 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M250.066 0L148.231 75.9988L167.175 31.1672L250.066 0Z" fill="#E2761B"/>
      <path d="M5.934 0L107.017 76.7106L89.825 31.1672L5.934 0Z" fill="#E4761B"/>
      <path d="M214.46 174.502L186.832 216.627L244.032 232.348L260.317 175.358L214.46 174.502Z" fill="#E4761B"/>
      <path d="M-4.317 175.358L11.968 232.348L69.169 216.627L41.54 174.502L-4.317 175.358Z" fill="#E4761B"/>
    </svg>
  );
}
