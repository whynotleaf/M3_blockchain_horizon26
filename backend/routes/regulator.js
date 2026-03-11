const express = require("express");
const router  = express.Router();
const { store } = require("../models/store");

// GET /api/regulator/dashboard
router.get("/dashboard", (req, res) => {
  const trades      = store.trades;
  const settlements = store.settlements;

  const flagged  = trades.filter(t => t.flagged);
  const settled  = settlements.filter(s => s.status === "SETTLED");
  const failed   = settlements.filter(s => s.status === "FAILED");

  const totalVolume = trades
    .filter(t => t.status === "SETTLED")
    .reduce((a, t) => a + t.totalAmount, 0);

  res.json({
    summary: {
      totalTrades:   trades.length,
      settledTrades: settled.length,
      failedTrades:  failed.length,
      flaggedTrades: flagged.length,
      totalVolume:   Math.round(totalVolume * 100) / 100,
    },
    recentTrades: [...trades].reverse().slice(0, 20).map(t => ({
      ...t,
      buyer:  store.users.find(u => u.id === t.buyerId)?.name,
      seller: store.users.find(u => u.id === t.sellerId)?.name,
    })),
    recentSettlements: [...settlements].reverse().slice(0, 10),
    flaggedTrades: flagged
  });
});

// POST /api/regulator/flag/:tradeId
router.post("/flag/:tradeId", (req, res) => {
  const { reason } = req.body;
  const trade = store.trades.find(t => t.id === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  trade.flagged   = true;
  trade.flagReason = reason || "Flagged by regulator";

  const settlement = store.settlements.find(s => s.tradeId === trade.id);
  if (settlement) settlement.flagged = true;

  res.json({ success: true, trade });
});

// POST /api/regulator/unflag/:tradeId
router.post("/unflag/:tradeId", (req, res) => {
  const trade = store.trades.find(t => t.id === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: "Trade not found" });
  trade.flagged   = false;
  trade.flagReason = null;
  res.json({ success: true, trade });
});

module.exports = router;
