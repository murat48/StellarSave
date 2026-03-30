import { useState, useEffect, useCallback } from "react";
import { WalletProvider } from "./contexts/WalletContext";
import { useWallet } from "./contexts/WalletContext";
import WalletButton from "./components/WalletButton";
import Dashboard from "./components/Dashboard";
import DepositForm from "./components/DepositForm";
import WithdrawSection from "./components/WithdrawSection";
import TokenFaucet from "./components/TokenFaucet";
import {
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import "./index.css";

const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID ?? "Not deployed";
const SAVINGS_CONTRACT_ID = import.meta.env.VITE_SAVINGS_CONTRACT_ID ?? "Not deployed";
const REWARDS_CONTRACT_ID = import.meta.env.VITE_REWARDS_CONTRACT_ID ?? "Not deployed";
const RPC_URL = import.meta.env.VITE_RPC_URL as string;

interface SavingsRecord {
  amount: bigint;
  start_ledger: number;
  lock_period: number;
  is_active: boolean;
}

const server = new rpc.Server(RPC_URL, { allowHttp: false });

async function simulateRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourceAddress: string
): Promise<unknown> {
  try {
    const contract = new Contract(contractId);
    const account = await server.getAccount(sourceAddress);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) return null;
    const retVal = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
    return retVal ? scValToNative(retVal) : null;
  } catch {
    return null;
  }
}

function AppInner() {
  const { address, isConnected } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingsRecord, setSavingsRecord] = useState<SavingsRecord | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [apy, setApy] = useState(5);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const fetchData = useCallback(async () => {
    if (!isConnected || !address) {
      setSavingsRecord(null);
      setTimeRemaining(0);
      return;
    }
    const addrScVal = new Address(address).toScVal();
    const savings = await simulateRead(SAVINGS_CONTRACT_ID, "get_savings", [addrScVal], address);
    const rec = (savings as SavingsRecord | null) ?? null;
    setSavingsRecord(rec);
    if (rec?.is_active) {
      const remaining = await simulateRead(
        SAVINGS_CONTRACT_ID,
        "get_time_remaining",
        [addrScVal],
        address
      );
      setTimeRemaining((remaining as number) ?? 0);
    } else {
      setTimeRemaining(0);
    }
    const apyValue = await simulateRead(REWARDS_CONTRACT_ID, "get_apy", [], address);
    setApy((apyValue as number) ?? 5);
  }, [address, isConnected]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

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
          currentSavings={savingsRecord?.is_active ? Number(savingsRecord.amount) : 0}
          timeRemainingLedgers={timeRemaining}
          expectedReward={
            savingsRecord?.is_active
              ? Math.floor(
                  (Number(savingsRecord.amount) * 5 * savingsRecord.lock_period) /
                    (100 * 100_000)
                )
              : 0
          }
          apy={apy}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepositForm
            onDeposited={() => { handleRefresh(); void fetchData(); }}
            activeSavings={
              savingsRecord?.is_active
                ? { amount: savingsRecord.amount, timeRemaining }
                : null
            }
          />
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
