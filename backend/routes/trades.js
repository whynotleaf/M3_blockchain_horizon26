const express  = require("express");
const router   = express.Router();
const { v4: uuidv4 } = require("uuid");
const { store }      = require("../models/store");
const { executeSettlement } = require("../services/settlement");

// POST /api/trades/order — place a buy or sell order
router.post("/order", async (req, res) => {
  try {
    const { userId, symbol, side, quantity, paymentMethod = "UPI" } = req.body;

    const user  = store.users.find(u => u.id === userId);
    const stock = store.stocks.find(s => s.symbol === symbol);

    if (!user)  return res.status(404).json({ error: "User not found" });
    if (!stock) return res.status(404).json({ error: "Stock not found" });
    if (quantity <= 0) return res.status(400).json({ error: "Invalid quantity" });

    const price       = stock.price;
    const totalAmount = Math.round(price * quantity * 100) / 100;

    // Validate
    if (side === "BUY") {
      if (user.inrBalance < totalAmount) {
        return res.status(400).json({ error: `Insufficient balance. Need ₹${totalAmount.toLocaleString("en-IN")}, have ₹${user.inrBalance.toLocaleString("en-IN")}` });
      }
    }
    if (side === "SELL") {
      const owned = user.portfolio[symbol] || 0;
      if (owned < quantity) {
        return res.status(400).json({ error: `Insufficient shares. You own ${owned} ${symbol}` });
      }
    }

    // Create order
    const order = {
      id:            `ORD_${Date.now()}_${Math.random().toString(36).substr(2,5).toUpperCase()}`,
      userId,
      symbol,
      side,
      quantity,
      price,
      totalAmount,
      paymentMethod,
      status:        "PENDING",
      createdAt:     new Date().toISOString()
    };
    store.orders.push(order);

    // Auto-match (for demo: always match immediately with market)
    // In real system this would go to an order book
    let matchedSellerId = null;
    let matchedBuyerId  = null;

    if (side === "BUY") {
      // Find a user with the stock to sell (other than buyer)
      const sellers = store.users.filter(u => u.id !== userId && (u.portfolio[symbol] || 0) >= quantity);
      if (sellers.length === 0) {
        // No seller — auto-create a market maker
        // Give deployer/reserve shares
        const reserve = store.users.find(u => u.id === "user_2" || u.id === "user_3");
        if (reserve && (reserve.portfolio[symbol] || 0) < quantity) {
          reserve.portfolio[symbol] = (reserve.portfolio[symbol] || 0) + quantity * 2;
        }
        const seller2 = store.users.find(u => u.id !== userId && (u.portfolio[symbol] || 0) >= quantity);
        if (!seller2) {
          order.status = "NO_MATCH";
          return res.json({ success: false, order, message: "No matching seller found" });
        }
        matchedSellerId = seller2.id;
      } else {
        matchedSellerId = sellers[0].id;
      }
      matchedBuyerId = userId;
    } else {
      // SELL order — match with a buyer (simulate market)
      matchedSellerId = userId;
      // Find user with enough balance
      const buyers = store.users.filter(u => u.id !== userId && u.inrBalance >= totalAmount && u.role !== "regulator");
      if (buyers.length === 0) {
        order.status = "NO_MATCH";
        return res.json({ success: false, order, message: "No matching buyer found" });
      }
      matchedBuyerId = buyers[0].id;
    }

    // Create trade
    const trade = {
      id:          uuidv4(),
      orderId:     order.id,
      buyerId:     matchedBuyerId,
      sellerId:    matchedSellerId,
      symbol,
      quantity,
      price,
      totalAmount,
      paymentMethod,
      status:      "PENDING",
      createdAt:   new Date().toISOString(),
      settledAt:   null,
      txHash:      null,
      settlementId: null,
      settlementTimeMs: null
    };

    store.trades.push(trade);
    order.status  = "MATCHED";
    order.tradeId = trade.id;

    // Start settlement asynchronously (kick off immediately)
    setImmediate(() => executeSettlement(trade.id).catch(console.error));

    // Brief wait to let settlementId get assigned
    await new Promise(r => setTimeout(r, 200));
    const freshTrade = store.trades.find(t => t.id === trade.id);
    res.json({ success: true, order, trade: freshTrade || trade, message: "Order placed and settlement initiated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades — all trades
router.get("/", (req, res) => {
  const { userId, limit = 50 } = req.query;
  let trades = [...store.trades].reverse().slice(0, Number(limit));
  if (userId) trades = trades.filter(t => t.buyerId === userId || t.sellerId === userId);
  res.json(trades);
});

// GET /api/trades/:id
router.get("/:id", (req, res) => {
  const trade = store.trades.find(t => t.id === req.params.id);
  if (!trade) return res.status(404).json({ error: "Trade not found" });
  res.json(trade);
});

// GET /api/trades/settlement/:id
router.get("/settlement/:id", (req, res) => {
  const settlement = store.settlements.find(s => s.id === req.params.id);
  if (!settlement) return res.status(404).json({ error: "Settlement not found" });
  res.json(settlement);
});

// GET /api/trades/settlements/all
router.get("/settlements/all", (req, res) => {
  res.json([...store.settlements].reverse());
});

module.exports = router;
