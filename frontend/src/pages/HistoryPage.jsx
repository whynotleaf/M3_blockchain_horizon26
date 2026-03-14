import React, { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { getTrades } from "../utils/api";
import { fmtINR, fmtTime, statusColor, timeSince, shortHash } from "../utils/format";

const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";

export default function HistoryPage({ onNavigate }) {
  const { account } = useWallet();
  const [trades,  setTrades]  = useState([]);
  const [filter,  setFilter]  = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) return;
    const load = async () => {
      try {
        const { data } = await getTrades(account);
        setTrades(data);
      } catch(e){} finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [account]);

  const filtered = trades.filter(t => filter === "ALL" || t.status === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Transaction History</h1>
        <div className="flex gap-2">
          {["ALL","SETTLED","SETTLING","FAILED"].map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filter===f ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-600 mb-3">No trades yet.</p>
          <button onClick={()=>onNavigate("trade")} className="btn-primary">Place your first trade →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            return (
              <div key={t.id} className="card p-4 hover:border-gray-700 transition-all">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Side */}
                  <span className={`badge text-xs font-bold ${t.side === "BUY" ? "badge-green" : t.side === "SELL" ? "badge-red" : "badge-green"}`}>
                    {t.side || "BUY"}
                  </span>

                  {/* Stock + amount */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-white">{t.symbol}</p>
                      <span className="text-gray-500 text-sm">{t.quantity} shares @ {fmtINR(t.price)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.txHash ? (
                        EXPLORER_URL ? (
                          <a href={`${EXPLORER_URL}/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer"
                             className="tx-hash text-green-400 hover:text-green-300 text-xs">
                            {shortHash(t.txHash)} ↗
                          </a>
                        ) : (
                          <span className="tx-hash text-gray-600">{shortHash(t.txHash)}</span>
                        )
                      ) : (
                        <span className="text-xs text-gray-700">{t.id.substring(0, 18)}...</span>
                      )}
                      {t.blockNumber && (
                        <>
                          <span className="text-xs text-gray-700">·</span>
                          <span className="text-xs text-gray-600">Block #{t.blockNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="font-bold text-white">{fmtINR(t.totalAmount)}</p>
                    <p className="text-xs text-gray-600">{timeSince(t.createdAt)}</p>
                  </div>

                  {/* Settlement time */}
                  {t.settlementTimeMs && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-green-400 font-medium">⚡ {fmtTime(t.settlementTimeMs)}</p>
                      <p className="text-xs text-gray-700">on-chain</p>
                    </div>
                  )}

                  {/* Status */}
                  <span className={`badge ${statusColor(t.status)}`}>{t.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
