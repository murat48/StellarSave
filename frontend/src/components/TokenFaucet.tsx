import { useEffect, useState } from "react";
import { useWallet } from "../contexts/WalletContext";

const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID as string;
const FAUCET_AMOUNT = BigInt(1000 * 10_000_000); // 1000 SAVE

export default function TokenFaucet() {
  const { isConnected, address, signTransaction } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!isConnected || !address) return;
    try {
      const { SorobanRpc, TransactionBuilder, Networks, BASE_FEE, Contract, Address, scValToNative } =
        await import("@stellar/stellar-sdk");
      const server = new SorobanRpc.Server(import.meta.env.VITE_RPC_URL, { allowHttp: false });
      const account = await server.getAccount(address);
      const contract = new Contract(TOKEN_CONTRACT_ID);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("balance", new Address(address).toScVal()))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (!SorobanRpc.Api.isSimulationError(sim)) {
        const retVal = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
        if (retVal) setBalance(BigInt(scValToNative(retVal) as number));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [isConnected, address]);

  const handleMint = async () => {
    if (!isConnected || !address) return;
    setLoading(true);
    setStatus(null);

    try {
      const { SorobanRpc, TransactionBuilder, Networks, BASE_FEE, Contract, Address, nativeToScVal } =
        await import("@stellar/stellar-sdk");
      const server = new SorobanRpc.Server(import.meta.env.VITE_RPC_URL, { allowHttp: false });
      const account = await server.getAccount(address);
      const contract = new Contract(TOKEN_CONTRACT_ID);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "mint",
            new Address(address).toScVal(),
            nativeToScVal(FAUCET_AMOUNT, { type: "i128" })
          )
        )
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);
      const signed = await signTransaction(prepared.toXDR());
      const response = await server.sendTransaction(
        TransactionBuilder.fromXDR(signed, Networks.TESTNET)
      );

      if (response.status === "ERROR") throw new Error("Mint transaction failed");

      setStatus("✅ 1000 SAVE tokens added to your wallet!");
      await fetchBalance();
    } catch (err: unknown) {
      setStatus(`❌ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">Test Faucet</h2>
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <div className="text-center">
          <div className="text-xs text-slate-400 mb-1">Your SAVE Balance</div>
          <div className="text-2xl font-bold text-white">
            {balance !== null ? (Number(balance) / 10_000_000).toFixed(2) : "—"} SAVE
          </div>
        </div>

        <button
          onClick={handleMint}
          disabled={loading || !isConnected}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
        >
          {loading ? "Minting..." : "Get Test SAVE Tokens"}
        </button>

        {status && <p className="text-sm text-slate-300 text-center">{status}</p>}

        <p className="text-xs text-slate-500 text-center">
          Testnet only — tokens have no real value
        </p>
      </div>
    </section>
  );
}
