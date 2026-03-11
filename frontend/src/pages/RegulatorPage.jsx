import React, { useEffect, useState } from "react";
import { getRegDashboard, flagTrade, unflagTrade } from "../utils/api";
import { fmtINR, timeSince, shortHash, statusColor } from "../utils/format";

export default function RegulatorPage() {
  const [data,        setData]        = useState(null);
  const [flagReason,  setFlagReason]  = useState({});
  const [flagging,    setFlagging]    = useState(null);
  const [activeTab,   setActiveTab]   = useState("trades");

  const load = async () => {
    try {
      const { data: d } = await getRegDashboard();
      setData(d);
    } catch(e){}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 500);
    return () => clearInterval(t);
  }, []);

  const handleFlag = async (id) => {
    setFlagging(id);
    try {
      await flagTrade(id, flagReason[id] || "Suspicious activity");
      await load();
    } catch(e){} finally { setFlagging(null); }
  };

  const handleUnflag = async (id) => {
    try { await unflagTrade(id); await load(); } catch(e){}
  };

  if (!data) return <div className="p-6 text-gray-500">Loading regulator dashboard...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">🛡 Regulator Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">SEBI Market Surveillance — Real-time monitoring</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs text-red-400 font-medium">LIVE Monitoring</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Trades",  value: data.summary.totalTrades,   color: "text-white" },
          { label: "Settled",       value: data.summary.settledTrades, color: "text-green-400" },
          { label: "Failed",        value: data.summary.failedTrades,  color: "text-red-400" },
          { label: "Flagged",       value: data.summary.flaggedTrades, color: "text-yellow-400" },
          { label: "Total Volume",  value: fmtINR(data.summary.totalVolume), color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className={`text-xl font-display font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-900 border border-gray-800 rounded-xl w-fit">
        {[["trades","All Trades"],["flagged","⚑ Flagged"],["settlements","Settlements"]].map(([id,label]) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab===id ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            {label}
            {id==="flagged" && data.summary.flaggedTrades > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{data.summary.flaggedTrades}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "trades" && (
        <div className="card">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-display font-semibold text-white">Recent Trades</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  {["Time","Buyer","Seller","Symbol","Qty","Amount","Method","Status","Action"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.recentTrades.map(t => (
                  <tr key={t.id} className={`hover:bg-gray-800/50 transition-colors ${t.flagged ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-3 text-gray-500">{timeSince(t.createdAt)}</td>
                    <td className="px-4 py-3 text-white">{t.buyer || "—"}</td>
                    <td className="px-4 py-3 text-white">{t.seller || "—"}</td>
                    <td className="px-4 py-3"><span className="font-bold text-white">{t.symbol}</span></td>
                    <td className="px-4 py-3 text-gray-300">{t.quantity}</td>
                    <td className="px-4 py-3 text-white font-medium">{fmtINR(t.totalAmount)}</td>
                    <td className="px-4 py-3"><span className="badge badge-blue text-xs">{t.paymentMethod}</span></td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${statusColor(t.status)}`}>{t.status}</span></td>
                    <td className="px-4 py-3">
                      {t.flagged ? (
                        <button onClick={()=>handleUnflag(t.id)} className="text-xs text-green-400 hover:text-green-300 underline">Unflag</button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text" placeholder="Reason..."
                            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 w-24 text-gray-300 focus:outline-none"
                            value={flagReason[t.id]||""} onChange={e=>setFlagReason(p=>({...p,[t.id]:e.target.value}))}
                          />
                          <button onClick={()=>handleFlag(t.id)} disabled={flagging===t.id}
                            className="text-xs text-red-400 hover:text-red-300 underline whitespace-nowrap">
                            {flagging===t.id ? "..." : "⚑ Flag"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "flagged" && (
        <div className="space-y-3">
          {data.flaggedTrades.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-gray-600">No flagged trades</p></div>
          ) : data.flaggedTrades.map(t => (
            <div key={t.id} className="card p-4 border-red-500/30 bg-red-500/5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-red">FLAGGED</span>
                    <span className="font-bold text-white">{t.symbol}</span>
                    <span className="text-gray-500 text-sm">{t.quantity} shares · {fmtINR(t.totalAmount)}</span>
                  </div>
                  <p className="text-xs text-red-300">⚑ {t.flagReason}</p>
                  <p className="text-xs text-gray-600 mt-1">Trade ID: {t.id}</p>
                </div>
                <button onClick={()=>handleUnflag(t.id)} className="btn-ghost text-xs text-green-400">Clear Flag</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "settlements" && (
        <div className="card">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-display font-semibold text-white">Recent Settlements</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {data.recentSettlements.map(s => (
              <div key={s.id} className="p-4 flex items-center gap-4 text-sm flex-wrap">
                <span className={`badge ${s.status==="SETTLED"?"badge-green":s.status==="FAILED"?"badge-red":"badge-blue"}`}>{s.status}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 truncate text-xs font-mono">{s.id}</p>
                  {s.txHash && <p className="text-xs text-gray-700">{shortHash(s.txHash)}</p>}
                </div>
                <span className="text-white font-medium">{s.durationMs ? `${(s.durationMs/1000).toFixed(1)}s` : "—"}</span>
                <span className="text-gray-600 text-xs">{timeSince(s.startTime)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
