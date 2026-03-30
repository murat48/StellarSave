interface DashboardProps {
  currentSavings: number;
  timeRemainingLedgers: number;
  expectedReward: number;
  apy: number;
}

function formatSave(amount: number): string {
  return (amount / 10_000_000).toFixed(2);
}

function ledgersToTime(ledgers: number): string {
  // ~5 seconds per ledger on Stellar
  const seconds = ledgers * 5;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function Dashboard({
  currentSavings,
  timeRemainingLedgers,
  expectedReward,
  apy,
}: DashboardProps) {
  const cards = [
    {
      label: "Current Savings",
      value: `${formatSave(currentSavings)} SAVE`,
      icon: "💰",
      color: "from-indigo-600 to-indigo-800",
    },
    {
      label: "Time Remaining",
      value: timeRemainingLedgers > 0 ? ledgersToTime(timeRemainingLedgers) : "Unlocked",
      icon: "⏳",
      color: "from-violet-600 to-violet-800",
    },
    {
      label: "Expected Reward",
      value: `${formatSave(expectedReward)} SAVE`,
      icon: "🎁",
      color: "from-emerald-600 to-emerald-800",
    },
    {
      label: "APY",
      value: `${apy}%`,
      icon: "📈",
      color: "from-amber-500 to-amber-700",
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl bg-linear-to-br ${card.color} p-5 shadow-lg`}
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-sm text-white/70 font-medium">{card.label}</div>
            <div className="text-2xl font-bold text-white mt-1">{card.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
