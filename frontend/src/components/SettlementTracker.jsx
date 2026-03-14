import React, { useEffect, useState } from "react";
import { getSettlement } from "../utils/api";
import { fmtINR, fmtTime, shortHash } from "../utils/format";

const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";

const STEP_LABELS = {
  WALLET_APPROVAL:   { label: "Wallet Approval",     icon: "🔑" },
  INITIATING:        { label: "Initiating",           icon: "○" },
  VERIFYING_PAYMENT: { label: "Verifying Payment",    icon: "₹" },
  PAYMENT_VERIFIED:  { label: "Payment Verified",     icon: "✓" },
  VERIFYING_SHARES:  { label: "Setting Approvals",    icon: "⛓" },
  SHARES_VERIFIED:   { label: "Approvals Confirmed",  icon: "✓" },
  BLOCKCHAIN_INIT:   { label: "Broadcasting Tx",      icon: "📡" },
  ATOMIC_SWAP:       { label: "Atomic DvP Swap",      icon: "⚡" },
  CONFIRMING:        { label: "Block Confirmation",   icon: "🔒" },
  SETTLED:           { label: "Settled",              icon: "✅" },
  FAILED:            { label: "Failed",               icon: "✗" }
};

const STEPS_ORDER = [
  "VERIFYING_PAYMENT","PAYMENT_VERIFIED","VERIFYING_SHARES","SHARES_VERIFIED",
  "BLOCKCHAIN_INIT","ATOMIC_SWAP","CONFIRMING","SETTLED"
];

function TxHashLink({ hash, label }) {
  if (!hash) return null;
  const short = shortHash(hash);
  if (EXPLORER_URL) {
    return (
      <a href={`${EXPLORER_URL}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
         className="text-green-400 hover:text-green-300 text-xs font-mono" title={hash}>
        {label || short} ↗
      </a>
    );
  }
  return <span className="text-green-400 text-xs font-mono" title={hash}>{label || short}</span>;
}

export default function SettlementTracker({ settlementId, trade, onDone }) {
  const [settlement, setSettlement] = useState(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [startTs]                   = useState(Date.now());

  // Poll settlement status
  useEffect(() => {
    if (!settlementId) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await getSettlement(settlementId);
        setSettlement(data);
        if (data.status === "SETTLED" || data.status === "FAILED") {
          clearInterval(poll);
          onDone?.(data);
        }
      } catch (e) { /* ignore */ }
    }, 600);
    return () => clearInterval(poll);
  }, [settlementId, onDone]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startTs), 100);
    return () => clearInterval(t);
  }, [startTs]);

  const currentStep = settlement?.status || "INITIATING";
  const isDone      = currentStep === "SETTLED" || currentStep === "FAILED";
  const isSettled   = currentStep === "SETTLED";
  const isFailed    = currentStep === "FAILED";

  const currentIdx  = STEPS_ORDER.indexOf(currentStep);

  return (
    <div className={`card p-5 ${isSettled ? "border-green-500/30 glow-green" : isFailed ? "border-red-500/30 glow-red" : "border-blue-500/20"}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-display font-bold text-white text-lg">
            {isSettled ? "✅ Settlement Complete" : isFailed ? "✗ Settlement Failed" : "⚡ Settling On-Chain..."}
          </p>
          {trade && (
            <p className="text-xs text-gray-500 mt-0.5">
              {trade.quantity} × {trade.symbol} @ {fmtINR(trade.price)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={`text-xl font-mono font-bold ${isSettled ? "text-green-400" : isFailed ? "text-red-400" : "text-blue-400"}`}>
            {isDone ? fmtTime(settlement?.durationMs) : fmtTime(elapsed)}
          </p>
          <p className="text-xs text-gray-600">{isDone ? "total time" : "elapsed"}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isSettled ? "bg-green-500" : isFailed ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: isDone ? "100%" : `${Math.min(((currentIdx + 1) / STEPS_ORDER.length) * 100, 95)}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {settlement?.steps?.map((step, i) => {
          const meta = STEP_LABELS[step.step] || { label: step.step, icon: "·" };
          const done = step.status === "DONE";
          const err  = step.status === "ERROR";
          return (
            <div key={i} className={`flex items-start gap-3 text-sm ${done ? "text-gray-300" : err ? "text-red-400" : "text-blue-300 animate-pulse-green"}`}>
              <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5 ${done ? "bg-green-500/20 text-green-400" : err ? "bg-red-500/20" : "bg-blue-500/20"}`}>
                {done ? "✓" : err ? "✗" : "·"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{meta.label}</p>
                <p className="text-xs text-gray-600 truncate">{step.detail}</p>
              </div>
              <span className="text-xs text-gray-700 flex-shrink-0">
                {new Date(step.ts).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Transaction hashes */}
      {(settlement?.initTxHash || settlement?.settleTxHash || settlement?.txHash) && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
          {settlement?.initTxHash && (
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Initiate Tx</p>
              <TxHashLink hash={settlement.initTxHash} />
            </div>
          )}
          {settlement?.settleTxHash && (
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Settlement Tx (Atomic Swap)</p>
              <TxHashLink hash={settlement.settleTxHash} />
            </div>
          )}
          {settlement?.blockNumber && (
            <p className="text-xs text-gray-600">Block #{settlement.blockNumber?.toLocaleString()}</p>
          )}
        </div>
      )}

      {/* Comparison badge */}
      {isSettled && settlement?.durationMs && (
        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-300 font-medium">
            ⚡ Settled in {fmtTime(settlement.durationMs)} vs Traditional T+1 (24 hours)
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {Math.round(86400 / (settlement.durationMs / 1000)).toLocaleString()}× faster than traditional settlement
          </p>
          {settlement.txHash && EXPLORER_URL && (
            <p className="text-xs mt-1">
              <a href={`${EXPLORER_URL}/tx/${settlement.txHash}`} target="_blank" rel="noopener noreferrer"
                 className="text-green-400 hover:text-green-300 underline">
                Verify on block explorer ↗
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
