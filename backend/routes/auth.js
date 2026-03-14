// ─────────────────────────────────────────────
// Auth Route — Wallet-Based
// No passwords. Wallet address = identity.
// ─────────────────────────────────────────────
const express = require("express");
const router  = express.Router();
const { getUser, upsertUser } = require("../models/db");
require("dotenv").config();

// GET /api/auth/wallet/:address — lookup or create user by wallet address
router.get("/wallet/:address", (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    
    // Validate Ethereum address format
    if (!/^0x[0-9a-fA-F]{40}$/i.test(req.params.address)) {
      return res.status(400).json({ error: "Invalid Ethereum address" });
    }

    // Check if this address is the regulator
    const sebiAddress = (process.env.SEBI_MONITOR_ADDRESS || "").toLowerCase();
    const isRegulator = address === sebiAddress;

    // Upsert: creates user if not exists, returns existing if found
    const user = upsertUser(address, {
      ...(isRegulator ? { role: "regulator" } : {})
    });

    res.json({ user });
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me/:address — get user by wallet address (backwards compat)
router.get("/me/:address", (req, res) => {
  const address = req.params.address.toLowerCase();
  const user = getUser(address);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

module.exports = router;
