import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getStocks, placeOrder, getPortfolio, getTrade } from "../utils/api";
import { fmtINR, fmtNum } from "../utils/format";
import StockCard from "../components/StockCard";
import MiniChart from "../components/MiniChart";
import SettlementTracker from "../components/SettlementTracker";
import WalletButton from "../components/WalletButton";
import { useWallet } from "../context/WalletContext";

export default function TradePage() {
  const { user, refreshUser } = useAuth();
  const wallet = useWallet();
  const [stocks,      setStocks]      = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [side,        setSide]        = useState("BUY");
  const [qty,         setQty]         = useState(1);
  const [payMethod,   setPayMethod]   = useState("UPI");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [activeTrade, setActiveTrade] = useState(null);
  const [settlId,     setSettlId]     = useState(null);
  const [portfolio,   setPortfolio]   = useState(null);
  const [recentTrades,setRecentTrades]= useState([]);

  const loadStocks = useCallback(async () => {
    try {
      const { data } = await getStocks();
      setStocks(data);
      if (!selected && data.length) setSelected(data[0]);
      else if (selected) setSelected(data.find(s => s.symbol === selected.symbol) || data[0]);
    } catch(e){}
  }, [selected]);

  useEffect(() => {
    loadStocks();
    getPortfolio(user.id).then(r => setPortfolio(r.data)).catch(()=>{});
    const t = setInterval(loadStocks, 500);
    return () => clearInterval(t);
  }, [user.id, loadStocks]);

  const totalCost = selected ? Math.round(selected.price * qty * 100) / 100 : 0;
  const ownedQty  = portfolio?.holdings?.find(h => h.symbol === selected?.symbol)?.qty || 0;
  const cash      = portfolio?.inrBalance || 0;

  const handleOrder = async () => {
    if (!selected || qty <= 0) return;
    setError(""); setLoading(true);
    try {
      const { data } = await placeOrder({
        userId: user.id,
        symbol: selected.symbol,
        side, quantity: qty,
        paymentMethod: payMethod
      });
      if (data.success) {
        setActiveTrade(data.trade);
        setSettlId(data.trade.settlementId || null);
        setRecentTrades(p => [data.trade, ...p].slice(0, 10));
        // Poll for settlementId
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const { data: td } = await getTrade(data.trade.id);
            if (td.settlementId) { setSettlId(td.settlementId); clearInterval(poll); }
          } catch(err) {}
          if (attempts > 20) clearInterval(poll);
        }, 500);
      } else {
        setError(data.message || "Order not matched");
      }
    } catch (e) {
      setError(e.response?.data?.error || "Order failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSettled = () => {
    refreshUser();
    getPortfolio(user.id).then(r => setPortfolio(r.data)).catch(()=>{});
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Trade</h1>
        <div className="w-48">
          <WalletButton compact />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Stock list */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Select Stock</p>
          {stocks.map(s => (
            <StockCard
              key={s.symbol} stock={s}
              onClick={setSelected}
              selected={selected?.symbol === s.symbol}
            />
          ))}
        </div>

        {/* Chart + Order form */}
        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <>
              {/* Stock detail */}
              <div className="card p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-display font-bold text-2xl text-white">{selected.symbol}</h2>
                    <p className="text-sm text-gray-500">{selected.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{fmtINR(selected.price)}</p>
                    <p className={`text-sm font-medium ${selected.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {selected.changePercent >= 0 ? "▲" : "▼"} {Math.abs(selected.changePercent).toFixed(2)}%
                    </p>
                  </div>
                </div>
                <MiniChart data={selected.history} color={selected.changePercent >= 0 ? "#22c55e" : "#f87171"} height={120} />
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div><p className="text-gray-500 text-xs">Volume</p><p className="text-white font-medium">{fmtNum(selected.volume)}</p></div>
                  <div><p className="text-gray-500 text-xs">52W High</p><p className="text-green-400 font-medium">{fmtINR(selected.high52w)}</p></div>
                  <div><p className="text-gray-500 text-xs">52W Low</p><p className="text-red-400 font-medium">{fmtINR(selected.low52w)}</p></div>
                </div>
              </div>

              {/* Order form */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-white mb-4">Place Order</h3>

                {/* Buy/Sell tabs */}
                <div className="flex gap-2 mb-4 p-1 bg-gray-800 rounded-lg">
                  <button onClick={() => setSide("BUY")}  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${side==="BUY"  ? "bg-green-500 text-black" : "text-gray-400"}`}>Buy</button>
                  <button onClick={() => setSide("SELL")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${side==="SELL" ? "bg-red-500 text-white"  : "text-gray-400"}`}>Sell</button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                    <div className="flex gap-2">
                      <button onClick={() => setQty(q => Math.max(1, q-1))} className="btn-ghost px-3">-</button>
                      <input
                        type="number" min={1} max={side==="SELL" ? ownedQty : 9999}
                        value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value)||1))}
                        className="input-field text-center flex-1"
                      />
                      <button onClick={() => setQty(q => q+1)} className="btn-ghost px-3">+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
                    <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="input-field">
                      <option value="UPI">UPI (Instant)</option>
                      <option value="RTGS">RTGS (Bank Transfer)</option>
                    </select>
                  </div>
                </div>

                {/* Order summary */}
                <div className="bg-gray-800 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="text-white">{fmtINR(selected.price)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Qty</span><span className="text-white">{qty}</span></div>
                  <div className="flex justify-between border-t border-gray-700 pt-1.5 font-semibold">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white">{fmtINR(totalCost)}</span>
                  </div>
                  {side === "BUY" && <div className="flex justify-between text-xs"><span className="text-gray-600">Available</span><span className={cash >= totalCost ? "text-green-400" : "text-red-400"}>{fmtINR(cash)}</span></div>}
                  {side === "SELL" && <div className="flex justify-between text-xs"><span className="text-gray-600">You own</span><span className={ownedQty >= qty ? "text-green-400" : "text-red-400"}>{ownedQty} shares</span></div>}
                </div>

                {error && <p className="text-xs text-red-400 mb-3 p-2 bg-red-500/10 rounded-lg">{error}</p>}

                <button
                  onClick={handleOrder}
                  disabled={loading || !selected || (side==="BUY" && cash < totalCost) || (side==="SELL" && ownedQty < qty)}
                  className={`w-full font-semibold py-3 rounded-lg transition-all ${side==="BUY" ? "btn-primary" : "btn-danger"} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {loading ? "⚡ Placing Order..." : `${side} ${qty} ${selected.symbol} — ${fmtINR(totalCost)}`}
                </button>
                <p className="text-xs text-gray-600 text-center mt-2">Settlement via atomic DvP blockchain transaction</p>
              </div>
            </>
          )}

          {/* Settlement tracker */}
          {settlId && activeTrade && (
            <SettlementTracker
              settlementId={settlId}
              trade={activeTrade}
              onDone={handleSettled}
            />
          )}
          {activeTrade && !settlId && (
            <div className="card p-4 border-blue-500/20">
              <p className="text-sm text-blue-400 animate-pulse">⚡ Order placed — initiating settlement...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
