import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { NETWORK_PASSPHRASE } from "../config";
import { rpc as rpcSdk } from "@stellar/stellar-sdk";

const LOCK_PERIODS: { label: string; ledgers: number }[] = [
  { label: "1 Week",   ledgers: 120960  },  // 7 days  × 86400s / 5s per ledger
  { label: "1 Month",  ledgers: 483840  },  // 28 days × 86400s / 5s per ledger
  { label: "3 Months", ledgers: 1451520 },  // 84 days × 86400s / 5s per ledger
];

const SAVINGS_CONTRACT_ID = import.meta.env.VITE_SAVINGS_CONTRACT_ID as string;
const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID as string;

interface DepositFormProps {
  onDeposited?: () => void;
  activeSavings?: { amount: bigint; timeRemaining: number } | null;
}

export default function DepositForm({ onDeposited, activeSavings }: DepositFormProps) {
  const { isConnected, signTransaction, address } = useWallet();
  const [amount, setAmount] = useState("");
  const [lockPeriod, setLockPeriod] = useState(LOCK_PERIODS[0]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      setStatus("Please connect your wallet first.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setStatus("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const { rpc, TransactionBuilder, BASE_FEE, Contract, nativeToScVal, Address } =
        await import("@stellar/stellar-sdk");

      const server = new rpc.Server(import.meta.env.VITE_RPC_URL, { allowHttp: false });
      const latestLedger = await server.getLatestLedger();
      const expirationLedger = latestLedger.sequence + lockPeriod.ledgers + 500;
      const amountStroops = BigInt(Math.round(amountNum * 10_000_000));

      // Helper: poll until tx confirmed
      const waitForTx = async (hash: string) => {
        for (let i = 0; i < 30; i++) {
          const result = await server.getTransaction(hash);
          if (result.status === "SUCCESS") return result;
          if (result.status === "FAILED") throw new Error(`Transaction failed: ${hash}`);
          await new Promise((r) => setTimeout(r, 2000));
        }
        throw new Error("Transaction timed out");
      };

      // Pre-check: verify user has enough SAVE balance
      setStatus("Checking SAVE balance...");
      const { scValToNative } = await import("@stellar/stellar-sdk");
      const tokenCheck = new Contract(TOKEN_CONTRACT_ID);
      const accountForCheck = await server.getAccount(address);
      const balanceTx = new TransactionBuilder(accountForCheck, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(tokenCheck.call("balance", new Address(address).toScVal()))
        .setTimeout(30)
        .build();
      const balanceSim = await server.simulateTransaction(balanceTx);
      if (!rpcSdk.Api.isSimulationError(balanceSim)) {
        const retVal = (balanceSim as rpcSdk.Api.SimulateTransactionSuccessResponse).result?.retval;
        if (retVal) {
          const bal = scValToNative(retVal) as bigint;
          if (bal < amountStroops) {
            throw new Error(
              `Insufficient SAVE balance. You have ${(Number(bal) / 10_000_000).toFixed(2)} SAVE but need ${amountNum} SAVE. Use the faucet to get tokens first.`
            );
          }
        }
      }

      // Step 1: Approve token
      setStatus("Step 1/2: Approving token allowance...");
      const account = await server.getAccount(address);
      const tokenContract = new Contract(TOKEN_CONTRACT_ID);
      const approveTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          tokenContract.call(
            "approve",
            new Address(address).toScVal(),
            new Address(SAVINGS_CONTRACT_ID).toScVal(),
            nativeToScVal(amountStroops, { type: "i128" }),
            nativeToScVal(expirationLedger, { type: "u32" })
          )
        )
        .setTimeout(30)
        .build();

      const preparedApprove = await server.prepareTransaction(approveTx);
      const signedApprove = await signTransaction(preparedApprove.toXDR());
      const approveSubmit = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedApprove, NETWORK_PASSPHRASE)
      );
      if (approveSubmit.status === "ERROR") throw new Error("Approve transaction rejected");
      await waitForTx(approveSubmit.hash);

      // Verify allowance was actually set
      const allowanceCheckAccount = await server.getAccount(address);
      const allowanceTx = new TransactionBuilder(allowanceCheckAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new Contract(TOKEN_CONTRACT_ID).call(
            "allowance",
            new Address(address).toScVal(),
            new Address(SAVINGS_CONTRACT_ID).toScVal()
          )
        )
        .setTimeout(30)
        .build();
      const allowanceSim = await server.simulateTransaction(allowanceTx);
      if (!rpcSdk.Api.isSimulationError(allowanceSim)) {
        const aRetVal = (allowanceSim as rpcSdk.Api.SimulateTransactionSuccessResponse).result?.retval;
        if (aRetVal) {
          const allowedAmt = scValToNative(aRetVal) as bigint;
          if (allowedAmt < amountStroops) {
            throw new Error("Approve did not set allowance correctly. Please try again.");
          }
        }
      }

      // Step 2: Deposit (fetch fresh account after approve confirmed)
      setStatus("Step 2/2: Locking funds...");
      const account2 = await server.getAccount(address);
      const savingsContract = new Contract(SAVINGS_CONTRACT_ID);
      const depositTx = new TransactionBuilder(account2, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          savingsContract.call(
            "deposit",
            new Address(address).toScVal(),
            nativeToScVal(amountStroops, { type: "i128" }),
            nativeToScVal(lockPeriod.ledgers, { type: "u32" })
          )
        )
        .setTimeout(30)
        .build();

      const preparedDeposit = await server.prepareTransaction(depositTx);
      const signedDeposit = await signTransaction(preparedDeposit.toXDR());
      const depositSubmit = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedDeposit, NETWORK_PASSPHRASE)
      );
      if (depositSubmit.status === "ERROR") throw new Error("Deposit transaction rejected");
      await waitForTx(depositSubmit.hash);

      setStatus("✅ Funds locked successfully!");
      setAmount("");
      onDeposited?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.includes("WasmVm") || msg.includes("InvalidAction")
        ? "Contract execution failed. Make sure you have enough SAVE tokens (use the faucet) and no active lock already exists."
        : msg.includes("allowance expired") || msg.includes("allowance exceeded")
        ? "Token allowance issue. Please try the deposit again."
        : msg;
      setStatus(`❌ ${friendly}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">Deposit & Lock</h2>
      {activeSavings ? (
        <div className="bg-slate-800 rounded-2xl p-5 space-y-4 text-center">
          <div className="py-4">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-slate-300 font-semibold">Active Lock</p>
            <p className="text-2xl font-bold text-white mt-2">
              {(Number(activeSavings.amount) / 10_000_000).toFixed(2)} SAVE
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {activeSavings.timeRemaining > 0
                ? `Unlocks in ~${Math.round((activeSavings.timeRemaining * 5) / 86400)} day(s)`
                : "✅ Ready to withdraw!"}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Withdraw your current savings to start a new lock.
          </p>
        </div>
      ) : (
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-300">
          <span className="font-semibold">⚠️ SAVE tokens required:</span> You need SAVE tokens before depositing. Use the <span className="font-semibold">Token Faucet</span> below to get 1000 SAVE for free.
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Amount (SAVE)</label>
          <input
            type="number"
            min="0"
            step="0.0000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Lock Period</label>
          <div className="grid grid-cols-3 gap-2">
            {LOCK_PERIODS.map((p) => (
              <button
                key={p.ledgers}
                onClick={() => setLockPeriod(p)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  lockPeriod.ledgers === p.ledgers
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={loading || !isConnected}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
        >
          {loading ? "Processing..." : "Approve & Lock"}
        </button>

        {status && (
          <p className="text-sm text-slate-300 text-center">{status}</p>
        )}
      </div>
      )}
    </section>
  );
}
