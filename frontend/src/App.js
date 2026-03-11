import React, { useState } from "react";
import { WalletProvider } from "./context/WalletContext";
import { useAuth } from "./context/AuthContext";
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
  const [page, setPage] = useState(user?.role === "regulator" ? "regulator" : "dashboard");

  if (!user) return <LoginPage />;

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
  return <AppContent />;
}
