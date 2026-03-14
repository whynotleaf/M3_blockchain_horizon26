import React, { useState } from "react";
import { WalletProvider } from "./context/WalletContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useWallet } from "./context/WalletContext";
import LoginPage     from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TradePage     from "./pages/TradePage";
import PortfolioPage from "./pages/PortfolioPage";
import HistoryPage   from "./pages/HistoryPage";
import SettlementPage from "./pages/SettlementPage";
import RegulatorPage from "./pages/RegulatorPage";
import Sidebar       from "./components/Sidebar";

function AppContent() {
  const { user } = useAuth();
  const { isConnected } = useWallet();
  const [page, setPage] = useState(user?.role === "regulator" ? "regulator" : "dashboard");

  // Show login if wallet not connected or user not synced
  if (!isConnected || !user) return <LoginPage />;

  const pages = {
    dashboard:  <DashboardPage  onNavigate={setPage} />,
    trade:      <TradePage />,
    portfolio:  <PortfolioPage />,
    history:    <HistoryPage    onNavigate={setPage} />,
    settlement: <SettlementPage />,
    regulator:  <RegulatorPage />,
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar active={page} onChange={setPage} />
      <main className="flex-1 overflow-y-auto">
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </WalletProvider>
  );
}
