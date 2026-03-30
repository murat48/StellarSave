import { useState } from "react";
import { WalletProvider } from "./contexts/WalletContext";
import WalletButton from "./components/WalletButton";
import Dashboard from "./components/Dashboard";
import DepositForm from "./components/DepositForm";
import WithdrawSection from "./components/WithdrawSection";
import TokenFaucet from "./components/TokenFaucet";
import "./index.css";

const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID ?? "Not deployed";
const SAVINGS_CONTRACT_ID = import.meta.env.VITE_SAVINGS_CONTRACT_ID ?? "Not deployed";
const REWARDS_CONTRACT_ID = import.meta.env.VITE_REWARDS_CONTRACT_ID ?? "Not deployed";

function AppInner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <span className="text-lg font-bold text-white">StellarSave</span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium border border-amber-500/30">
              TESTNET
            </span>
          </div>

          {/* Desktop wallet button */}
          <div className="hidden sm:block">
            <WalletButton />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="sm:hidden p-2 rounded-lg bg-slate-700 text-white"
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden mt-3 px-1 pb-2">
            <WalletButton />
          </div>
        )}
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8" key={refreshKey}>
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Earn Rewards on Stellar
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Lock your SAVE tokens and earn 5% APY — powered by Soroban smart contracts.
          </p>
        </div>

        <Dashboard
          currentSavings={0}
          timeRemainingLedgers={0}
          expectedReward={0}
          apy={5}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepositForm onDeposited={handleRefresh} />
          <WithdrawSection onWithdrew={handleRefresh} />
        </div>

        <TokenFaucet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <span className="text-sm font-semibold text-slate-400">Contract Addresses</span>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 w-fit">
              Stellar Testnet
            </span>
          </div>
          <div className="space-y-2 text-xs font-mono text-slate-500 break-all">
            <div>
              <span className="text-slate-400">SAVE Token: </span>
              {TOKEN_CONTRACT_ID}
            </div>
            <div>
              <span className="text-slate-400">Savings: </span>
              {SAVINGS_CONTRACT_ID}
            </div>
            <div>
              <span className="text-slate-400">Rewards: </span>
              {REWARDS_CONTRACT_ID}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  );
}
