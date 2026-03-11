import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getDemoUsers } from "../utils/api";

const ROLE_COLORS = {
  retail:        "from-green-400 to-emerald-600",
  institutional: "from-blue-400 to-indigo-600",
  regulator:     "from-red-400 to-rose-600"
};
const ROLE_DESC = {
  retail:        "Buy/sell stocks, view portfolio",
  institutional: "High-volume trader with large holdings",
  regulator:     "Monitor all trades and flag suspicious activity"
};

export default function LoginPage() {
  const { login, loginAs, loading } = useAuth();
  const [demoUsers, setDemoUsers]   = useState([]);
  const [email, setEmail]           = useState("");
  const [pass,  setPass]            = useState("");
  const [err,   setErr]             = useState("");

  useEffect(() => {
    getDemoUsers().then(r => setDemoUsers(r.data)).catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    try { await login(email, pass); }
    catch { setErr("Invalid email or password"); }
  };

  const handleDemo = async (u) => {
    await loginAs(u);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500 rounded-2xl mb-4">
            <span className="text-2xl font-display font-black text-black">S</span>
          </div>
          <h1 className="font-display font-bold text-3xl text-white">SettleChain</h1>
          <p className="text-gray-500 mt-1 text-sm">Real-Time Blockchain Settlement</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Ethereum Mainnet Simulation</span>
          </div>
        </div>

        {/* Demo Users */}
        <div className="card p-5 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Quick Demo Login</p>
          <div className="space-y-2">
            {demoUsers.map(u => (
              <button
                key={u.id}
                onClick={() => handleDemo(u)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all text-left"
              >
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${ROLE_COLORS[u.role] || "from-gray-400 to-gray-600"} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{ROLE_DESC[u.role]}</p>
                </div>
                <span className={`badge text-[10px] ${
                  u.role === "regulator" ? "badge-red" : u.role === "institutional" ? "badge-blue" : "badge-green"
                }`}>{u.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">or sign in manually</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Manual form */}
        <div className="card p-5">
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" placeholder="arjun@demo.com" value={email} onChange={e=>setEmail(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password</label>
              <input type="password" placeholder="demo123" value={pass} onChange={e=>setPass(e.target.value)} className="input-field" />
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-xs text-gray-600 text-center mt-3">All accounts use password: <code className="text-gray-400">demo123</code></p>
        </div>
      </div>
    </div>
  );
}
