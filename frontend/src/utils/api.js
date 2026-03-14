import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const API = axios.create({ baseURL: `${API_URL}/api` });

// Auth — wallet-based
export const getWalletUser   = (address)     => API.get(`/auth/wallet/${address}`);
export const getMe           = (address)     => API.get(`/auth/me/${address}`);

// Stocks
export const getStocks       = ()            => API.get("/stocks");
export const getStock        = (symbol)      => API.get(`/stocks/${symbol}`);

// Trades
export const placeOrder      = (data)        => API.post("/trades/order", data);
export const getTrades       = (address)     => API.get("/trades", { params: { userAddress: address } });
export const getTrade        = (id)          => API.get(`/trades/${id}`);
export const getSettlement   = (id)          => API.get(`/trades/settlement/${id}`);
export const getAllSettlements= ()           => API.get("/trades/settlements/all");

// Portfolio
export const getPortfolio    = (address)     => API.get(`/portfolio/${address}`);
export const getAnalytics    = ()            => API.get("/portfolio/analytics/summary");

// Regulator
export const getRegDashboard = ()            => API.get("/regulator/dashboard");
export const flagTrade       = (id, reason)  => API.post(`/regulator/flag/${id}`, { reason });
export const unflagTrade     = (id)          => API.post(`/regulator/unflag/${id}`);

// Faucet
export const depositFaucet   = (data)        => API.post("/faucet/deposit", data);
