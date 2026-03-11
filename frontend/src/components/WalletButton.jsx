import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function WalletButton({ compact = false }) {
  const {
    account, isConnected, isConnecting,
    connect, disconnect,
    network, shortAddress, balance, error,
  } = useWallet();

  const [showMenu, setShowMenu] = useState(false);

  if (!isConnected) {
    return (
      <div className="w-full">
        <button
          onClick={connect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <PhantomIcon />
              Connect Phantom
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
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all text-left"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-purple-300 truncate">{shortAddress}</p>
          {!compact && (
            <p className="text-[10px] text-gray-500 truncate">Solana {network}</p>
          )}
        </div>
        <span className="text-gray-500 text-[10px]">▾</span>
      </button>

      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-700 bg-gray-900/60">
            <div className="flex items-center gap-2 mb-1">
              <PhantomIcon />
              <p className="text-xs font-semibold text-white">Phantom</p>
              <span className="ml-auto text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">Solana</span>
            </div>
            <p className="text-[10px] font-mono text-purple-300 break-all">{account}</p>
          </div>

          {/* Stats */}
          <div className="px-3 py-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Network</span>
              <span className="text-white font-medium capitalize">{network}</span>
            </div>
            {balance !== null && (
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Balance</span>
                <span className="text-white font-medium">{balance} SOL</span>
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
            <button
              onClick={() => {
                window.open(`https://solscan.io/account/${account}`, "_blank");
                setShowMenu(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-700 text-xs text-gray-300 transition-colors flex items-center gap-2"
            >
              <span>↗</span> View on Solscan
            </button>
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

// Phantom ghost logo (simplified SVG)
function PhantomIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="24" fill="#AB9FF2"/>
      <path
        d="M110.584 64.008C110.584 44.287 94.573 28.276 74.852 28.276H51.148C31.427 28.276 15.416 44.287 15.416 64.008C15.416 83.729 31.427 99.74 51.148 99.74H53.006C54.865 99.74 56.391 101.266 56.391 103.124V110.584C56.391 112.443 57.917 113.969 59.776 113.969C61.635 113.969 63.161 112.443 63.161 110.584V103.124C63.161 101.266 64.687 99.74 66.546 99.74H74.852C94.573 99.74 110.584 83.729 110.584 64.008Z"
        fill="white"
      />
      <ellipse cx="50" cy="62" rx="7" ry="9" fill="#AB9FF2"/>
      <ellipse cx="78" cy="62" rx="7" ry="9" fill="#AB9FF2"/>
    </svg>
  );
}
