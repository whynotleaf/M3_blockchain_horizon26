const express = require("express");
const router  = express.Router();
const { store } = require("../models/store");

// GET /api/portfolio/:userId
router.get("/:userId", (req, res) => {
  const user = store.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: "Not found" });

  const portfolioDetails = Object.entries(user.portfolio)
    .filter(([, qty]) => qty > 0)
    .map(([symbol, qty]) => {
      const stock = store.stocks.find(s => s.symbol === symbol);
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

  res.json({
    userId:  user.id,
    name:    user.name,
    inrBalance: user.inrBalance,
    holdings: portfolioDetails,
    totalValue: Math.round(totalValue * 100) / 100,
    totalChange: Math.round(totalChange * 100) / 100,
    netWorth: Math.round((totalValue + user.inrBalance) * 100) / 100
  });
});

// GET /api/portfolio/analytics/summary
router.get("/analytics/summary", (req, res) => {
  const settlements = store.settlements.filter(s => s.status === "SETTLED");
  const trades      = store.trades.filter(t => t.status === "SETTLED");

  const totalVolume = trades.reduce((a, t) => a + t.totalAmount, 0);
  const avgTime     = settlements.length > 0
    ? settlements.reduce((a, s) => a + (s.durationMs || 0), 0) / settlements.length / 1000
    : 0;

  const capitalUnlocked = totalVolume * 0.2; // 20% traditionally locked in T+1

  res.json({
    totalTrades:      store.trades.length,
    settledTrades:    trades.length,
    pendingTrades:    store.trades.filter(t => t.status === "PENDING" || t.status === "SETTLING").length,
    failedTrades:     store.trades.filter(t => t.status === "FAILED").length,
    totalVolume:      Math.round(totalVolume * 100) / 100,
    avgSettlementSec: Math.round(avgTime * 10) / 10,
    capitalUnlocked:  Math.round(capitalUnlocked * 100) / 100,
    traditionalDays:  1,
    blockchainSecs:   avgTime > 0 ? Math.round(avgTime) : 8
  });
});

module.exports = router;
