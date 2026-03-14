// ─────────────────────────────────────────────
// Faucet Route — Mint INR Tokens On-Chain
// Simulates UPI/RTGS payment gateway
// ─────────────────────────────────────────────
const express = require("express");
const router  = express.Router();
const { ethers } = require("ethers");
const { getInrToken, initSigner } = require("../services/blockchain");

// POST /api/faucet/deposit
router.post("/deposit", async (req, res) => {
  try {
    const { address, amount, method } = req.body;

    // Validate
    if (!address || !/^0x[0-9a-fA-F]{40}$/i.test(address)) {
      return res.status(400).json({ error: "Invalid Ethereum address" });
    }
    if (!amount || amount < 1000 || amount > 50000) {
      return res.status(400).json({ error: "Amount must be between ₹1,000 and ₹50,000" });
    }
    if (!["UPI", "RTGS"].includes(method)) {
      return res.status(400).json({ error: "Method must be UPI or RTGS" });
    }

    // Ensure signer is initialized (for localhost Hardhat)
    await initSigner();

    // Simulate payment processing delay
    const delay = method === "UPI" ? 800 : 1200;
    await new Promise(r => setTimeout(r, delay));

    // Mint INR on-chain: amount * 100 because INRToken has decimals=2
    const inrToken = getInrToken();
    const rawAmount = BigInt(amount) * 100n;
    
    const tx = await inrToken.mint(address, rawAmount);
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: tx.hash,
      amountRupees: amount,
      method,
      blockNumber: Number(receipt.blockNumber)
    });

  } catch (err) {
    console.error("Faucet error:", err);
    res.status(500).json({ error: err.message || "Faucet deposit failed" });
  }
});

module.exports = router;
