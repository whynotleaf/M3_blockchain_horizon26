import React from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import WalletButton from "./WalletButton";

const NAV = [
  { id: "dashboard",  icon: "⊞", label: "Dashboard" },
  { id: "trade",      icon: "⚡", label: "Trade" },
  { id: "portfolio",  icon: "◎", label: "Portfolio" },
  { id: "history",    icon: "≡", label: "History" },
  { id: "settlement", icon: "⛓", label: "Settlement" },
];
const REG_NAV = [
  { id: "regulator",  icon: "🛡", label: "Monitor" },
];

export default function Sidebar({ active, onChange }) {
  const { user, logout } = useAuth();
  const { disconnect, shortAddress } = useWallet();
  const isReg = user?.role === "regulator";
  const links = isReg ? REG_NAV : NAV;

  const handleLogout = () => {
    logout();
    disconnect();
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-black font-bold font-display text-sm">S</div>
          <span className="font-display font-bold text-white text-lg">SettleChain</span>
        </div>
        <p className="text-xs text-gray-600 mt-1">Real-Time Settlement</p>
      </div>

      {/* User badge */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold">
            {shortAddress?.charAt(2)?.toUpperCase() || "?"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-mono text-white truncate">{shortAddress || "..."}</p>
            <span className={`badge text-[10px] ${
              user?.role === "regulator" ? "badge-red" : "badge-green"
            }`}>{user?.role || "retail"}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(l => (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            className={`nav-link w-full text-left ${active === l.id ? "active" : ""}`}
          >
            <span className="text-base w-5 text-center">{l.icon}</span>
            {l.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Blockchain Live</span>
          </div>
        </div>
        <WalletButton />
        <button onClick={handleLogout} className="nav-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <span>↩</span> Logout
        </button>
      </div>
    </aside>
  );
}
