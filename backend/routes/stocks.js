// ─────────────────────────────────────────────
// Stocks Route — serves in-memory simulated prices
// ─────────────────────────────────────────────
const express = require("express");
const router  = express.Router();

// Get stocks from the trades router (shared in-memory simulation)
function getStocks() {
  try {
    return require("./trades").stocks || [];
  } catch { return []; }
}

// GET /api/stocks — list all stocks
router.get("/", (req, res) => {
  res.json(getStocks());
});

// GET /api/stocks/:symbol — get stock details
router.get("/:symbol", (req, res) => {
  const stocks = getStocks();
  const stock = stocks.find(s => s.symbol === req.params.symbol);
  if (!stock) return res.status(404).json({ error: "Stock not found" });
  res.json(stock);
});

module.exports = router;
