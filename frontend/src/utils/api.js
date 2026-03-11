import axios from "axios";

const API = axios.create({ baseURL: "/api" });

// Auth
export const login           = (email, password)         => API.post("/auth/login", { email, password });
export const getDemoUsers    = ()                         => API.get("/auth/users");
export const getMe           = (userId)                   => API.get(`/auth/me/${userId}`);

// Stocks
export const getStocks       = ()                         => API.get("/stocks");
export const getStock        = (symbol)                   => API.get(`/stocks/${symbol}`);

// Trades
export const placeOrder      = (data)                     => API.post("/trades/order", data);
export const getTrades       = (userId)                   => API.get("/trades", { params: { userId } });
export const getTrade        = (id)                       => API.get(`/trades/${id}`);
export const getSettlement   = (id)                       => API.get(`/trades/settlement/${id}`);
export const getAllSettlements= ()                         => API.get("/trades/settlements/all");

// Portfolio
export const getPortfolio    = (userId)                   => API.get(`/portfolio/${userId}`);
export const getAnalytics    = ()                         => API.get("/portfolio/analytics/summary");

// Regulator
export const getRegDashboard = ()                         => API.get("/regulator/dashboard");
export const flagTrade       = (id, reason)               => API.post(`/regulator/flag/${id}`, { reason });
export const unflagTrade     = (id)                       => API.post(`/regulator/unflag/${id}`);
