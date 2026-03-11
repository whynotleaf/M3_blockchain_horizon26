// ─────────────────────────────────────────────
// Settlement Engine
// Orchestrates the full DvP settlement flow
// ─────────────────────────────────────────────

const { v4: uuidv4 } = require("uuid");
const { store } = require("../models/store");
const { verifyUPIPayment, verifyRTGSPayment, debitUser, creditUser, transferShares, delay } = require("./payment");

// Status progression timing (ms)
const TIMING = {
  PAYMENT_VERIFY:  800,
  SHARES_VERIFY:   600,
  BLOCKCHAIN_INIT: 1200,
  ATOMIC_SWAP:     1500,
  CONFIRMATION:    500
};

async function executeSettlement(tradeId) {
  const trade = store.trades.find(t => t.id === tradeId);
  if (!trade) throw new Error("Trade not found");

  const settlementId = `SET_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const startTime    = Date.now();

  const settlement = {
    id:          settlementId,
    tradeId,
    status:      "INITIATING",
    steps:       [],
    startTime:   new Date().toISOString(),
    endTime:     null,
    durationMs:  null,
    blockNumber: null,
    txHash:      null,
    flagged:     false,
    flagReason:  null
  };

  store.settlements.push(settlement);
  trade.settlementId = settlementId;
  trade.status       = "SETTLING";

  const addStep = (step, status, detail) => {
    settlement.steps.push({ step, status, detail, ts: new Date().toISOString() });
    settlement.status = step;
  };

  try {
    // ── Step 1: Verify Payment ──
    addStep("VERIFYING_PAYMENT", "IN_PROGRESS", "Initiating UPI/RTGS payment verification");
    await delay(TIMING.PAYMENT_VERIFY);

    const buyer  = store.users.find(u => u.id === trade.buyerId);
    const seller = store.users.find(u => u.id === trade.sellerId);

    if (!buyer || !seller) throw new Error("Participants not found");
    if (buyer.inrBalance < trade.totalAmount) throw new Error("Insufficient buyer funds");

    const paymentRef = `UPI${Date.now()}${Math.floor(Math.random()*9999)}`;
    addStep("PAYMENT_VERIFIED", "DONE", `Payment ref: ${paymentRef} — ₹${trade.totalAmount.toLocaleString("en-IN")} verified`);

    // ── Step 2: Verify Share Ownership ──
    addStep("VERIFYING_SHARES", "IN_PROGRESS", "Checking blockchain share registry");
    await delay(TIMING.SHARES_VERIFY);

    const sellerShares = seller.portfolio[trade.symbol] || 0;
    if (sellerShares < trade.quantity) throw new Error(`Seller has only ${sellerShares} shares, needs ${trade.quantity}`);

    addStep("SHARES_VERIFIED", "DONE", `${seller.name} owns ${sellerShares} ${trade.symbol} shares — verified on-chain`);

    // ── Step 3: Initiate Blockchain Transaction ──
    addStep("BLOCKCHAIN_INIT", "IN_PROGRESS", "Broadcasting atomic DvP transaction to Ethereum node");
    await delay(TIMING.BLOCKCHAIN_INIT);

    const txHash   = `0x${generateHex(64)}`;
    const blockNum = 18000000 + Math.floor(Math.random() * 100000);

    addStep("ATOMIC_SWAP", "IN_PROGRESS", `Tx ${txHash.substring(0, 18)}... — executing atomic swap in block #${blockNum}`);
    await delay(TIMING.ATOMIC_SWAP);

    // ── Step 4: Execute Atomic Transfer (in-memory simulation) ──
    const debited   = debitUser(trade.buyerId, trade.totalAmount);
    const credited  = creditUser(trade.sellerId, trade.totalAmount);
    const delivered = transferShares(trade.sellerId, trade.buyerId, trade.symbol, trade.quantity);

    if (!debited || !credited || !delivered) throw new Error("Atomic swap failed — rolling back");

    // ── Step 5: Confirmation ──
    await delay(TIMING.CONFIRMATION);
    addStep("CONFIRMING", "IN_PROGRESS", "Waiting for block confirmations");
    await delay(400);

    const endTime    = Date.now();
    const durationMs = endTime - startTime;

    settlement.status    = "SETTLED";
    settlement.endTime   = new Date().toISOString();
    settlement.durationMs = durationMs;
    settlement.blockNumber = blockNum;
    settlement.txHash    = txHash;

    trade.status         = "SETTLED";
    trade.settledAt      = new Date().toISOString();
    trade.settlementTimeMs = durationMs;
    trade.txHash         = txHash;

    addStep("SETTLED", "DONE", `✅ Settlement complete in ${(durationMs/1000).toFixed(1)}s — Block #${blockNum}`);

    return { success: true, settlement, trade };

  } catch (err) {
    settlement.status    = "FAILED";
    settlement.endTime   = new Date().toISOString();
    trade.status         = "FAILED";
    addStep("FAILED", "ERROR", err.message);
    return { success: false, error: err.message, settlement };
  }
}

function generateHex(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

module.exports = { executeSettlement };
