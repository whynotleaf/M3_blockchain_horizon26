require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const authRouter       = require("./routes/auth");
const stocksRouter     = require("./routes/stocks");
const tradesRouter     = require("./routes/trades");
const portfolioRouter  = require("./routes/portfolio");
const regulatorRouter  = require("./routes/regulator");
const faucetRouter     = require("./routes/faucet");

// Initialize blockchain signer for localhost
const { initSigner } = require("./services/blockchain");
initSigner().then(() => console.log("  ✅ Blockchain signer initialized"))
            .catch(e => console.warn("  ⚠️  Blockchain signer init warning:", e.message));

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, _, next) => {
  console.log(`[${new Date().toISOString().substring(11,19)}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──
app.use("/api/auth",       authRouter);
app.use("/api/stocks",     stocksRouter);
app.use("/api/trades",     tradesRouter);
app.use("/api/portfolio",  portfolioRouter);
app.use("/api/regulator",  regulatorRouter);
app.use("/api/faucet",     faucetRouter);

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), version: "2.0.0" });
});

app.listen(PORT, () => {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║  🏦 SettleChain Backend v2.0              ║");
  console.log(`║  Running on http://localhost:${PORT}          ║`);
  console.log("║  Wallet-based auth · On-chain settlement  ║");
  console.log("╚═══════════════════════════════════════════╝\n");
});
