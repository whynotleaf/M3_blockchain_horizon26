// ─────────────────────────────────────────────
// UPI/RTGS Payment Simulation Service
// Simulates Indian payment rails
// ─────────────────────────────────────────────

const { store } = require("../models/store");

// Simulate UPI payment verification (50-800ms delay)
async function verifyUPIPayment({ userId, amount, upiId }) {
  await delay(Math.random() * 750 + 50);

  const user = store.users.find(u => u.id === userId);
  if (!user) return { success: false, reason: "User not found" };

  if (user.inrBalance < amount) {
    return {
      success: false,
      reason: "Insufficient balance",
      balance: user.inrBalance,
      required: amount
    };
  }

  // 95% success rate simulation
  if (Math.random() < 0.05) {
    return { success: false, reason: "UPI gateway timeout — retry" };
  }

  return {
    success: true,
    transactionRef: `UPI${Date.now()}${Math.floor(Math.random() * 9999)}`,
    upiId: upiId || `${user.name.toLowerCase().replace(" ", ".")}@upi`,
    amount,
    timestamp: new Date().toISOString()
  };
}

// Simulate RTGS payment (used for institutional, larger amounts)
async function verifyRTGSPayment({ userId, amount, ifscCode }) {
  await delay(Math.random() * 1500 + 500);

  const user = store.users.find(u => u.id === userId);
  if (!user) return { success: false, reason: "User not found" };

  if (user.inrBalance < amount) {
    return { success: false, reason: "Insufficient balance" };
  }

  return {
    success: true,
    transactionRef: `RTGS${Date.now()}`,
    ifscCode: ifscCode || "HDFC0001234",
    amount,
    timestamp: new Date().toISOString()
  };
}

// Debit buyer (called after settlement)
function debitUser(userId, amount) {
  const user = store.users.find(u => u.id === userId);
  if (!user) return false;
  if (user.inrBalance < amount) return false;
  user.inrBalance -= amount;
  return true;
}

// Credit seller (called after settlement)
function creditUser(userId, amount) {
  const user = store.users.find(u => u.id === userId);
  if (!user) return false;
  user.inrBalance += amount;
  return true;
}

// Transfer shares
function transferShares(fromUserId, toUserId, symbol, qty) {
  const seller = store.users.find(u => u.id === fromUserId);
  const buyer  = store.users.find(u => u.id === toUserId);
  if (!seller || !buyer) return false;
  if ((seller.portfolio[symbol] || 0) < qty) return false;

  seller.portfolio[symbol] = (seller.portfolio[symbol] || 0) - qty;
  buyer.portfolio[symbol]  = (buyer.portfolio[symbol]  || 0) + qty;
  return true;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { verifyUPIPayment, verifyRTGSPayment, debitUser, creditUser, transferShares, delay };
