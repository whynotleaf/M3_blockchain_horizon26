// ─────────────────────────────────────────────
// Trades Route — Wallet-Address Based
// On-chain settlement via deployer as market maker
// ─────────────────────────────────────────────
const express = require("express");
const router  = express.Router();
const { v4: uuidv4 } = require("uuid");
const { readDB, addTrade, updateTrade } = require("../models/db");
const { executeSettlement } = require("../services/settlement");

// In-memory stock prices (same simulation as before)
const stocks = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2850, change: 12.5,  changePercent: 0.45 },
  { symbol: "TCS",      name: "Tata Consultancy",    price: 3950, change: -45.2, changePercent: -1.12 },
  { symbol: "HDFCBANK", name: "HDFC Bank",           price: 1680, change: 8.9,   changePercent: 0.53 },
  { symbol: "INFY",     name: "Infosys",             price: 1480, change: -2.3,  changePercent: -0.15 },
  { symbol: "ICICIBANK",name: "ICICI Bank",          price: 1180, change: 15.4,  changePercent: 1.32 }
];

// Stock price simulation — identical to original store.js
setInterval(() => {
  stocks.forEach(stock => {
    const changeFactor = 1 + (Math.random() * 0.01 - 0.005);
    const oldPrice = stock.price;
    let newPrice = Number((stock.price * changeFactor).toFixed(2));
    if (newPrice < 1) newPrice = 1;
    stock.price = newPrice;
    stock.change = Number((stock.price - oldPrice).toFixed(2));
    stock.changePercent = Number(((stock.change / oldPrice) * 100).toFixed(2));
  });
}, 500);

// Make stocks accessible to other routes
router.stocks = stocks;

// POST /api/trades/order — place a buy or sell order
router.post("/order", async (req, res) => {
  try {
    const { userAddress, symbol, side, quantity } = req.body;

    if (!userAddress) return res.status(400).json({ error: "userAddress required" });

    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return res.status(404).json({ error: "Stock not found" });
    if (!quantity || quantity <= 0) return res.status(400).json({ error: "Invalid quantity" });

    const price       = stock.price;
    const totalAmount = Math.round(price * quantity * 100) / 100;

    // Create trade record
    const trade = {
      id:              uuidv4(),
      userAddress:     userAddress.toLowerCase(),
      symbol,
      side,
      quantity,
      price,
      totalAmount,
      status:          "PENDING",
      createdAt:       new Date().toISOString(),
      settledAt:       null,
      txHash:          null,
      initTxHash:      null,
      settleTxHash:    null,
      settlementId:    null,
      settlementTimeMs: null,
      blockNumber:     null
    };

    addTrade(trade);

    // Start on-chain settlement asynchronously
    setImmediate(() => {
      executeSettlement(trade).catch(err => {
        console.error("Settlement failed:", err);
        updateTrade(trade.id, { status: "FAILED" });
      });
    });

    // Brief wait to let settlementId get assigned
    await new Promise(r => setTimeout(r, 300));
    const db = readDB();
    const freshTrade = db.trades.find(t => t.id === trade.id);

    res.json({
      success: true,
      trade: freshTrade || trade,
      message: "Order placed — on-chain settlement initiated"
    });

  } catch (err) {
    console.error("Trade error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades — all trades (optionally filtered by userAddress)
router.get("/", (req, res) => {
  const { userAddress, limit = 50 } = req.query;
  const db = readDB();
  let trades = [...db.trades].reverse().slice(0, Number(limit));
  if (userAddress) {
    const addr = userAddress.toLowerCase();
    trades = trades.filter(t => t.userAddress === addr);
  }
  res.json(trades);
});

// GET /api/trades/settlements/all — all settlements
router.get("/settlements/all", (req, res) => {
  const db = readDB();
  res.json([...db.settlements].reverse());
});

// GET /api/trades/settlement/:id — single settlement
router.get("/settlement/:id", (req, res) => {
  const db = readDB();
  const settlement = db.settlements.find(s => s.id === req.params.id);
  if (!settlement) return res.status(404).json({ error: "Settlement not found" });
  res.json(settlement);
});

// GET /api/trades/:id — single trade
router.get("/:id", (req, res) => {
  const db = readDB();
  const trade = db.trades.find(t => t.id === req.params.id);
  if (!trade) return res.status(404).json({ error: "Trade not found" });
  res.json(trade);
});

module.exports = router;
