const express = require("express");
const router  = express.Router();
const { store } = require("../models/store");

// GET /api/stocks — list all stocks
router.get("/", (req, res) => {
  res.json(store.stocks);
});

// GET /api/stocks/:symbol — get stock details
router.get("/:symbol", (req, res) => {
  const stock = store.stocks.find(s => s.symbol === req.params.symbol);
  if (!stock) return res.status(404).json({ error: "Stock not found" });
  res.json(stock);
});

module.exports = router;
