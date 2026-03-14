// ─────────────────────────────────────────────
// Regulator Route — SEBI Monitor Dashboard
// Includes deterministic AML risk scoring
// ─────────────────────────────────────────────
const express = require("express");
const router  = express.Router();
const { readDB, updateTrade } = require("../models/db");

// ── AML Risk Scoring ──
// Deterministic rules-based scoring (no ML)
function calculateAMLScore(trade, allTrades) {
  let score = 0;
  const reasons = [];
  const userAddr = trade.userAddress;

  // 1. Trade size > 10× user's historical average → +30
  const userTrades = allTrades.filter(t => t.userAddress === userAddr && t.id !== trade.id && t.status === "SETTLED");
  if (userTrades.length > 0) {
    const avgAmount = userTrades.reduce((a, t) => a + t.totalAmount, 0) / userTrades.length;
    if (trade.totalAmount > avgAmount * 10) {
      score += 30;
      reasons.push("Unusual volume (>10× avg)");
    }
  }

  // 2. Three or more trades in under 60 seconds → +25
  const recentTrades = allTrades.filter(t =>
    t.userAddress === userAddr &&
    t.id !== trade.id &&
    Math.abs(new Date(t.createdAt) - new Date(trade.createdAt)) < 60000
  );
  if (recentTrades.length >= 2) { // 2 others + this one = 3
    score += 25;
    reasons.push("Rapid succession (layering)");
  }

  // 3. Exactly round number (₹10,00,000 / ₹5,00,000 / ₹1,00,000) → +15
  const roundNumbers = [1000000, 500000, 100000, 50000, 25000];
  if (roundNumbers.includes(Math.round(trade.totalAmount))) {
    score += 15;
    reasons.push("Round number (structuring)");
  }

  // 4. New wallet (first trade ever) + large amount (> ₹25,000) → +20
  if (userTrades.length === 0 && trade.totalAmount > 25000) {
    score += 20;
    reasons.push("New wallet + large amount");
  }

  // Risk level
  let level = "LOW";
  if (score > 60) level = "HIGH";
  else if (score > 30) level = "MEDIUM";

  return { score, level, reasons };
}

// GET /api/regulator/dashboard
router.get("/dashboard", (req, res) => {
  const db          = readDB();
  const trades      = db.trades;
  const settlements = db.settlements;

  const flagged  = trades.filter(t => t.flagged);
  const settled  = settlements.filter(s => s.status === "SETTLED");
  const failed   = settlements.filter(s => s.status === "FAILED");

  const totalVolume = trades
    .filter(t => t.status === "SETTLED")
    .reduce((a, t) => a + t.totalAmount, 0);

  // Add AML scores to trades
  const tradesWithAML = [...trades].reverse().slice(0, 30).map(t => ({
    ...t,
    aml: calculateAMLScore(t, trades)
  }));

  res.json({
    summary: {
      totalTrades:   trades.length,
      settledTrades: settled.length,
      failedTrades:  failed.length,
      flaggedTrades: flagged.length,
      totalVolume:   Math.round(totalVolume * 100) / 100,
      highRiskCount: tradesWithAML.filter(t => t.aml.level === "HIGH").length,
    },
    recentTrades:       tradesWithAML,
    recentSettlements:  [...settlements].reverse().slice(0, 10),
    flaggedTrades:      flagged
  });
});

// POST /api/regulator/flag/:tradeId
router.post("/flag/:tradeId", (req, res) => {
  const { reason } = req.body;
  const db = readDB();
  const trade = db.trades.find(t => t.id === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  updateTrade(req.params.tradeId, {
    flagged:    true,
    flagReason: reason || "Flagged by regulator"
  });

  // Also update settlement if exists
  if (trade.settlementId) {
    const { updateSettlement } = require("../models/db");
    updateSettlement(trade.settlementId, { flagged: true });
  }

  res.json({ success: true, trade: { ...trade, flagged: true, flagReason: reason } });
});

// POST /api/regulator/unflag/:tradeId
router.post("/unflag/:tradeId", (req, res) => {
  const db = readDB();
  const trade = db.trades.find(t => t.id === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: "Trade not found" });
  updateTrade(req.params.tradeId, { flagged: false, flagReason: null });
  res.json({ success: true, trade: { ...trade, flagged: false, flagReason: null } });
});

module.exports = router;
