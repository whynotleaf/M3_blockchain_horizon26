const fs = require("fs");
const path = require("path");

const deploymentPath = path.join(__dirname, "../../database/deployment.json");
let deployment = {};
try {
  deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
} catch (e) {
  console.error("Warning: deployment.json not found in store.js");
}

const store = {
  users: [
    {
      id: "user_1",
      email: "arjun@demo.com",
      password: "demo123",
      name: "Arjun Sharma",
      role: "retail",
      address: deployment.accounts?.retail1?.address || "",
      privateKey: deployment.accounts?.retail1?.privateKey || "",
      inrBalance: 500000,
      portfolio: { RELIANCE: 0, TCS: 0, HDFCBANK: 0, INFY: 0, ICICIBANK: 0 }
    },
    {
      id: "user_2",
      email: "priya@demo.com",
      password: "demo123",
      name: "Priya Patel",
      role: "retail",
      address: deployment.accounts?.retail2?.address || "",
      privateKey: deployment.accounts?.retail2?.privateKey || "",
      inrBalance: 500000,
      portfolio: { RELIANCE: 500, TCS: 0, HDFCBANK: 0, INFY: 0, ICICIBANK: 0 }
    },
    {
      id: "user_3",
      email: "icici@demo.com",
      password: "demo123",
      name: "ICICI Securities",
      role: "institutional",
      address: deployment.accounts?.institutional1?.address || "",
      privateKey: deployment.accounts?.institutional1?.privateKey || "",
      inrBalance: 5000000,
      portfolio: { RELIANCE: 0, TCS: 300, HDFCBANK: 0, INFY: 0, ICICIBANK: 0 }
    },
    {
      id: "user_4",
      email: "sebi@demo.com",
      password: "demo123",
      name: "SEBI Monitor",
      role: "regulator",
      address: deployment.accounts?.regulator?.address || "",
      privateKey: deployment.accounts?.regulator?.privateKey || "",
      inrBalance: 0,
      portfolio: {}
    }
  ],
  stocks: [
    { symbol: "RELIANCE", name: "Reliance Industries", price: 2850, change: 12.5,  changePercent: 0.45 },
    { symbol: "TCS",      name: "Tata Consultancy",    price: 3950, change: -45.2, changePercent: -1.12 },
    { symbol: "HDFCBANK", name: "HDFC Bank",           price: 1680, change: 8.9,   changePercent: 0.53 },
    { symbol: "INFY",     name: "Infosys",             price: 1480, change: -2.3,  changePercent: -0.15 },
    { symbol: "ICICIBANK",name: "ICICI Bank",          price: 1180, change: 15.4,  changePercent: 1.32 }
  ],
  orders: [],
  trades: [],
  settlements: []
};

// Update stock prices every 0.5 seconds
setInterval(() => {
  store.stocks.forEach(stock => {
    // Random factor between -0.5% and +0.5%
    const changeFactor = 1 + (Math.random() * 0.01 - 0.005);
    const oldPrice = stock.price;
    let newPrice = Number((stock.price * changeFactor).toFixed(2));
    
    // Prevent prices from becoming negative or zero
    if (newPrice < 1) newPrice = 1;
    
    // Slight random drift for the change
    stock.price = newPrice;
    stock.change = Number((stock.price - oldPrice).toFixed(2));
    stock.changePercent = Number(((stock.change / oldPrice) * 100).toFixed(2));
  });
}, 500);

module.exports = { store };
