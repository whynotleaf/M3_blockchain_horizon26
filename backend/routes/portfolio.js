// ─────────────────────────────────────────────  
// Portfolio Route — Wallet-Address Based
// ─────────────────────────────────────────────
const express = require("express");
const router  = express.Router();
const { readDB, getUser } = require("../models/db");

// Helper to get stocks from the trades router (in-memory simulation)
function getStocks() {
  try {
    return require("./trades").stocks || [];
  } catch { return []; }
}

// GET /api/portfolio/analytics/summary
// ⚠️ MUST be defined BEFORE the /:address wildcard route
router.get("/analytics/summary", (req, res) => {
  const db          = readDB();
  const settlements = db.settlements.filter(s => s.status === "SETTLED");
  const trades      = db.trades.filter(t => t.status === "SETTLED");

  const totalVolume = trades.reduce((a, t) => a + t.totalAmount, 0);
  const avgTime     = settlements.length > 0
    ? settlements.reduce((a, s) => a + (s.durationMs || 0), 0) / settlements.length / 1000
    : 0;

  const capitalUnlocked = totalVolume; // 100% of settled volume is freed instantly

  res.json({
    totalTrades:      db.trades.length,
    settledTrades:    trades.length,
    pendingTrades:    db.trades.filter(t => t.status === "PENDING" || t.status === "SETTLING").length,
    failedTrades:     db.trades.filter(t => t.status === "FAILED").length,
    totalVolume:      Math.round(totalVolume * 100) / 100,
    avgSettlementSec: Math.round(avgTime * 10) / 10,
    capitalUnlocked:  Math.round(capitalUnlocked * 100) / 100,
    traditionalDays:  1,
    blockchainSecs:   avgTime > 0 ? Math.round(avgTime) : 8
  });
});

// GET /api/portfolio/:address — portfolio for a specific wallet
router.get("/:address", (req, res) => {
  const address = req.params.address.toLowerCase();
  const user    = getUser(address);
  const stocks  = getStocks();

  if (!user) {
    return res.json({
      address,
      inrBalance: 0,
      holdings: [],
      totalValue: 0,
      totalChange: 0,
      netWorth: 0
    });
  }

  const portfolioDetails = Object.entries(user.portfolio || {})
    .filter(([, qty]) => qty > 0)
    .map(([symbol, qty]) => {
      const stock = stocks.find(s => s.symbol === symbol);
      if (!stock) return null;
      const value = stock.price * qty;
      return {
        symbol,
        name:    stock.name,
        qty,
        price:   stock.price,
        value:   Math.round(value * 100) / 100,
        change:  stock.change,
        changePercent: stock.changePercent
      };
    })
    .filter(Boolean);

  const totalValue  = portfolioDetails.reduce((a, s) => a + s.value, 0);
  const totalChange = portfolioDetails.reduce((a, s) => a + (s.change * s.qty), 0);
  const inrBalance  = user.inrBalance || 0;

  res.json({
    address,
    inrBalance,
    holdings:    portfolioDetails,
    totalValue:  Math.round(totalValue * 100) / 100,
    totalChange: Math.round(totalChange * 100) / 100,
    netWorth:    Math.round((totalValue + inrBalance) * 100) / 100
  });
});

module.exports = router;
