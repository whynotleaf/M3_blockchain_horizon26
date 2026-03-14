# SettleChain — Complete Transformation Prompt v2
### Feed this entire document into Antigravity before writing a single line of code.

---

## PART 1 — WHO YOU ARE AND WHAT EXISTS

You are transforming **SettleChain**, a full-stack blockchain DvP (Delivery vs Payment) settlement system for Indian stock markets. Read this section completely before touching any file.

### What the project does

SettleChain demonstrates **atomic real-time settlement** — a single on-chain transaction that simultaneously transfers shares from seller to buyer AND payment from buyer to seller. If either leg fails, the entire transaction reverts. Zero counterparty risk. No partial settlements. This is the core innovation.

The problem it solves: Indian stock markets (NSE/BSE) run on T+1 settlement. Every day, over ₹6 lakh crore sits frozen in clearing corporations (NSCCL/ICCL) waiting for the next business day to complete. SEBI launched a T+0 pilot in 2024 — it recorded 139 total trades in a full year because it still settles end-of-day, not instantly. SettleChain settles in ~8 seconds. That is not T+0. That is T+seconds.

### Existing codebase — read this precisely

**3 Solidity contracts** (all in one file: `contracts/DvPSettlement.sol`):

1. **`StockToken`** — ERC20 representing one listed company's shares
   - `decimals()` returns `0` — one token = one whole share, no fractional shares (Indian markets don't allow them — this is regulatory accuracy, not laziness)
   - Constructor takes `name`, `symbol`, `initialSupply`, `priceInWei`
   - `mint(address, amount)` — onlyOwner, for adding new supply
   - `updatePrice(uint256)` — onlyOwner, for price updates
   - 5 instances deployed: RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK

2. **`INRToken`** — ERC20 stablecoin representing Indian Rupees
   - `decimals()` returns `2` — precision to the paisa (1 INR = 100 units)
   - `mint(address, amount)` — onlyOwner, used by the faucet
   - `burn(address, amount)` — onlyOwner, for supply regulation
   - This token IS the payment rail. It lives on-chain.

3. **`DvPSettlement`** — the atomic settlement engine
   - `initiateTrade(tradeId, buyer, seller, stockToken, quantity, pricePerShare, stockSymbol)` — creates a pending trade record on-chain, onlyOwner
   - `settleTrade(tradeId)` — the atomic swap: checks buyer INR balance ≥ totalAmount AND seller shares ≥ quantity, then executes `transferFrom` for both in the same transaction. If step 2 reverts, step 1 also reverts. Full atomicity. Uses `ReentrancyGuard`.
   - `flagTrade(tradeId, reason)` — onlyRegulator, marks trade as FLAGGED immutably on-chain
   - `addRegulator(address)` — onlyOwner
   - Emits: `TradeInitiated`, `TradeSettled`, `TradeFailed`, `TradeFlagged`

**Backend** — Node.js + Express
- `backend/models/store.js` — in-memory JS object with hardcoded users (email, password, privateKey all baked in). THIS IS THE PROBLEM. Needs full replacement.
- `backend/services/settlement.js` — currently fakes txHash with `0x${generateHex(64)}` and does balance updates in memory. No real contract calls. NEEDS A FULL REWRITE.
- `backend/services/payment.js` — simple helper for debiting/crediting in-memory store
- `backend/routes/auth.js` — email/password login. REMOVE ENTIRELY.
- `backend/routes/stocks.js` — serves stock list and prices
- `backend/routes/trades.js` — order placement + settlement trigger
- `backend/routes/portfolio.js` — user portfolio analytics
- `backend/routes/regulator.js` — regulator dashboard and flagging
- `backend/server.js` — Express entry point

**Frontend** — React + Tailwind
- `frontend/src/context/WalletContext.js` — currently wired to **Phantom/Solana**. Completely wrong chain. Needs full rewrite to `window.ethereum` / MetaMask.
- `frontend/src/context/AuthContext.js` — email/password session management. Remove.
- `frontend/src/pages/LoginPage.jsx` — email form + demo user cards. Replace with wallet connect only.
- `frontend/src/pages/DashboardPage.jsx` — user stats, portfolio overview, recent trades
- `frontend/src/pages/TradePage.jsx` — stock selection, buy/sell form, settlement tracker
- `frontend/src/pages/PortfolioPage.jsx` — holdings and P&L
- `frontend/src/pages/SettlementPage.jsx` — settlement monitor
- `frontend/src/pages/HistoryPage.jsx` — trade history
- `frontend/src/pages/RegulatorPage.jsx` — SEBI monitor view
- `frontend/src/components/SettlementTracker.jsx` — real-time step progress for a single trade
- `frontend/src/components/WalletButton.jsx` — wallet connect button
- `frontend/src/components/StockCard.jsx` — stock price card
- `frontend/src/components/MiniChart.jsx` — sparkline chart
- `frontend/src/components/Sidebar.jsx` — navigation

**Hardhat config** — currently localhost only (`chainId: 31337`). Needs EVM testnet support.

**Stock price simulation** — `setInterval` in `store.js` updates all stock prices every 500ms using `Math.random() * 0.01 - 0.005` (±0.5% per tick). Keep this exactly. It works and looks real.

---

## PART 2 — YOUR MISSION: 6 TRANSFORMATION GOALS

---

### GOAL 1 — Deploy to an EVM-Compatible Public Testnet

**Choice of testnet:** Use any low-gas EVM-compatible testnet. Good options: Sepolia, Polygon Amoy, Arbitrum Sepolia, Base Sepolia, Optimism Sepolia. All are EVM-compatible, have public faucets for gas, and have block explorers. The code must be chain-agnostic — use environment variables for RPC URL, chain ID, and explorer base URL so swapping chains requires only a `.env` change.

**`hardhat.config.js`** — make it multi-network via `.env`:
```js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    testnet: {
      url: process.env.RPC_URL || "",
      chainId: parseInt(process.env.CHAIN_ID || "11155111"),
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: "auto"
    }
  }
};
```

**`.env`** (create at project root, add to `.gitignore`):
```
DEPLOYER_PRIVATE_KEY=your_wallet_private_key_here

# Chain config — swap these to change networks
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CHAIN_ID=11155111
CHAIN_NAME=Sepolia Testnet
EXPLORER_URL=https://sepolia.etherscan.io

# Backend
PORT=4000
SEBI_MONITOR_ADDRESS=0xYourRegulatorWalletAddress

# Frontend (REACT_APP_ prefix required for CRA)
REACT_APP_CHAIN_ID=11155111
REACT_APP_CHAIN_NAME=Sepolia Testnet
REACT_APP_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
REACT_APP_EXPLORER_URL=https://sepolia.etherscan.io
REACT_APP_API_URL=http://localhost:4000
```

**`scripts/deploy.js`** rewrite — deployer wallet is the single actor. No more Hardhat test signers for users:
1. Deploy `INRToken`
2. Deploy 5 `StockToken` instances (RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK) — initial supply 10,000 each, all minted to deployer
3. Deploy `DvPSettlement` with INRToken address
4. Mint INR reserve to deployer: ₹50,00,000 = `5000000 * 100` raw units (deployer is the market maker + faucet source)
5. Add regulator address from `process.env.SEBI_MONITOR_ADDRESS`
6. Save to `database/deployment.json` AND `frontend/src/utils/deployment.json`
7. No hardcoded private keys in output — addresses only

`deployment.json` format:
```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "explorerUrl": "https://sepolia.etherscan.io",
  "deployedAt": "2025-...",
  "contracts": {
    "INRToken": "0x...",
    "DvPSettlement": "0x...",
    "stocks": {
      "RELIANCE": { "address": "0x...", "name": "Reliance Industries" },
      "TCS":      { "address": "0x...", "name": "Tata Consultancy" },
      "HDFCBANK": { "address": "0x...", "name": "HDFC Bank" },
      "INFY":     { "address": "0x...", "name": "Infosys" },
      "ICICIBANK":{ "address": "0x...", "name": "ICICI Bank" }
    }
  }
}
```

Deploy: `npx hardhat run scripts/deploy.js --network testnet`

---

### GOAL 2 — Replace Email/Password with `window.ethereum` Wallet Login

**Remove entirely:**
- Email/password login from `LoginPage.jsx`
- Demo user cards
- `AuthContext.js` session management based on email
- All `user.email`, `user.password`, `user.privateKey` from the store
- `/api/auth/login` POST endpoint

**The new identity model:** Wallet address = account. No registration. No password. Connect MetaMask → you exist in the system. First-time connect auto-creates your profile in `db.json`.

**Rewrite `frontend/src/context/WalletContext.js` completely** — use `window.ethereum` directly via ethers.js v6. Keep it simple:

```js
import { ethers } from "ethers";

const connect = async () => {
  if (!window.ethereum) {
    setError("MetaMask not found. Install it at metamask.io");
    return;
  }
  const provider = new ethers.BrowserProvider(window.ethereum);

  // Auto-add the testnet to MetaMask if not already there
  try {
    await provider.send("wallet_addEthereumChain", [{
      chainId: "0x" + parseInt(process.env.REACT_APP_CHAIN_ID).toString(16),
      chainName: process.env.REACT_APP_CHAIN_NAME,
      rpcUrls: [process.env.REACT_APP_RPC_URL],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: [process.env.REACT_APP_EXPLORER_URL]
    }]);
  } catch (e) { /* network already added */ }

  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  // set account, provider, signer in context state
};
```

Expose from context: `account`, `provider`, `signer`, `chainId`, `isConnected`, `connect()`, `disconnect()`, `shortAddress`.

On connect: verify `chainId` matches `REACT_APP_CHAIN_ID`. If wrong, call `wallet_switchEthereumChain` automatically.

Persist: save `account` to `localStorage` so page refresh auto-reconnects without re-prompting MetaMask.

**New `LoginPage.jsx`:**
Full screen, dark. SettleChain logo centered. Headline: *"Real-Time Atomic Settlement for Indian Stock Markets."* Subline: *"SEBI's T+0 pilot took a year to record 139 trades. We settle in 8 seconds."* Single button: **Connect MetaMask**. If MetaMask not installed, show link to metamask.io. No forms. No passwords. After connect → navigate to Dashboard.

**Backend auth — rewrite `routes/auth.js`:**
```
GET /api/auth/wallet/:address
```
- Looks up user in `db.json` by lowercase address
- If not found, creates: `{ address, role: "retail", joinedAt, portfolio: {}, txHistory: [] }`
- If address matches `process.env.SEBI_MONITOR_ADDRESS`, set `role: "regulator"`
- Returns user object

---

### GOAL 3 — INR Faucet via Dummy UPI/RTGS Gateway

**The concept:** User clicks "Add Funds", goes through a realistic but fake UPI or RTGS payment UI, and on confirmation the backend calls `INRToken.mint()` on the real deployed contract, crediting their wallet address on-chain.

**Hard limit: ₹50,000 per transaction** (testnet demo cap).

**Backend — new file `backend/routes/faucet.js`:**
```
POST /api/faucet/deposit
Body: { address, amount, method }   // method = "UPI" | "RTGS"

Flow:
1. Validate: 1000 ≤ amount ≤ 50000 (rupees)
2. Validate: address is a valid Ethereum address
3. Simulate processing delay: 800ms (UPI) or 1200ms (RTGS)
4. Call INRToken.mint(address, amount * 100) via deployer wallet
   — multiply by 100 because INRToken decimals=2
5. Wait for tx confirmation
6. Return { success: true, txHash, amountRupees: amount }
```

**Shared blockchain service — new file `backend/services/blockchain.js`:**
(Used by both faucet and settlement — single source of truth for contract instances)
```js
const { ethers } = require("ethers");
const deployment = require("../../database/deployment.json");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

// Load ABIs from Hardhat artifacts
const INR_ABI = require("../../artifacts/contracts/DvPSettlement.sol/INRToken.json").abi;
const DVP_ABI = require("../../artifacts/contracts/DvPSettlement.sol/DvPSettlement.json").abi;
const STOCK_ABI = require("../../artifacts/contracts/DvPSettlement.sol/StockToken.json").abi;

const inrToken = new ethers.Contract(deployment.contracts.INRToken, INR_ABI, deployerWallet);
const dvpSettlement = new ethers.Contract(deployment.contracts.DvPSettlement, DVP_ABI, deployerWallet);

function getStockContract(symbol) {
  const addr = deployment.contracts.stocks[symbol]?.address;
  if (!addr) throw new Error(`Unknown stock: ${symbol}`);
  return new ethers.Contract(addr, STOCK_ABI, deployerWallet);
}

module.exports = { provider, deployerWallet, inrToken, dvpSettlement, getStockContract, deployment };
```

**Frontend — new `frontend/src/components/FaucetModal.jsx`:**

Multi-step modal:

**Step 1 — Choose method + amount:**
- Two option cards: UPI and RTGS
- Amount input: min ₹1,000 / max ₹50,000, with preset buttons for ₹5,000 / ₹10,000 / ₹25,000 / ₹50,000
- Validation inline

**Step 2a — UPI:**
- Convincing SVG QR code (static is fine visually)
- "Pay to: settlechain@axisbank" in bold
- UPI ID shown, amount in large text
- 15-second countdown: "Waiting for confirmation..."
- Button: "I've completed the payment"

**Step 2b — RTGS:**
- Bank details card:
  - Account Name: SettleChain Escrow Reserve
  - Account No: 001234567890
  - IFSC: SETL0001234
  - Bank: SettleChain Reserve Bank
  - Amount: ₹XX,XXX
  - Reference: `RTGS${Date.now()}`
- Button: "Confirm Transfer"

**Step 3 — Processing (animated):**
Text cycling: "Verifying payment..." → "Payment confirmed ✓" → "Minting INR tokens on-chain..." → "Awaiting block confirmation..."
Real POST to `/api/faucet/deposit` happens here.

**Step 4 — Success:**
- Large ✅
- "₹XX,XXX added to your wallet"
- Transaction hash as clickable link to block explorer
- Updated INR balance
- Close / Trade Now buttons

Trigger: "Add Funds" button on Dashboard and Portfolio pages.

---

### GOAL 4 — Full On-Chain Settlement (no more fake txHashes)

**The current failure:** `settlement.js` generates `0x${generateHex(64)}` as fake hashes and updates balances in a JS object. The deployed contracts are not being called. Every single txHash in the UI is a lie.

**Settlement model:**
The deployer wallet acts as **market maker** — holds all stock tokens and a large INR reserve. This means:
- **BUY:** User approves INR spend → deployer calls `initiateTrade` + `settleTrade` (user's INR goes to deployer, user receives shares from deployer)
- **SELL:** User approves stock spend → deployer calls `initiateTrade` + `settleTrade` (user's shares go to deployer, user receives INR from deployer)

One MetaMask signature per trade from the user. Clean UX.

**Frontend — `TradePage.jsx` changes:**

Before calling the backend to place an order, the frontend must get user approval:
```js
// BUY — user approves INRToken spend
const inrContract = new ethers.Contract(
  deployment.contracts.INRToken, INR_ABI, signer
);
const approveTx = await inrContract.approve(
  deployment.contracts.DvPSettlement,
  BigInt(totalAmountInPaise)
);
await approveTx.wait();
// now call POST /api/trades/order

// SELL — user approves StockToken spend
const stockContract = new ethers.Contract(
  deployment.contracts.stocks[symbol].address, STOCK_ABI, signer
);
const approveTx = await stockContract.approve(
  deployment.contracts.DvPSettlement,
  BigInt(quantity)
);
await approveTx.wait();
// now call POST /api/trades/order
```

Show "Waiting for MetaMask approval..." with a spinner during this step. The approval itself is a real on-chain tx — show that txHash too.

**Backend — full rewrite of `backend/services/settlement.js`:**
```js
const { ethers } = require("ethers");
const { provider, deployerWallet, inrToken, dvpSettlement, getStockContract, deployment } = require("./blockchain");

async function executeSettlement(trade) {
  const tradeIdBytes = ethers.id(`${trade.id}-${Date.now()}`);
  const stockContract = getStockContract(trade.symbol);
  const stockAddress = deployment.contracts.stocks[trade.symbol].address;
  const priceInPaise = Math.round(trade.price * 100);

  // Deployer approvals (deployer is the seller in BUY trades)
  // For BUY: deployer (seller) must approve DvP to transfer stock tokens
  await (await stockContract.approve(deployment.contracts.DvPSettlement, trade.quantity)).wait();

  // Step 1: initiateTrade on-chain
  const initTx = await dvpSettlement.initiateTrade(
    tradeIdBytes,
    trade.buyerAddress,        // buyer = user
    deployerWallet.address,    // seller = deployer/market-maker
    stockAddress,
    trade.quantity,
    priceInPaise,
    trade.symbol
  );
  const initReceipt = await initTx.wait();

  // Step 2: settleTrade — THE ATOMIC SWAP
  const settleTx = await dvpSettlement.settleTrade(tradeIdBytes);
  const settleReceipt = await settleTx.wait();

  // Real settlement time from block timestamps
  const initBlock   = await provider.getBlock(initReceipt.blockNumber);
  const settleBlock = await provider.getBlock(settleReceipt.blockNumber);
  const settlementTimeSec = settleBlock.timestamp - initBlock.timestamp;

  return {
    initTxHash:       initTx.hash,
    settleTxHash:     settleTx.hash,
    blockNumber:      settleReceipt.blockNumber,
    settlementTimeSec
  };
}

module.exports = { executeSettlement };
```

**`SettlementTracker.jsx` additions:**
- New FIRST step: "Wallet Approval" — active while waiting for MetaMask, shows approval txHash as explorer link when done
- ALL txHash values → `<a href="${EXPLORER_URL}/tx/${txHash}" target="_blank">` — clickable
- Settlement time sourced from real block timestamps, not `Date.now()`
- Show actual block number

---

### GOAL 5 — JSON File as Database

Replace `backend/models/store.js` (in-memory object that resets on every restart) with a persistent JSON file.

**New file: `backend/models/db.js`:**
```js
const fs   = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../database/db.json");

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); }
  catch { return { users: {}, trades: [], settlements: [], orders: [] }; }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUser(address) {
  const db = readDB();
  return db.users[address.toLowerCase()] || null;
}

function upsertUser(address, updates) {
  const db = readDB();
  const key = address.toLowerCase();
  db.users[key] = {
    address: key,
    role: "retail",
    portfolio: {},
    txHistory: [],
    joinedAt: new Date().toISOString(),
    ...(db.users[key] || {}),
    ...updates
  };
  writeDB(db);
  return db.users[key];
}

function addTrade(trade)          { const db = readDB(); db.trades.push(trade); writeDB(db); }
function updateTrade(id, updates) {
  const db = readDB();
  const i = db.trades.findIndex(t => t.id === id);
  if (i !== -1) { db.trades[i] = { ...db.trades[i], ...updates }; writeDB(db); }
}
function addSettlement(s)         { const db = readDB(); db.settlements.push(s); writeDB(db); }

module.exports = { readDB, writeDB, getUser, upsertUser, addTrade, updateTrade, addSettlement };
```

**`database/db.json`** initial state:
```json
{
  "users": {},
  "trades": [],
  "settlements": [],
  "orders": []
}
```

**What stays in memory (never persisted):** Stock prices and the `setInterval` simulation. Prices reinitialize from hardcoded base values on each server start — that's fine.

**What must be in db.json:** User profiles, portfolio holdings, all trades with txHashes, all settlements with step logs.

Update every route: swap `store.js` references for `db.js` functions.

---

### GOAL 6 — Wallet-Aware Dashboard with Live Stats + Settlement Race

**`DashboardPage.jsx` — full rebuild:**

**Top identity bar:**
- Wallet address with one-click copy: `0xABCD...EFGH`
- Network badge: green dot + `REACT_APP_CHAIN_NAME`
- Live INR balance fetched from `INRToken.balanceOf(account)` via ethers.js, formatted as ₹ with paise: `"₹ 2,34,500.00"`
- Native gas token balance
- **"Add Funds" button** → opens FaucetModal

**4 stats cards (all real numbers, no hardcoding):**
- **Net Worth** — `inrBalance + Σ(qty × currentSimulatedPrice)` — refreshes every 500ms
- **Avg Settlement** — mean of `(settledAt - createdAt)` across user's SETTLED trades from db.json
- **Capital Unlocked** — sum of `totalAmount` for user's SETTLED trades (capital that would be locked 24h in T+1)
- **Total Trades** — count from db.json

**THE SETTLEMENT RACE PANEL — your demo's showstopper:**

Build an animated three-column comparison. Show it prominently above the fold:

```
┌─────────────────────────────────────────────────────────────┐
│        T+2 Legacy        │  SEBI T+0 Pilot  │  SettleChain  │
├──────────────────────────┼──────────────────┼───────────────┤
│ Settles next morning     │ Settles end-of-  │  ~8 seconds   │
│                          │ day (5:30 PM)    │               │
│ Capital frozen 24+ hours │ Frozen 4–6 hours │  Freed NOW    │
│ Counterparty risk 24h    │ Risk 6 hours     │  Zero risk    │
│ ₹6L Cr locked daily      │ Partial unlock   │  Full unlock  │
│ Margin: HIGH             │ Margin: HIGH     │  Margin: ZERO │
│                          │ 139 trades/year  │  LIVE DEMO    │
└──────────────────────────┴──────────────────┴───────────────┘
```

Below the table, an **animated race** triggered after every completed trade:
- Two horizontal progress bars, running in parallel
- Left bar: "Traditional" — labeled timeline: Trade Placed → Order Matching (4PM) → Clearing (overnight) → Settlement 9:15AM tomorrow → slowly crawling, never finishing during the demo
- Right bar: "SettleChain" — snaps to 100% in 8 seconds with a ✅ and "SETTLED" badge
- Make the left bar's crawl and the right bar's instant snap happen simultaneously and visually. This is the wow moment.

**"My On-Chain Activity" section:**
- Last 5 trades from db.json
- Each row: BUY/SELL badge, symbol, `qty × ₹price`, settlement time in seconds, explorer link icon (→ real txHash)
- Empty state: "No trades yet. Buy your first stock →"

**AML Score on Regulator dashboard (NEW — makes you compliance-ready):**
Every trade gets a deterministic AML risk score (no ML needed — just logic):
- Trade size > 10× user's historical average → +30 points (unusual volume)
- Three or more trades in under 60 seconds → +25 points (layering pattern)  
- Exactly round number (₹10,00,000 / ₹5,00,000 / ₹1,00,000) → +15 points (structuring signal)
- New wallet (first trade ever) + large amount (> ₹25,000) → +20 points
- Score 0–30: LOW (green), 31–60: MEDIUM (yellow), 61+: HIGH (red — auto-surface to regulator)

Show score on each trade row in `RegulatorPage.jsx`. The regulator's `flagTrade()` call on a HIGH-score trade goes on-chain and is immutable. Frame this in your pitch: "The flag cannot be removed by anyone, including the exchange itself."

---

## PART 3 — NARRATIVE WEAPONS

The agent must understand the *why* so it defends every design decision instead of simplifying it away.

### What every competing team will build
- Localhost only — no public chain, no verifiable txHash
- `setTimeout` + fake hashes — "blockchain" is a UI label on a database operation
- Email/password auth
- Numbers in a table that they call "transactions"
- Call it "blockchain-powered"

### What SettleChain does instead

**1. Every txHash is real and verifiable right now.**
Open the block explorer during the demo. Paste the hash. The settlement happened. The atomic swap is there. Block timestamp proves it was 8 seconds. This is not a claim. It is a cryptographic fact recorded on a public blockchain that nobody — not you, not the judges, not the organizers — can alter.

**2. INR is a real ERC20 token with paise precision.**
Most demos treat money as `user.balance += amount` in a database. Here INR has `decimals=2`, lives on-chain, and every faucet call fires a real `mint()` transaction. Any auditor can reconstruct the entire monetary history from the chain alone, without your database.

**3. `decimals=0` for stocks is regulatory accuracy.**
Indian exchanges (NSE/BSE) do not allow fractional shares. This contract enforces that at the cryptographic token level — not a runtime check, not a validation function, but a mathematical impossibility. One token, one share.

**4. The regulator flag is an immutable legal primitive.**
When the SEBI monitor wallet calls `flagTrade()`, that state change is permanent. No admin panel, no database edit, no pressure from above can undo it. NSCCL/ICCL's compliance systems are mutable database rows. SettleChain's compliance is an immutable blockchain event. That distinction is profound.

**5. SEBI's own failure is your strongest evidence.**
Their T+0 pilot ran for a full year and produced 139 trades. Industry sources explained why: money only gets freed *after market close*, so investors see no benefit for intraday redeployment. SettleChain frees capital in 8 seconds — usable for the next trade immediately. The problem isn't political will. It's architecture. SettleChain proves the architecture.

### The one-sentence pitch
*"SEBI spent a year trying to solve this. We solved it in 8 seconds, on a public blockchain, and every transaction is verifiable right now."*

### Numbers to use in the UI
- ₹6,00,000 crore locked daily in T+1 clearing — SEBI's own published figure
- 139 trades in 12 months — SEBI T+0 pilot's real adoption number
- ~₹4,000 crore freed when India moved T+2 → T+1 (from SEBI data)
- SettleChain: margin requirement for settled trades = **zero** (settlement is final in seconds, no overnight exposure)

---

## PART 4 — ARCHITECTURE AFTER TRANSFORMATION

```
User Browser (MetaMask)
        │
        │ window.ethereum / ethers.BrowserProvider
        │ Signs: approve() once per trade
        ▼
React Frontend (localhost:3000)
  WalletContext        — window.ethereum, EVM testnet, chainId from .env
  FaucetModal          — UPI/RTGS UI → POST /api/faucet/deposit → real mint()
  SettlementTracker    — real txHash, block explorer links, real timestamps
  DashboardPage        — live INR from contract, settlement race panel, AML
        │
        │ REST API (axios)
        ▼
Node.js + Express Backend (localhost:4000)
  GET  /api/auth/wallet/:address    — upsert user by wallet address
  POST /api/faucet/deposit          — INRToken.mint() via deployer
  POST /api/trades/order            — approve check → initiateTrade → settleTrade
  GET  /api/stocks                  — simulated prices (Math.random, in-memory)
  GET  /api/portfolio/:address      — from db.json
  GET  /api/regulator/trades        — all trades + AML scores
  services/blockchain.js            — shared: provider, deployerWallet, contracts
        │
        │ ethers.JsonRpcProvider → RPC_URL from .env
        ▼
EVM-Compatible Public Testnet
  INRToken.sol       (decimals=2, mint, burn — deployer is owner)
  StockToken.sol ×5  (decimals=0, mint — deployer holds supply)
  DvPSettlement.sol  (initiateTrade, settleTrade, flagTrade)
        │
        ▼
database/db.json         — users{}, trades[], settlements[], orders[]
database/deployment.json — contract addresses + network metadata
```

---

## PART 5 — DO NOT CHANGE

Preserve these exactly:

1. **`contracts/DvPSettlement.sol`** — zero changes. Correct, secure, complete.
2. **Stock price simulation** — the `setInterval` with `Math.random() * 0.01 - 0.005` every 500ms. Move it to wherever stock state lives in memory but keep the logic identical.
3. **The 5 stock symbols** — RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK.
4. **`SettlementTracker.jsx` step progression** — only ADD the wallet approval step at the start. Never remove existing steps.
5. **Dark UI color scheme and Tailwind setup.**
6. **`Sidebar.jsx` navigation** — keep all existing page links.
7. **`backend/routes/regulator.js`** — keep flagging logic, just update to read from `db.js` and use wallet addresses. Add AML score display.

---

## PART 6 — PACKAGES TO ADD

**Root / Hardhat:**
```bash
npm install dotenv @nomicfoundation/hardhat-verify
```

**Backend:**
```bash
npm install ethers dotenv
# ethers v6: ethers.JsonRpcProvider, ethers.Wallet, ethers.Contract, ethers.id
```

**Frontend:**
```bash
npm install ethers
# ethers v6: ethers.BrowserProvider, ethers.Contract, ethers.formatUnits, ethers.parseUnits
```

---

## PART 7 — IMPLEMENTATION ORDER

Execute in this exact sequence:

1. `.env` file + update `.gitignore`
2. `hardhat.config.js` — testnet network block
3. `scripts/deploy.js` — rewrite for single deployer
4. **Deploy to testnet** — get real contract addresses
5. `database/deployment.json` + `frontend/src/utils/deployment.json` — real addresses
6. `backend/services/blockchain.js` — new shared service: provider, wallet, contracts
7. `backend/models/db.js` — new file
8. `database/db.json` — create empty initial state
9. `backend/services/settlement.js` — full rewrite with real ethers.js
10. `backend/routes/auth.js` — wallet upsert
11. `backend/routes/faucet.js` — new file: mint INR on-chain
12. `backend/routes/trades.js` — update to use db.js
13. `backend/routes/portfolio.js` — update to use db.js
14. `backend/routes/regulator.js` — update to use db.js, add AML scoring
15. `backend/server.js` — add faucet route, update imports
16. `frontend/src/context/WalletContext.js` — full rewrite: window.ethereum, EVM testnet
17. `frontend/src/context/AuthContext.js` — rewrite: wallet = identity
18. `frontend/src/pages/LoginPage.jsx` — connect wallet only
19. `frontend/src/components/FaucetModal.jsx` — new file
20. `frontend/src/pages/DashboardPage.jsx` — wallet stats + race panel
21. `frontend/src/pages/TradePage.jsx` — MetaMask approve step before order
22. `frontend/src/components/SettlementTracker.jsx` — wallet approval step + real links

---

## PART 8 — MULTI-AGENT BREAKDOWN

3 agents, run A and B in parallel, C after both deliver.

### Agent A — "Chain Agent"
**Owns:** `hardhat.config.js`, `scripts/deploy.js`, `.env`, `backend/services/blockchain.js`, `backend/services/settlement.js`, `backend/routes/faucet.js`

**Task:** Get contracts live on a public testnet. Rewrite settlement with real ethers.js calls. Build faucet endpoint. This unblocks everything.

**Deliverable:** `deployment.json` with live testnet addresses. `/api/faucet/deposit` returning real txHash. `settleTrade()` call producing real txHash from the public chain.

---

### Agent B — "Data Agent"
**Owns:** `backend/models/db.js`, `database/db.json`, `backend/routes/auth.js`, `backend/routes/trades.js`, `backend/routes/portfolio.js`, `backend/routes/regulator.js`, `backend/server.js`

**Task:** Replace in-memory store with JSON DB. All routes wallet-address keyed. Stocks stay in memory. Add AML scoring to regulator route.

**Can run in parallel with A** — use placeholder addresses until A delivers deployment.json.

**Deliverable:** All API endpoints correct, db.json persisting across restarts, AML scores on trade objects.

---

### Agent C — "UI Agent"
**Owns:** All of `frontend/src/`

**Task:** Rewrite WalletContext for window.ethereum + EVM testnet. Wallet-only LoginPage. FaucetModal. Dashboard with live balance + settlement race panel. TradePage MetaMask approve step. SettlementTracker explorer links.

**Starts after A and B deliver.**

**Deliverable:** End-to-end flow: MetaMask connect → faucet INR → approve + buy stock → real on-chain settlement → txHash visible in public block explorer.

---

**Final integration test:** Full buy flow verified on live testnet. txHash from `settleTrade()` pasted into block explorer. Block timestamps prove sub-10-second settlement. This is the demo moment.

---

*This is the complete specification. Every file that changes is named. Every new file is fully specced. The contracts stay unchanged. The vision stays unchanged. The infrastructure becomes provably real.*