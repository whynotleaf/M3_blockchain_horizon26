import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getStocks, getPortfolio, getAnalytics, getTrades } from "../utils/api";
import { fmtINR, fmtNum, fmtPct, fmtTime, statusColor } from "../utils/format";
import StockCard from "../components/StockCard";
import MiniChart from "../components/MiniChart";

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [stocks,    setStocks]    = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [trades,    setTrades]    = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, p, a, t] = await Promise.all([
          getStocks(), getPortfolio(user.id), getAnalytics(), getTrades(user.id)
        ]);
        setStocks(s.data);
        setPortfolio(p.data);
        setAnalytics(a.data);
        setTrades(t.data.slice(0, 5));
      } catch(e) { console.error(e); }
    };
    load();
    const interval = setInterval(load, 500);
    return () => clearInterval(interval);
  }, [user.id]);

  const stats = [
    { label: "Net Worth",        value: fmtINR(portfolio?.netWorth),    sub: "Cash + Holdings",         color: "text-white" },
    { label: "Avg Settlement",   value: fmtTime((analytics?.avgSettlementSec||8)*1000), sub: "vs T+1 (24h)",  color: "text-green-400" },
    { label: "Capital Unlocked", value: fmtINR(analytics?.capitalUnlocked), sub: "vs traditional",       color: "text-blue-400" },
    { label: "Total Trades",     value: fmtNum(analytics?.totalTrades),  sub: `${analytics?.settledTrades||0} settled`, color: "text-white" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white">
          Good {new Date().getHours() < 12 ? "Morning" : "Afternoon"}, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          &nbsp;·&nbsp;NSE/BSE Simulation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value mt-1 ${s.color}`}>{s.value || "—"}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Comparison Banner */}
      <div className="card p-4 border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-display font-bold text-white">⚡ Blockchain vs Traditional Settlement</p>
            <p className="text-sm text-gray-400 mt-0.5">Real-time atomic DvP eliminates counterparty risk</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">T+1</p>
              <p className="text-xs text-gray-500">Traditional</p>
            </div>
            <div className="text-gray-700 font-bold">→</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">~8s</p>
              <p className="text-xs text-gray-500">SettleChain</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stocks */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display font-bold text-lg text-white">Market Overview</h2>
          <button onClick={() => onNavigate("trade")} className="text-xs text-green-400 hover:text-green-300">
            Trade →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stocks.map(s => <StockCard key={s.symbol} stock={s} onClick={() => onNavigate("trade")} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Portfolio Holdings */}
        <div className="card p-4">
          <h3 className="font-display font-semibold text-white mb-3">My Holdings</h3>
          {portfolio?.holdings?.length ? (
            <div className="space-y-2">
              {portfolio.holdings.map(h => {
                const stock = stocks.find(s => s.symbol === h.symbol);
                return (
                  <div key={h.symbol} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-300">{h.symbol.substring(0,3)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{h.symbol}</p>
                      <p className="text-xs text-gray-500">{h.qty} shares</p>
                    </div>
                    {stock && (
                      <div className="w-16 h-8">
                        <MiniChart
                          data={stock.history?.slice(-10)}
                          color={h.changePercent >= 0 ? "#22c55e" : "#f87171"}
                          height={32}
                        />
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{fmtINR(h.value)}</p>
                      <p className={`text-xs ${h.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtPct(h.changePercent)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">No holdings yet. Start trading!</p>
          )}
          {portfolio && (
            <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-sm">
              <span className="text-gray-500">Available Cash</span>
              <span className="font-medium text-white">{fmtINR(portfolio.inrBalance)}</span>
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-semibold text-white">Recent Trades</h3>
            <button onClick={() => onNavigate("history")} className="text-xs text-green-400 hover:text-green-300">View all →</button>
          </div>
          {trades.length ? (
            <div className="space-y-2">
              {trades.map(t => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <span className={`badge text-xs ${t.buyerId === user.id ? "badge-green" : "badge-red"}`}>
                    {t.buyerId === user.id ? "BUY" : "SELL"}
                  </span>
                  <span className="font-medium text-white flex-1">{t.symbol}</span>
                  <span className="text-gray-500">{t.quantity} × {fmtINR(t.price)}</span>
                  <span className={`badge text-xs ${statusColor(t.status)}`}>{t.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">No trades yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
