import React from "react";
import { useWallet } from "../context/WalletContext";

export default function LoginPage() {
  const { connect, isConnecting, error } = useWallet();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-5 shadow-lg shadow-green-500/20">
            <span className="text-3xl font-display font-black text-black">S</span>
          </div>
          <h1 className="font-display font-bold text-4xl text-white mb-2">SettleChain</h1>
          <p className="text-gray-400 text-lg font-medium">
            Real-Time Atomic Settlement for Indian Stock Markets.
          </p>
          <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
            SEBI's T+0 pilot took a year to record 139 trades. We settle in 8 seconds.
          </p>
        </div>

        {/* Settlement Race Mini */}
        <div className="card p-4 mb-6 border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">T+1</p>
              <p className="text-xs text-gray-600">Traditional</p>
              <p className="text-xs text-gray-700">24 hours</p>
            </div>
            <div className="text-gray-700 font-bold text-xl">→</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">T+0</p>
              <p className="text-xs text-gray-600">SEBI Pilot</p>
              <p className="text-xs text-gray-700">139 trades/yr</p>
            </div>
            <div className="text-gray-700 font-bold text-xl">→</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">~8s</p>
              <p className="text-xs text-gray-600">SettleChain</p>
              <p className="text-xs text-green-600">LIVE</p>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <div className="card p-6 mb-4">
          <button
            onClick={connect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
          >
            {isConnecting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <MetaMaskIcon />
                Connect MetaMask
              </>
            )}
          </button>

          {error && (
            <p className="text-sm text-red-400 mt-3 p-2 bg-red-500/10 rounded-lg">{error}</p>
          )}

          <p className="text-xs text-gray-600 mt-3">
            No registration needed. Your wallet address is your account.
          </p>
        </div>

        {/* No MetaMask? */}
        <p className="text-xs text-gray-700">
          Don't have MetaMask?{" "}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 underline"
          >
            Install it here →
          </a>
        </p>

        {/* Footer stats */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "Daily Capital Locked", value: "₹6L Cr", sub: "in T+1 clearing" },
            { label: "SEBI T+0 Adoption", value: "139", sub: "trades in 12 months" },
            { label: "SettleChain", value: "~8 sec", sub: "atomic settlement" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-gray-600">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 256 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M250.066 0L148.231 75.9988L167.175 31.1672L250.066 0Z" fill="#E2761B"/>
      <path d="M5.934 0L107.017 76.7106L89.825 31.1672L5.934 0Z" fill="#E4761B"/>
      <path d="M214.46 174.502L186.832 216.627L244.032 232.348L260.317 175.358L214.46 174.502Z" fill="#E4761B"/>
      <path d="M-4.317 175.358L11.968 232.348L69.169 216.627L41.54 174.502L-4.317 175.358Z" fill="#E4761B"/>
      <path d="M66.217 104.592L50.531 128.047L107.017 130.639L105.079 68.9629L66.217 104.592Z" fill="#E4761B"/>
      <path d="M189.783 104.592L150.35 68.251L148.231 130.639L205.469 128.047L189.783 104.592Z" fill="#E4761B"/>
      <path d="M69.169 216.627L103.431 199.962L73.481 175.713L69.169 216.627Z" fill="#E4761B"/>
      <path d="M152.569 199.962L186.832 216.627L182.519 175.713L152.569 199.962Z" fill="#E4761B"/>
    </svg>
  );
}
