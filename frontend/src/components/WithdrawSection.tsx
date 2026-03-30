import { useEffect, useState } from "react";
import { useWallet } from "../contexts/WalletContext";

const SAVINGS_CONTRACT_ID = import.meta.env.VITE_SAVINGS_CONTRACT_ID as string;

interface SavingsRecord {
  amount: bigint;
  start_ledger: number;
  lock_period: number;
  is_active: boolean;
}

function formatSave(amount: bigint): string {
  return (Number(amount) / 10_000_000).toFixed(2);
}

function ledgersToDate(startLedger: number, lockPeriod: number): string {
  const unlockLedger = startLedger + lockPeriod;
  // Approximate: 5s per ledger, testnet genesis ~2024-01-01
  const approxMs = unlockLedger * 5 * 1000;
  const d = new Date(Date.now() + approxMs - Date.now());
  return d.toLocaleDateString();
}

function Countdown({ remainingLedgers }: { remainingLedgers: number }) {
  const totalSeconds = remainingLedgers * 5;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  return (
    <div className="flex gap-4 justify-center">
      {[["Days", days], ["Hours", hours], ["Mins", mins]].map(([label, val]) => (
        <div key={label as string} className="text-center">
          <div className="text-3xl font-bold text-white">{String(val).padStart(2, "0")}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

interface WithdrawSectionProps {
  onWithdrew?: () => void;
}

export default function WithdrawSection({ onWithdrew }: WithdrawSectionProps) {
  const { isConnected, address, signTransaction } = useWallet();
  const [savings, setSavings] = useState<SavingsRecord | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;

    const fetchSavings = async () => {
      try {
        const { SorobanRpc, TransactionBuilder, Networks, BASE_FEE, Contract, Address } =
          await import("@stellar/stellar-sdk");
        const server = new SorobanRpc.Server(import.meta.env.VITE_RPC_URL, { allowHttp: false });
        const contract = new Contract(SAVINGS_CONTRACT_ID);

        // Use a dummy account for simulation
        const faketAccount = await server.getAccount(address);
        const getTx = new TransactionBuilder(faketAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(contract.call("get_savings", new Address(address).toScVal()))
          .setTimeout(30)
          .build();

        const sim = await server.simulateTransaction(getTx);
        if (SorobanRpc.Api.isSimulationError(sim)) return;

        const { scValToNative } = await import("@stellar/stellar-sdk");
        const retVal = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
        if (retVal) {
          const record = scValToNative(retVal) as SavingsRecord;
          setSavings(record);

          // get time remaining
          const remTx = new TransactionBuilder(faketAccount, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET,
          })
            .addOperation(contract.call("get_time_remaining", new Address(address).toScVal()))
            .setTimeout(30)
            .build();
          const remSim = await server.simulateTransaction(remTx);
          if (!SorobanRpc.Api.isSimulationError(remSim)) {
            const remVal = (remSim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
            if (remVal) setRemaining(Number(scValToNative(remVal)));
          }
        }
      } catch {
        // ignore fetch errors silently
      }
    };

    fetchSavings();
  }, [isConnected, address]);

  const handleWithdraw = async () => {
    if (!isConnected || !address) return;
    setLoading(true);
    setStatus(null);

    try {
      const { SorobanRpc, TransactionBuilder, Networks, BASE_FEE, Contract, Address } =
        await import("@stellar/stellar-sdk");
      const server = new SorobanRpc.Server(import.meta.env.VITE_RPC_URL, { allowHttp: false });
      const account = await server.getAccount(address);
      const contract = new Contract(SAVINGS_CONTRACT_ID);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("withdraw", new Address(address).toScVal()))
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);
      const signed = await signTransaction(prepared.toXDR());
      await server.sendTransaction(TransactionBuilder.fromXDR(signed, Networks.TESTNET));

      setStatus("✅ Withdrawn & rewards claimed!");
      setSavings(null);
      setRemaining(0);
      onWithdrew?.();
    } catch (err: unknown) {
      setStatus(`❌ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Withdraw & Claim</h2>
        <div className="bg-slate-800 rounded-2xl p-5 text-slate-400 text-center text-sm">
          Connect your wallet to see your savings.
        </div>
      </section>
    );
  }

  if (!savings || !savings.is_active) {
    return (
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Withdraw & Claim</h2>
        <div className="bg-slate-800 rounded-2xl p-5 text-slate-400 text-center text-sm">
          No active savings found.
        </div>
      </section>
    );
  }

  const expectedReward = (Number(savings.amount) * 5 * (savings.lock_period)) / (100 * 100_000);
  const isUnlocked = remaining === 0;

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">Withdraw & Claim</h2>
      <div className="bg-slate-800 rounded-2xl p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-400">Locked Amount</div>
            <div className="text-lg font-bold text-white">{formatSave(savings.amount)} SAVE</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Expected Reward</div>
            <div className="text-lg font-bold text-emerald-400">
              +{(expectedReward / 10_000_000).toFixed(4)} SAVE
            </div>
          </div>
        </div>

        {!isUnlocked && (
          <div>
            <p className="text-sm text-slate-400 text-center mb-3">Unlocks in</p>
            <Countdown remainingLedgers={remaining} />
          </div>
        )}

        {isUnlocked && (
          <p className="text-center text-emerald-400 font-semibold text-sm">
            ✅ Savings unlocked! Ready to withdraw.
          </p>
        )}

        <button
          onClick={handleWithdraw}
          disabled={loading || !isUnlocked}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
        >
          {loading ? "Processing..." : "Withdraw & Claim Reward"}
        </button>

        {status && <p className="text-sm text-slate-300 text-center">{status}</p>}
      </div>
    </section>
  );
}
