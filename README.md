# SettleChain - Real-Time Blockchain Settlement for Indian Stock Markets

A full-stack prototype demonstrating how blockchain enables **atomic Delivery vs Payment (DvP)** settlement, replacing traditional T+1 with near-instant settlement (~5-10 seconds).

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│  Dashboard · Trade · Portfolio · Settlement Monitor  │
└─────────────────────┬───────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────┐
│              Node.js + Express Backend               │
│   Auth · Stocks · Orders · Settlement Engine · UPI   │
└─────────────────────┬───────────────────────────────┘
                      │ ethers.js
┌─────────────────────▼───────────────────────────────┐
│              Hardhat Local Blockchain                │
│   INRToken (ERC20) · StockTokens · DvPSettlement     │
└─────────────────────────────────────────────────────┘
```

---

## System Components

| Component | Tech | Purpose |
|-----------|------|---------|
| Frontend  | React + Tailwind | Trading UI, portfolio, settlement tracker |
| Backend   | Node.js + Express | API, order matching, settlement engine |
| Smart Contracts | Solidity | Atomic DvP swap on Ethereum |
| Blockchain | Hardhat | Local Ethereum node |
| Payment | Mock UPI/RTGS | Indian payment rail simulation |

---

## Demo Users

| Name | Email | Password | Role |
|------|-------|----------|------|
| Arjun Sharma | arjun@demo.com | demo123 | Retail Trader |
| Priya Patel | priya@demo.com | demo123 | Retail Trader (owns shares) |
| ICICI Securities | icici@demo.com | demo123 | Institutional Trader |
| SEBI Monitor | sebi@demo.com | demo123 | Regulator |

## Quick Start Guide

### Prerequisites
- Node.js v18+
- npm v9+

### Setup Instructions

1. **Install root dependencies**
```bash
cd settlement-system
npm install
```

2. **Install backend dependencies**
```bash
cd backend
npm install
cd ..
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

4. **Start local blockchain**
In your first terminal, start the Hardhat node:
```bash
npx hardhat node
```
This will generate test accounts with private keys. Keep this terminal running.

5. **Deploy smart contracts**
Open a second terminal and run the deployment script:
```bash
npm run deploy
```
This deploys the INR token, Stock tokens, and the Settlement contract, then seeds the test users.

6. **Start backend**
In the same second terminal, start the backend server:
```bash
cd backend
npm start
```
The backend will run on http://localhost:4000.

7. **Start frontend**
Open a third terminal and start the React app:
```bash
cd frontend
npm start
```
The frontend will run on http://localhost:3000.

## Demo Walkthrough

### Trading Flow
1. Login as Arjun Sharma (retail trader).
2. Navigate to Trade and select RELIANCE.
3. Set the quantity and choose UPI as the payment method.
4. Click Buy and watch the real-time settlement tracker.
5. Settlement completes in approximately 5 to 10 seconds.

### Sell Flow
1. Login as Priya Patel.
2. Navigate to Trade, select RELIANCE, and choose to Sell.
3. Watch the atomic DvP settlement process execute.

### Regulator View
1. Login as SEBI Monitor.
2. View all trades happening in real-time.
3. Flag suspicious trades with specific reasoning and monitor settlement times across the platform.

## Smart Contract Details: Atomic DvP

The core innovation is the atomic swap functionality. If either the payment transfer or the stock delivery fails, the entire transaction reverts. This guarantees:
- The buyer receives shares if and only if the seller receives payment.
- Zero counterparty risk.
- No partial settlements.
- An immutable audit trail on the blockchain.

## Key Features

- **Real-Time Settlement Tracker**: Monitor live progress through various stages like Payment Verification, Share Ownership Verification, Blockchain Transaction Broadcast, Atomic DvP Swap Execution, and Block Confirmation.
- **Settlement Comparison**: Contrast the traditional T+1 settlement with our near-instant process.
- **Regulator Dashboard**: Specialized tools for administrators to monitor trades, audit settlement trails, and view blockchain transaction hashes.

## Project Structure

```
settlement-system/
├── contracts/
│   └── DvPSettlement.sol        # Solidity: DvP, Stock, and INR logic
├── scripts/
│   └── deploy.js                # Deployment script
├── backend/
│   ├── server.js                # Express entry point
│   ├── models/store.js          # In-memory JavaScript data store
│   ├── routes/
│   │   ├── auth.js              # Authentication
│   │   ├── stocks.js            # Stock data
│   │   ├── trades.js            # Order placement and settlement
│   │   ├── portfolio.js         # Portfolio analytics
│   │   └── regulator.js        # Regulator monitoring
│   └── services/
│       ├── payment.js           # Payment simulation
│       └── settlement.js        # Settlement engine
├── frontend/
│   └── src/
│       ├── pages/               # React pages
│       ├── components/          # UI components
│       ├── context/             # State management
│       └── utils/               # Helpers
├── database/
│   └── deployment.json          # Contract addresses
└── README.md
```

## Troubleshooting

- **Backend cannot connect to blockchain**: Ensure the Hardhat node is running in the first terminal and try running the deployment script again.
- **Network Error on frontend**: Verify the backend is running on port 4000 and check the proxy settings in the frontend package.json.
- **Settlement stuck at Initiating**: Refresh the page or check the backend console for any detailed error messages.

---
Built for demonstration purposes. Not for production use.
