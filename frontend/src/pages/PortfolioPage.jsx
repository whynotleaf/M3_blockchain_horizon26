import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getPortfolio, getStocks } from "../utils/api";
import { fmtINR, fmtPct } from "../utils/format";
import MiniChart from "../components/MiniChart";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [stocks,    setStocks]    = useState([]);

  useEffect(() => {
    const load = async () => {
      const [p, s] = await Promise.all([getPortfolio(user.id), getStocks()]);
      setPortfolio(p.data);
      setStocks(s.data);
    };
    load();
    const t = setInterval(load, 500);
    return () => clearInterval(t);
  }, [user.id]);

  if (!portfolio) return <div className="p-6 text-gray-500">Loading portfolio...</div>;

  const pieData = portfolio.holdings.map(h => ({ name: h.symbol, value: h.value }));
  const totalEquity = portfolio.holdings.reduce((a, h) => a + h.value, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="font-display font-bold text-2xl text-white">Portfolio</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Net Worth",    value: fmtINR(portfolio.netWorth),   color: "text-white" },
          { label: "Equity",       value: fmtINR(totalEquity),          color: "text-blue-400" },
          { label: "Cash Balance", value: fmtINR(portfolio.inrBalance), color: "text-green-400" },
          { label: "Total P&L",    value: fmtINR(portfolio.totalChange),color: portfolio.totalChange >= 0 ? "text-green-400" : "text-red-400" },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Holdings table */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4">Holdings</h2>
          {portfolio.holdings.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-10">No holdings. Place your first trade!</p>
          ) : (
            <div className="space-y-3">
              {portfolio.holdings.map((h, i) => {
                const stock = stocks.find(s => s.symbol === h.symbol);
                return (
                  <div key={h.symbol} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                         style={{ background: COLORS[i % COLORS.length] + "33", border: `1px solid ${COLORS[i%COLORS.length]}44` }}>
                      {h.symbol.substring(0,3)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{h.symbol}</p>
                      <p className="text-xs text-gray-500">{h.qty} shares @ {fmtINR(h.price)}</p>
                    </div>
                    {stock && (
                      <div className="w-16 h-10">
                        <MiniChart data={stock.history?.slice(-10)} color={h.changePercent >= 0 ? "#22c55e" : "#f87171"} height={40} />
                      </div>
                    )}
                    <div className="text-right">
                      <p className="font-medium text-white text-sm">{fmtINR(h.value)}</p>
                      <p className={`text-xs ${h.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {fmtPct(h.changePercent)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between text-sm">
            <span className="text-gray-500">Available Cash (INR)</span>
            <span className="font-semibold text-green-400">{fmtINR(portfolio.inrBalance)}</span>
          </div>
        </div>

        {/* Allocation pie */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4">Allocation</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={90} innerRadius={50}
                     dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtINR(v)}
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#9ca3af", fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px]">
              <p className="text-gray-600 text-sm">No holdings to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
