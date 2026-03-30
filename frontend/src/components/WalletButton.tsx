import { useWallet } from "../contexts/WalletContext";

function truncate(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function WalletButton() {
  const { address, isConnected, connect, disconnect } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
      <span className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-mono text-center">
        {truncate(address!)}
      </span>
      <button
        onClick={disconnect}
        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}
