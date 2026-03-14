// ─────────────────────────────────────────────
// JSON File Database
// Replaces in-memory store.js — persists across restarts
// ─────────────────────────────────────────────
const fs   = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../database/db.json");

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); }
  catch { return { users: {}, trades: [], settlements: [], orders: [] }; }
}

function writeDB(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUser(address) {
  const db = readDB();
  return db.users[address.toLowerCase()] || null;
}

function upsertUser(address, updates) {
  const db  = readDB();
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

function addTrade(trade) {
  const db = readDB();
  db.trades.push(trade);
  writeDB(db);
}

function updateTrade(id, updates) {
  const db = readDB();
  const i  = db.trades.findIndex(t => t.id === id);
  if (i !== -1) { db.trades[i] = { ...db.trades[i], ...updates }; writeDB(db); }
}

function addSettlement(s) {
  const db = readDB();
  db.settlements.push(s);
  writeDB(db);
}

function updateSettlement(id, updates) {
  const db = readDB();
  const i  = db.settlements.findIndex(s => s.id === id);
  if (i !== -1) { db.settlements[i] = { ...db.settlements[i], ...updates }; writeDB(db); }
}

module.exports = { readDB, writeDB, getUser, upsertUser, addTrade, updateTrade, addSettlement, updateSettlement };
