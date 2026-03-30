import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";

const LOCK_PERIODS: { label: string; ledgers: number }[] = [
  { label: "1 Week", ledgers: 50400 },
  { label: "1 Month", ledgers: 201600 },
  { label: "3 Months", ledgers: 604800 },
];

const SAVINGS_CONTRACT_ID = import.meta.env.VITE_SAVINGS_CONTRACT_ID as string;
const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID as string;

interface DepositFormProps {
  onDeposited?: () => void;
}

export default function DepositForm({ onDeposited }: DepositFormProps) {
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
      const { SorobanRpc, TransactionBuilder, Networks, BASE_FEE, Contract, nativeToScVal, Address } =
        await import("@stellar/stellar-sdk");

      const server = new SorobanRpc.Server(import.meta.env.VITE_RPC_URL, { allowHttp: false });
      const account = await server.getAccount(address);
      const amountStroops = BigInt(Math.round(amountNum * 10_000_000));

      // Step 1: Approve token
      setStatus("Step 1/2: Approving token allowance...");
      const tokenContract = new Contract(TOKEN_CONTRACT_ID);
      const approveTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          tokenContract.call(
            "approve",
            new Address(address).toScVal(),
            new Address(SAVINGS_CONTRACT_ID).toScVal(),
            nativeToScVal(amountStroops, { type: "i128" }),
            nativeToScVal(account.sequenceNumber() + 100000, { type: "u32" })
          )
        )
        .setTimeout(30)
        .build();

      const preparedApprove = await server.prepareTransaction(approveTx);
      const signedApprove = await signTransaction(preparedApprove.toXDR());
      const approveResult = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedApprove, Networks.TESTNET)
      );
      if (approveResult.status === "ERROR") throw new Error("Approve failed");

      // Step 2: Deposit
      setStatus("Step 2/2: Locking funds...");
      const account2 = await server.getAccount(address);
      const savingsContract = new Contract(SAVINGS_CONTRACT_ID);
      const depositTx = new TransactionBuilder(account2, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
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
      await server.sendTransaction(
        TransactionBuilder.fromXDR(signedDeposit, Networks.TESTNET)
      );

      setStatus("✅ Funds locked successfully!");
      setAmount("");
      onDeposited?.();
    } catch (err: unknown) {
      setStatus(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">Deposit & Lock</h2>
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
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
    </section>
  );
}
