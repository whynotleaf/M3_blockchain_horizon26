# SettleChain -- Real-Time Blockchain Settlement for Indian Stock Markets

SettleChain is a prototype project that demonstrates how blockchain can
improve settlement in stock markets. In traditional trading systems,
settlements usually happen in a **T+1 cycle**, where the transfer of
shares and money takes place one day after the trade.

This project explores how blockchain can enable **near-instant
settlement (around 5--10 seconds)** using the concept of **atomic
Delivery vs Payment (DvP)**. The system simulates a trading platform
where tokenized shares and digital INR tokens are exchanged through
smart contracts.



## How to Run

Install dependencies:

```bash
# root
npm i

# frontend
cd frontend
npm i

# backend
cd ../backend
npm i
```

Start the local blockchain (run from root):

```bash
npx hardhat node
```

Start the backend (new terminal):

```bash
cd backend
npm run start
```

Start the frontend (another terminal):

```bash
cd frontend
npm run start
```

------------------------------------------------------------------------

## Trading Dashboard
![Trading Dashboard](readmeassets/dashboard.png)

# Tech Stack

The project is built as a full-stack system consisting of a frontend
interface, a backend API, and a blockchain settlement layer.

The **frontend** is built using React and Tailwind CSS. It provides the
trading dashboard, portfolio view, and settlement tracker.

The **backend** uses Node.js with Express. It manages API requests,
authentication, order processing, and interaction with the blockchain.

The **blockchain layer** uses Solidity smart contracts deployed on a
local Ethereum network using Hardhat. The backend communicates with
these contracts using ethers.js.

**Technologies used**

-   React + Tailwind CSS\
-   Node.js + Express\
-   Solidity Smart Contracts\
-   Hardhat (Local Ethereum Network)\
-   ethers.js\
-   Git / GitHub

------------------------------------------------------------------------

# Architecture

The system follows a simple **client--server architecture with a
blockchain layer**.

    React Frontend
          │
          │ REST API
          ▼
    Node.js + Express Backend
          │
          │ ethers.js
          ▼
    Hardhat Local Blockchain
    (Smart Contracts for INR Token, Stock Tokens, and Settlement)

The React frontend allows users to interact with the system. When a user
places a trade, the request is sent to the backend API.

The backend validates the trade, simulates payment processing, and then
calls the smart contracts using ethers.js.

The smart contracts perform the **atomic DvP settlement**, ensuring that
payment and share transfer happen together in the same blockchain
transaction.

------------------------------------------------------------------------

### Trade Interface
![Trade](readmeassets/trade.png)

# Data Pipeline

The data flow begins when a user places a trade through the frontend
trading interface.

The frontend sends the trade request to the backend using a REST API.
The backend verifies the request, checks ownership of shares, and
processes a simulated payment.

Once validation is completed, the backend interacts with the settlement
smart contract. The contract performs an **atomic swap**, transferring
stock tokens to the buyer and payment tokens to the seller within the
same transaction.

After the blockchain confirms the transaction, the backend updates the
system state and sends the settlement result back to the frontend.

------------------------------------------------------------------------


## Portfolio View
![Portfolio](readmeassets/portfolio.png)

------------------------------------------------------------------------

# Smart Contracts & System Design

This project uses three different smart contracts that together handle the tokenization of assets and settlement logic.

**1. Stock Token Contract**

The first contract represents stocks as tokens on the blockchain.  
Stocks cannot be divided into fractions in our system, so the token uses **0 decimals** and all values are stored as integers.

The contract includes:
- An **initial supply** of shares
- A **mint function** that allows new stocks to be issued if required

This contract essentially represents the supply and ownership of stocks on the blockchain.

**2. INR Token Contract**

The second contract represents **Indian Rupees (INR)** as a token on the blockchain.

Since real currency values can include paise, this token uses **2 decimal places**, allowing values to be stored in paisa units.

The contract includes:
- A **mint function** to create new INR tokens
- A **burn function** to remove tokens from circulation

These functions simulate monetary regulation and help maintain stability of the INR token within the system.

**3. Settlement Contract**

The third contract manages the **initialisation and settlement of trades**.

Two main functions are used:

- **initialize()** — creates a pending transaction between a buyer and seller  
- **settle()** — executes the trade when all required conditions are satisfied

Before settlement, the contract checks that:
- The **buyer has sufficient INR balance** to purchase the stocks
- The **seller owns enough stock tokens** to fulfill the order

If both conditions are met, the smart contract performs the transfer of tokens between the two parties.

This process ensures **atomic Delivery vs Payment (DvP)** where both asset transfer and payment occur together.

------------------------------------------------------------------------

# Deployment

All smart contracts are deployed to a **local Ethereum network** using **Hardhat**.

Hardhat allows the contracts to run on a simulated blockchain environment for development and testing. The same deployment setup can also be configured to deploy contracts to:

- Ethereum Testnets
- Ethereum Mainnet
- Other EVM-compatible networks

------------------------------------------------------------------------

# Future Deployment Approach

If deployed on a production blockchain, the system would ideally use **low gas fee networks** such as:

- Optimism
- Arbitrum
- Other Layer 2 Ethereum networks

These networks provide faster transactions and significantly lower gas costs while remaining compatible with Ethereum smart contracts.

------------------------------------------------------------------------

# Market Simulation

The stocks displayed on the platform are currently **not connected to real market data**.

Instead, stock prices are **hardcoded and dynamically updated using `Math.random()`** to simulate real market fluctuations. This allows the system to demonstrate trading and settlement behaviour without relying on external market APIs.

------------------------------------------------------------------------

# Data Storage Design

For simplicity and ease of development, the project stores most application data directly inside **JavaScript files**.

This includes:
- User accounts
- Stock listings
- Trade records

A traditional database or JSON storage was not used to keep the project lightweight and focused on demonstrating the **blockchain settlement process**.

In the current architecture:

- **Blockchain is used for:**  
  - Trade initialization  
  - Atomic settlement

- **JavaScript files store:**  
  - User data  
  - Stock information  
  - Transaction history

This design keeps blockchain usage limited to the **critical settlement layer**, while the rest of the system operates through the backend application.

------------------------------------------------------------------------

# Note

This project is a prototype built for demonstration and learning
purposes. Many components such as payments and order matching are
simplified and are not intended for production use.
