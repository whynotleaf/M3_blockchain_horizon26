import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { ethers } from "ethers";
import { getStocks, placeOrder, getPortfolio, getTrade } from "../utils/api";
import { fmtINR, fmtNum } from "../utils/format";
import StockCard from "../components/StockCard";
import MiniChart from "../components/MiniChart";
import SettlementTracker from "../components/SettlementTracker";
import WalletButton from "../components/WalletButton";
import FaucetModal from "../components/FaucetModal";
import deployment from "../utils/deployment.json";

const INR_ABI   = ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"];
const STOCK_ABI = ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"];
const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";

export default function TradePage() {
  const { user, refreshUser } = useAuth();
  const { account, signer, provider } = useWallet();
  const [stocks,      setStocks]      = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [side,        setSide]        = useState("BUY");
  const [qty,         setQty]         = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [approving,   setApproving]   = useState(false);
  const [approveTxHash, setApproveTxHash] = useState(null);
  const [error,       setError]       = useState("");
  const [activeTrade, setActiveTrade] = useState(null);
  const [settlId,     setSettlId]     = useState(null);
  const [inrBalance,  setInrBalance]  = useState(0);
  const [stockBalances, setStockBalances] = useState({});
  const [faucetOpen,  setFaucetOpen]  = useState(false);



  const loadStocks = useCallback(async () => {
    try {
      const { data } = await getStocks();
      setStocks(data);
      if (!selected && data.length) setSelected(data[0]);
      else if (selected) setSelected(data.find(s => s.symbol === selected.symbol) || data[0]);
    } catch(e){}
  }, [selected]);

  useEffect(() => {
    const debug = async () => {
      if (!provider) return;
  
      const net = await provider.getNetwork();
  
      console.log("Wallet:", account);
      console.log("Chain ID:", Number(net.chainId));
    };
  
    debug();
  }, [provider, account]);

  // Fetch on-chain balances
  useEffect(() => {
    if (!provider || !account) return;
  
    const fetchBalances = async () => {
      try {
  
        // INR balance
        const inr = new ethers.Contract(
          deployment.contracts.INRToken,
          INR_ABI,
          provider
        );
  
        const bal = await inr.balanceOf(account);
  
        const formattedINR = Number(
          ethers.formatUnits(bal, 2)
        );
  
        setInrBalance(formattedINR);
  
        // Stock balances
        const balances = {};
  
        for (const [sym, info] of Object.entries(deployment.contracts.stocks)) {
  
          const stock = new ethers.Contract(
            info.address,
            STOCK_ABI,
            provider
          );
  
          const b = await stock.balanceOf(account);
  
          balances[sym] = Number(b.toString());
        }
  
        setStockBalances(balances);
  
      } catch(e) {
        console.error("Balance fetch error:", e);
      }
    };
  
    fetchBalances();
  
    const t = setInterval(fetchBalances, 5000);
  
    return () => clearInterval(t);
  
  }, [provider, account]);

  useEffect(() => {
    loadStocks();
    const t = setInterval(loadStocks, 3000);
    return () => clearInterval(t);
  }, [loadStocks]);

  const totalCost = selected ? Math.round(selected.price * qty * 100) / 100 : 0;
  const totalPaise = selected ? Math.round(selected.price * 100) * qty : 0;
  const ownedQty  = selected ? (stockBalances[selected.symbol] || 0) : 0;
  const cash      = inrBalance;

  const handleOrder = async () => {
    if (!selected || qty <= 0 || !account || !signer) return;
    setError(""); setLoading(true); setApproving(true); setApproveTxHash(null);

    try {
      // Step 1: MetaMask approval
      if (side === "BUY") {
        // Approve INR spend
        const inrContract = new ethers.Contract(deployment.contracts.INRToken, INR_ABI, signer);
        const approveTx = await inrContract.approve(
          deployment.contracts.DvPSettlement,
          BigInt(totalPaise)
        );
        setApproveTxHash(approveTx.hash);
        await approveTx.wait();
      } else {
        // Approve stock spend
        const stockAddr = deployment.contracts.stocks[selected.symbol]?.address;
        if (!stockAddr) throw new Error("Stock contract not found");
        const stockContract = new ethers.Contract(stockAddr, STOCK_ABI, signer);
        const approveTx = await stockContract.approve(
          deployment.contracts.DvPSettlement,
          BigInt(qty)
        );
        setApproveTxHash(approveTx.hash);
        await approveTx.wait();
      }

      setApproving(false);

      // Step 2: Place order on backend (triggers on-chain settlement)
      const { data } = await placeOrder({
        userAddress: account,
        symbol: selected.symbol,
        side,
        quantity: qty
      });

      if (data.success) {
        setActiveTrade(data.trade);
        setSettlId(data.trade.settlementId || null);

        // Poll for settlementId
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const { data: td } = await getTrade(data.trade.id);
            if (td.settlementId) { setSettlId(td.settlementId); clearInterval(poll); }
            if (td.status === "SETTLED" || td.status === "FAILED") clearInterval(poll);
          } catch(err) {}
          if (attempts > 30) clearInterval(poll);
        }, 500);
      } else {
        setError(data.message || "Order not matched");
      }
    } catch (e) {
      if (e.code === 4001 || e.code === "ACTION_REJECTED") {
        setError("Transaction rejected in MetaMask");
      } else {
        setError(e.response?.data?.error || e.message || "Order failed");
      }
    } finally {
      setLoading(false);
      setApproving(false);
    }
  };

  const handleSettled = () => {
    refreshUser?.();
    // Refresh balances
    setActiveTrade(null);
    setSettlId(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Trade</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setFaucetOpen(true)} className="text-xs text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-500/10">
            + Add Funds
          </button>
          <div className="w-48">
            <WalletButton compact />
          </div>
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
                </div>

                {/* Order summary */}
                <div className="bg-gray-800 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="text-white">{fmtINR(selected.price)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Qty</span><span className="text-white">{qty}</span></div>
                  <div className="flex justify-between border-t border-gray-700 pt-1.5 font-semibold">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white">{fmtINR(totalCost)}</span>
                  </div>
                  {side === "BUY" && <div className="flex justify-between text-xs"><span className="text-gray-600">INR Balance (on-chain)</span><span className={cash >= totalCost ? "text-green-400" : "text-red-400"}>{fmtINR(cash)}</span></div>}
                  {side === "SELL" && <div className="flex justify-between text-xs"><span className="text-gray-600">You own (on-chain)</span><span className={ownedQty >= qty ? "text-green-400" : "text-red-400"}>{ownedQty} shares</span></div>}
                </div>

                {error && <p className="text-xs text-red-400 mb-3 p-2 bg-red-500/10 rounded-lg">{error}</p>}

                {/* Approve + Order flow */}
                {approving && (
                  <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      <span className="text-sm text-blue-400">Waiting for MetaMask approval...</span>
                    </div>
                    {approveTxHash && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Approval tx: {approveTxHash.substring(0, 18)}...
                        {EXPLORER_URL && (
                          <a href={`${EXPLORER_URL}/tx/${approveTxHash}`} target="_blank" rel="noopener noreferrer" className="text-green-400 ml-1">↗</a>
                        )}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleOrder}
                  // disabled={loading || !selected || (side==="BUY" && cash < totalCost) || (side==="SELL" && ownedQty < qty)}
                  className={`w-full font-semibold py-3 rounded-lg transition-all ${side==="BUY" ? "btn-primary" : "btn-danger"} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {loading ? (approving ? "⏳ Approving in MetaMask..." : "⚡ Settling On-Chain...") : `${side} ${qty} ${selected.symbol} — ${fmtINR(totalCost)}`}
                </button>
                <p className="text-xs text-gray-600 text-center mt-2">
                  {side === "BUY" ? "You'll sign an INR approval in MetaMask first" : "You'll sign a share approval in MetaMask first"}
                </p>
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
              <p className="text-sm text-blue-400 animate-pulse">⚡ Order placed — initiating on-chain settlement...</p>
            </div>
          )}
        </div>
      </div>

      <FaucetModal isOpen={faucetOpen} onClose={() => setFaucetOpen(false)} />
    </div>
  );
}
