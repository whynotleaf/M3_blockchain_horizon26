# 🏦 SettleChain 2.0: Real-Time Atomic Settlement

> *Why wait 24 hours for your money when the code can do it in 8 seconds?*

SettleChain is a blockchain-based *Delivery vs Payment (DvP)* system designed for the Indian stock market. It eliminates counterparty risk by ensuring that stock tokens and INR tokens swap hands *atomically* or not at all.

This is the "Transformation" version (v2.0), evolved from a simple simulation into a functional proof-of-concept with *MetaMask integration, **on-chain settlement, and **persistent storage*.

---

## ⚡ The Problem: T+1 is Too Slow
Every day in India, over *₹6,00,000 Crores* of capital is locked in the clearing system. If you sell a stock today, you wait until tomorrow to use that cash. This "idle capital" is a massive inefficiency.

## 🚀 The Solution: SettleChain
By using EVM-compatible smart contracts, we achieve:
1.  *Atomic Swaps*: No buyer gets shares without the seller getting paid.
2.  *Instant Liquidity*: Capital is freed the moment the block is confirmed (~8s).
3.  *Zero Risk*: No need for a central clearing house to guarantee the trade; the code is the guarantee.

---

## 🛠 Tech Stack
-   *Blockchain*: Solidity, Hardhat, Ethers.js v6
-   *Backend*: Node.js, Express, Persistent JSON Database
-   *Frontend*: React, Tailwind CSS, Recharts
-   *Wallet*: MetaMask (EVM)

---

## 🏗 System Architecture

mermaid
graph TD
    A[MetaMask Wallet] -->|Sign Tx| B(React Frontend)
    B -->|API| C(Node.js Backend)
    C -->|Ethers.js| D[Hardhat Local Node]
    D -->|DvP Swap| E[Smart Contracts]
    C -->|Persistent IO| F[(db.json)]
    style E fill:#22c55e,stroke:#fff,color:#000


---

## 🚦 Quick Start Guide

### 1. Prerequisites
-   [MetaMask Extension](https://metamask.io/) installed in your browser.
-   Node.js v18+ installed.

### 2. Setup & Installation
bash
# Clone the repository
git clone https://github.com/your-repo/settlechain
cd SettleChain

# Install all dependencies
npm install && cd backend && npm install && cd ../frontend && npm install && cd ..


### 3. Environment Configuration
Create a .env file in the root directory (and one in frontend/.env - see walkthrough) with these variables:
env
# Backend .env
PORT=4000
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
DEPLOYER_PRIVATE_KEY=0x... (from Hardhat node)
SEBI_MONITOR_ADDRESS=0x... (the address you want to be Regulator)


### 4. Running the System
1.  *Start Local Node*: npx hardhat node
2.  *Deploy Contracts*: npm run deploy (copies ABIs and addresses to frontend/backend)
3.  *Start Backend*: cd backend && node server.js
4.  *Start Frontend*: cd frontend && npm start

---

## 💎 v2.0 Key Features

### 🔑 Wallet = Identity
Forget email/password. Just connect your MetaMask. Your wallet address is your account. The system automatically detects if you are the *SEBI Regulator* based on your address.

### 🚰 On-Chain INR Faucet
Need test funds? Use our faucet. We've integrated a simulated *UPI/RTGS payment gateway*. Complete a virtual UPI payment, and the backend mints real INR tokens to your wallet on-chain.

### 🏎 The Settlement Race
Our dashboard doesn't just show numbers; it shows a competition. Witness the "Settlement Race" where we compare traditional T+1 (24 hours) against SettleChain (~8 seconds) in real-time.

### 🛡 Regulator Oversight (AML)
The SEBI Monitor dashboard includes *deterministic AML risk scoring*. It flags unusual volumes, layering patterns, and suspicious "round-number" transfers automatically for human review.

### 💾 Persistent Memory
Unlike v1.0, SettleChain now uses a persistent JSON database (db.json). Your trade history, portfolio state, and risk flags survive even if you restart the server.

---

## 📝 Smart Contract Logic: Atomic DvP
The DvPSettlement.sol contract is the hearts and brains of the system. It uses a *Three-Step Atomic Process*:
1.  *Approval*: Buyer approves INR; Seller approves Shares.
2.  *Initiation*: Backend validates the trade intent.
3.  *Settlement: One single transaction executes transferFrom() for both assets. If either fails, the whole trade reverts. **No half-trades, ever.*

---

Built with 💚 for the future of Indian Finance.
Disclaimer: This is a prototype and not intended for production financial use.