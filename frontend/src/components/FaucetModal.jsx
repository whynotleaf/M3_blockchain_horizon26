import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { fmtINR } from "../utils/format";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || "";

const PRESETS = [5000, 10000, 25000, 50000];

export default function FaucetModal({ isOpen, onClose }) {
  const { account } = useWallet();
  const [step, setStep]       = useState(1);
  const [method, setMethod]   = useState("UPI");
  const [amount, setAmount]   = useState(10000);
  const [error, setError]     = useState("");
  const [txHash, setTxHash]   = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMethod("UPI");
      setAmount(10000);
      setError("");
      setTxHash("");
      setProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePaymentConfirm = async () => {
    setStep(3);
    setProcessing(true);
    setError("");

    const steps = [
      "Verifying payment...",
      "Payment confirmed ✓",
      "Minting INR tokens on-chain...",
      "Awaiting block confirmation..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setStatusText(steps[i]);
      if (i < steps.length - 1) await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await fetch(`${API_URL}/api/faucet/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account, amount, method })
      });
      const data = await res.json();

      if (data.success) {
        setTxHash(data.txHash);
        setStep(4);
      } else {
        setError(data.error || "Deposit failed");
        setStep(1);
      }
    } catch (err) {
      setError(err.message || "Network error");
      setStep(1);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-0 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="font-display font-bold text-white text-lg">
            {step === 4 ? "✅ Funds Added" : "Add Funds"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="p-5">
          {error && (
            <p className="text-sm text-red-400 mb-3 p-2 bg-red-500/10 rounded-lg">{error}</p>
          )}

          {/* Step 1: Choose method + amount */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Method selection */}
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {["UPI", "RTGS"].map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                        method === m
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {m === "UPI" ? "₹ UPI (Instant)" : "🏦 RTGS (Bank)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Amount (₹)</p>
                <input
                  type="number"
                  min={1000}
                  max={50000}
                  value={amount}
                  onChange={e => setAmount(Math.max(1000, Math.min(50000, parseInt(e.target.value) || 1000)))}
                  className="input-field text-lg font-bold mb-2"
                />
                <div className="flex gap-2">
                  {PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setAmount(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        amount === p ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      ₹{(p).toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1.5">Min ₹1,000 · Max ₹50,000 (testnet cap)</p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="btn-primary w-full py-3 font-semibold"
              >
                Continue — {fmtINR(amount)}
              </button>
            </div>
          )}

          {/* Step 2: Payment details */}
          {step === 2 && (
            <div className="space-y-4">
              {method === "UPI" ? (
                <>
                  {/* Fake UPI QR */}
                  <div className="bg-white rounded-xl p-4 text-center">
                    <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                      <svg viewBox="0 0 100 100" className="w-28 h-28">
                        {/* Simple QR-like pattern */}
                        {Array.from({ length: 10 }, (_, r) =>
                          Array.from({ length: 10 }, (_, c) => (
                            Math.random() > 0.4 && (
                              <rect key={`${r}-${c}`} x={c*10} y={r*10} width="9" height="9" fill="#1a1a2e" rx="1"/>
                            )
                          ))
                        )}
                        <rect x="0" y="0" width="30" height="30" fill="#1a1a2e" rx="3"/>
                        <rect x="3" y="3" width="24" height="24" fill="white" rx="2"/>
                        <rect x="8" y="8" width="14" height="14" fill="#1a1a2e" rx="1"/>
                        <rect x="70" y="0" width="30" height="30" fill="#1a1a2e" rx="3"/>
                        <rect x="73" y="3" width="24" height="24" fill="white" rx="2"/>
                        <rect x="78" y="8" width="14" height="14" fill="#1a1a2e" rx="1"/>
                        <rect x="0" y="70" width="30" height="30" fill="#1a1a2e" rx="3"/>
                        <rect x="3" y="73" width="24" height="24" fill="white" rx="2"/>
                        <rect x="8" y="78" width="14" height="14" fill="#1a1a2e" rx="1"/>
                      </svg>
                    </div>
                    <p className="text-gray-900 font-bold text-sm">Pay to: settlechain@axisbank</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{fmtINR(amount)}</p>
                  </div>
                  <p className="text-xs text-gray-500 text-center animate-pulse">Scan QR or use UPI ID above</p>
                  <button
                    onClick={handlePaymentConfirm}
                    className="btn-primary w-full py-3 font-semibold"
                  >
                    I've completed the payment
                  </button>
                </>
              ) : (
                <>
                  {/* RTGS bank details */}
                  <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                    {[
                      ["Account Name", "SettleChain Escrow Reserve"],
                      ["Account No", "001234567890"],
                      ["IFSC", "SETL0001234"],
                      ["Bank", "SettleChain Reserve Bank"],
                      ["Amount", fmtINR(amount)],
                      ["Reference", `RTGS${Date.now().toString().slice(-8)}`]
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-white font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handlePaymentConfirm}
                    className="btn-primary w-full py-3 font-semibold"
                  >
                    Confirm Transfer
                  </button>
                </>
              )}
              <button onClick={() => setStep(1)} className="text-xs text-gray-600 hover:text-gray-400 w-full text-center">
                ← Back
              </button>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">{statusText}</p>
              <p className="text-xs text-gray-600">This may take a few seconds...</p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">✅</div>
              <p className="text-white font-bold text-xl">{fmtINR(amount)} added to your wallet</p>
              {txHash && (
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                  {EXPLORER_URL ? (
                    <a
                      href={`${EXPLORER_URL}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 text-xs font-mono break-all hover:text-green-300"
                    >
                      {txHash}
                    </a>
                  ) : (
                    <p className="text-green-400 text-xs font-mono break-all">{txHash}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 btn-ghost py-2">Close</button>
                <button onClick={onClose} className="flex-1 btn-primary py-2">Trade Now</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
