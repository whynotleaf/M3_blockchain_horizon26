import React, { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { ethers } from "ethers";
import { getPortfolio, getStocks } from "../utils/api";
import { fmtINR, fmtPct } from "../utils/format";
import MiniChart from "../components/MiniChart";
import FaucetModal from "../components/FaucetModal";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import deployment from "../utils/deployment.json";

const COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
const INR_ABI = ["function balanceOf(address) view returns (uint256)"];

export default function PortfolioPage() {
  const { account, provider } = useWallet();
  const [portfolio, setPortfolio] = useState(null);
  const [stocks,    setStocks]    = useState([]);
  const [inrBalance, setInrBalance] = useState(null);
  const [error,     setError]     = useState(null);
  const [faucetOpen, setFaucetOpen] = useState(false);

  // Fetch on-chain INR balance
  useEffect(() => {
    if (!provider || !account) return;
    const fetchINR = async () => {
      try {
        const inr = new ethers.Contract(deployment.contracts.INRToken, INR_ABI, provider);
        const bal = await inr.balanceOf(account);
        setInrBalance(Number(bal) / 100);
      } catch(e) {}
    };
    fetchINR();
    const t = setInterval(fetchINR, 3000);
    return () => clearInterval(t);
  }, [provider, account]);

  useEffect(() => {
    if (!account) return;
    const load = async () => {
      try {
        const [p, s] = await Promise.all([getPortfolio(account), getStocks()]);
        setPortfolio(p.data);
        setStocks(s.data);
        setError(null);
      } catch (e) {
        console.error("Portfolio load error:", e);
        setError(e.response?.data?.error || e.message || "Failed to load portfolio");
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [account]);

  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-400 text-lg font-semibold">⚠️ {error}</p>
      <p className="text-gray-500 text-sm mt-2">Retrying automatically...</p>
    </div>
  );

  if (!portfolio) return <div className="p-6 text-gray-500">Loading portfolio...</div>;

  const pieData = portfolio.holdings.map(h => ({ name: h.symbol, value: h.value }));
  const cashBalance = inrBalance != null ? inrBalance : portfolio.inrBalance;
  const totalEquity = portfolio.holdings.reduce((a, h) => a + h.value, 0);
  const netWorth    = totalEquity + cashBalance;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-white">Portfolio</h1>
        <button onClick={() => setFaucetOpen(true)} className="text-xs text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-500/10">
          + Add Funds
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Net Worth",    value: fmtINR(netWorth),     color: "text-white" },
          { label: "Equity",       value: fmtINR(totalEquity),  color: "text-blue-400" },
          { label: "INR Balance",  value: fmtINR(cashBalance),  color: "text-green-400", sub: "on-chain" },
          { label: "Total P&L",    value: fmtINR(portfolio.totalChange), color: portfolio.totalChange >= 0 ? "text-green-400" : "text-red-400" },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value mt-1 ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>}
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
            <span className="text-gray-500">On-Chain INR Balance</span>
            <span className="font-semibold text-green-400">{fmtINR(cashBalance)}</span>
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

      <FaucetModal isOpen={faucetOpen} onClose={() => setFaucetOpen(false)} />
    </div>
  );
}
