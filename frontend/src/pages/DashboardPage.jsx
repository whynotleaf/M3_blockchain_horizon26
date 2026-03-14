import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { ethers } from "ethers";
import { getStocks, getPortfolio, getAnalytics, getTrades } from "../utils/api";
import { fmtINR, fmtNum, fmtPct, fmtTime, statusColor } from "../utils/format";
import StockCard from "../components/StockCard";
import MiniChart from "../components/MiniChart";
import FaucetModal from "../components/FaucetModal";
import deployment from "../utils/deployment.json";

const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";
const INR_ABI = ["function balanceOf(address) view returns (uint256)"];

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const { account, provider, shortAddress, chainName, balance: gasBalance } = useWallet();
  const [stocks,    setStocks]    = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [trades,    setTrades]    = useState([]);
  const [inrBalance, setInrBalance] = useState(null);
  const [faucetOpen, setFaucetOpen] = useState(false);
  const [raceActive, setRaceActive] = useState(false);
  const [raceProgress, setRaceProgress] = useState(0);
  const raceRef = useRef(null);

  // Fetch INR balance from on-chain
  useEffect(() => {
    if (!provider || !account) return;
    const fetchINR = async () => {
      try {
        const inr = new ethers.Contract(deployment.contracts.INRToken, INR_ABI, provider);
        const bal = await inr.balanceOf(account);
        setInrBalance(Number(bal) / 100); // decimals=2
      } catch (e) {
        console.error("INR balance error:", e);
      }
    };
    fetchINR();
    const t = setInterval(fetchINR, 3000);
    return () => clearInterval(t);
  }, [provider, account]);

  // Fetch data from backend
  useEffect(() => {
    if (!account) return;
    const load = async () => {
      try {
        const [s, p, a, t] = await Promise.all([
          getStocks(), getPortfolio(account), getAnalytics(), getTrades(account)
        ]);
        setStocks(s.data);
        setPortfolio(p.data);
        setAnalytics(a.data);
        setTrades(t.data.slice(0, 5));
      } catch(e) { console.error(e); }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [account]);

  // Trigger settlement race animation when a new trade settles
  useEffect(() => {
    if (trades.length > 0 && trades[0]?.status === "SETTLED") {
      triggerRace();
    }
  }, [trades]);

  const triggerRace = () => {
    setRaceActive(true);
    setRaceProgress(0);
    let progress = 0;
    if (raceRef.current) clearInterval(raceRef.current);
    raceRef.current = setInterval(() => {
      progress += 12.5;
      setRaceProgress(progress);
      if (progress >= 100) {
        clearInterval(raceRef.current);
      }
    }, 1000);
  };

  const stats = [
    { label: "Net Worth", value: fmtINR(inrBalance != null ? inrBalance + (portfolio?.totalValue || 0) : portfolio?.netWorth), sub: "Cash + Holdings", color: "text-white" },
    { label: "Avg Settlement", value: fmtTime((analytics?.avgSettlementSec || 8) * 1000), sub: "vs T+1 (24h)", color: "text-green-400" },
    { label: "Capital Unlocked", value: fmtINR(analytics?.capitalUnlocked), sub: "freed instantly", color: "text-blue-400" },
    { label: "Total Trades", value: fmtNum(analytics?.totalTrades), sub: `${analytics?.settledTrades || 0} settled`, color: "text-white" },
  ];

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Identity Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={copyAddress} className="text-sm font-mono text-white hover:text-green-400 transition-colors" title="Click to copy">
              {shortAddress || account?.slice(0, 10) + "..."}
            </button>
            <span className="text-xs text-gray-600">⧉</span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">{chainName}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">INR: <span className="text-white font-semibold">{inrBalance != null ? fmtINR(inrBalance) : "..."}</span></span>
            <span className="text-gray-500">Gas: <span className="text-gray-300">{gasBalance ? `${parseFloat(gasBalance).toFixed(4)} ETH` : "..."}</span></span>
          </div>
        </div>
        <button
          onClick={() => setFaucetOpen(true)}
          className="btn-primary px-5 py-2.5 font-semibold"
        >
          + Add Funds
        </button>
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

      {/* Settlement Race Panel */}
      <div className="card p-5 border-green-500/20 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display font-bold text-white text-lg">⚡ Settlement Race</p>
            <p className="text-xs text-gray-500">Why SettleChain makes institutional settlement obsolete</p>
          </div>
          <button onClick={triggerRace} className="text-xs text-green-400 hover:text-green-300 border border-green-500/30 px-3 py-1 rounded-lg">
            ▶ Run Demo
          </button>
        </div>

        {/* Comparison Table */}
        <div className="grid grid-cols-3 gap-2 mb-5 text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-lg font-bold text-red-400">T+1 Legacy</p>
            <p className="text-xs text-gray-500 mt-1">Settles next morning</p>
            <p className="text-xs text-gray-600">Capital frozen 24h</p>
            <p className="text-xs text-gray-600">₹6L Cr locked daily</p>
            <p className="text-xs text-gray-600 mt-1">Margin: <span className="text-red-400 font-bold">HIGH</span></p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-lg font-bold text-yellow-400">SEBI T+0</p>
            <p className="text-xs text-gray-500 mt-1">Settles end-of-day</p>
            <p className="text-xs text-gray-600">Frozen 4-6 hours</p>
            <p className="text-xs text-gray-600">139 trades/year</p>
            <p className="text-xs text-gray-600 mt-1">Margin: <span className="text-yellow-400 font-bold">HIGH</span></p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <p className="text-lg font-bold text-green-400">SettleChain</p>
            <p className="text-xs text-gray-500 mt-1">~8 seconds</p>
            <p className="text-xs text-gray-600">Freed NOW</p>
            <p className="text-xs text-gray-600">Zero risk</p>
            <p className="text-xs text-gray-600 mt-1">Margin: <span className="text-green-400 font-bold">ZERO</span></p>
          </div>
        </div>

        {/* Animated Race Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Traditional T+1</span>
              <span className="text-xs text-red-400">{raceActive ? "Processing..." : "24+ hours"}</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-[8000ms] ease-linear"
                style={{ width: raceActive ? "3%" : "0%" }}
              />
            </div>
            {raceActive && (
              <div className="flex justify-between text-[10px] text-gray-700 mt-1">
                <span>Trade Placed</span>
                <span>Order Matching (4PM)</span>
                <span>Clearing (overnight)</span>
                <span>Settlement 9:15AM ↗</span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">SettleChain</span>
              <span className="text-xs text-green-400">
                {raceProgress >= 100 ? "✅ SETTLED" : raceActive ? `${Math.round(raceProgress)}%` : "~8 seconds"}
              </span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${raceProgress >= 100 ? "bg-green-500" : "bg-gradient-to-r from-green-500 to-emerald-400"}`}
                style={{ width: raceActive ? `${raceProgress}%` : "0%" }}
              />
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
          <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-sm">
            <span className="text-gray-500">On-Chain INR Balance</span>
            <span className="font-medium text-white">{inrBalance != null ? fmtINR(inrBalance) : "..."}</span>
          </div>
        </div>

        {/* My On-Chain Activity */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-semibold text-white">My On-Chain Activity</h3>
            <button onClick={() => onNavigate("history")} className="text-xs text-green-400 hover:text-green-300">View all →</button>
          </div>
          {trades.length ? (
            <div className="space-y-2">
              {trades.map(t => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <span className={`badge text-xs ${t.side === "BUY" ? "badge-green" : "badge-red"}`}>
                    {t.side || "BUY"}
                  </span>
                  <span className="font-medium text-white flex-1">{t.symbol}</span>
                  <span className="text-gray-500">{t.quantity} × {fmtINR(t.price)}</span>
                  {t.settlementTimeMs && (
                    <span className="text-xs text-green-400">⚡{fmtTime(t.settlementTimeMs)}</span>
                  )}
                  {t.txHash && EXPLORER_URL ? (
                    <a href={`${EXPLORER_URL}/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer"
                       className="text-green-400 hover:text-green-300 text-xs">↗</a>
                  ) : t.txHash ? (
                    <span className="text-xs text-gray-600" title={t.txHash}>⛓</span>
                  ) : null}
                  <span className={`badge text-xs ${statusColor(t.status)}`}>{t.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 mb-2">No trades yet.</p>
              <button onClick={() => onNavigate("trade")} className="text-sm text-green-400 hover:text-green-300">
                Buy your first stock →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Faucet Modal */}
      <FaucetModal isOpen={faucetOpen} onClose={() => setFaucetOpen(false)} />
    </div>
  );
}
