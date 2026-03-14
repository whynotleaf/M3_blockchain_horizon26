import React, { useEffect, useState } from "react";
import { getAllSettlements, getAnalytics } from "../utils/api";
import { fmtINR, fmtTime, timeSince, shortHash } from "../utils/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";

const STATUS_COLOR = {
  SETTLED: "text-green-400 bg-green-500/10",
  FAILED: "text-red-400 bg-red-500/10",
  SETTLING: "text-blue-400 bg-blue-500/10 animate-pulse",
  default: "text-gray-400 bg-gray-500/10"
};

export default function SettlementPage() {
  const [settlements, setSettlements] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, a] = await Promise.all([getAllSettlements(), getAnalytics()]);
        setSettlements(s.data);
        setAnalytics(a.data);
      } catch (e) { }
    };
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  // Chart data: settlement times
  const chartData = settlements
    .filter(s => s.status === "SETTLED" && s.durationMs)
    .slice(0, 15)
    .reverse()
    .map((s, i) => ({
      name: `#${i + 1}`,
      seconds: Math.round(s.durationMs / 100) / 10,
      traditional: 86400
    }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="font-display font-bold text-2xl text-white">Settlement Monitor</h1>

      {/* Stats row */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Avg Settlement", value: `${analytics.blockchainSecs}s`, color: "text-green-400", sub: "blockchain" },
            { label: "Traditional", value: "86,400s", color: "text-red-400", sub: "T+1 (24h)" },
            { label: "Capital Freed", value: fmtINR(analytics.capitalUnlocked), color: "text-blue-400", sub: "unlocked" },
            { label: "Settled Trades", value: analytics.settledTrades, color: "text-white", sub: `of ${analytics.totalTrades}` },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="stat-label">{s.label}</p>
              <p className={`stat-value mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Settlement time chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-1">Settlement Time (seconds)</h2>
          <p className="text-xs text-gray-600 mb-4">Each bar = one settlement. Traditional T+1 ≈ 86,400s (not shown to scale)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v}s`, "Settlement Time"]}
              />
              <Bar dataKey="seconds" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* T+1 comparison */}
      <div className="card p-5 border-green-500/20 bg-gradient-to-r from-green-500/5 to-blue-500/5">
        <h2 className="font-display font-semibold text-white mb-3">Settlement Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="font-bold text-red-300 mb-2">❌ Traditional T+1 Settlement</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Settlement takes 1 business day</li>
              <li>• Capital locked during settlement window</li>
              <li>• Counterparty risk until settlement</li>
              <li>• Manual reconciliation processes</li>
              <li>• Clearing house as intermediary</li>
              <li>• Failed trades require manual resolution</li>
            </ul>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="font-bold text-green-300 mb-2">✅ SettleChain Blockchain DvP</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Settlement in under 10 seconds</li>
              <li>• Capital immediately available</li>
              <li>• Zero counterparty risk (atomic swap)</li>
              <li>• Fully automated on-chain</li>
              <li>• No intermediaries needed</li>
              <li>• Atomic: all-or-nothing (no partial fail)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Live settlements list */}
      <div className="card">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="font-display font-semibold text-white">Live Settlement Feed</h2>
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>
        <div className="divide-y divide-gray-800">
          {settlements.length === 0 ? (
            <p className="text-gray-600 text-sm text-center p-8">No settlements yet. Place a trade!</p>
          ) : settlements.map(s => (
            <div key={s.id} className="p-4 flex items-center gap-4 flex-wrap text-sm">
              <span className={`badge text-xs font-medium px-2.5 py-1 rounded-lg ${STATUS_COLOR[s.status] || STATUS_COLOR.default}`}>
                {s.status}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 truncate tx-hash">{s.id}</p>
                {s.txHash && (
                  <p className="text-xs text-gray-700">
                    {EXPLORER_URL ? (
                      <a href={`${EXPLORER_URL}/tx/${s.txHash}`} target="_blank" rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300">{shortHash(s.txHash)} ↗</a>
                    ) : shortHash(s.txHash)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{s.durationMs ? fmtTime(s.durationMs) : "..."}</p>
                <p className="text-xs text-gray-600">{timeSince(s.startTime)}</p>
              </div>
              {s.blockNumber && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">Block</p>
                  <p className="text-xs text-gray-400 font-mono">#{s.blockNumber?.toLocaleString()}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
