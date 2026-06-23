import { Holding } from '@/utils/ledger';

interface Props {
  holdings: Holding[];
  isLoading: boolean;
}

export default function PortfolioOverview({ holdings, isLoading }: Props) {
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const currentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const unrealizedPnl = currentValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;
  
  const totalRealizedPnl = holdings.reduce((sum, h) => sum + h.realizedPnl, 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Card 1 */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
        <h3 className="text-zinc-500 text-sm font-medium whitespace-nowrap truncate">Total Invested</h3>
        <div className="text-2xl font-bold tabular-nums text-zinc-900 mt-2 truncate">
          {isLoading && holdings.length === 0 ? '...' : formatCurrency(totalInvested)}
        </div>
      </div>
      
      {/* Card 2 */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
        <h3 className="text-zinc-500 text-sm font-medium whitespace-nowrap truncate">Current Value</h3>
        <div className="text-2xl font-bold tabular-nums text-zinc-900 mt-2 truncate">
          {isLoading ? '...' : formatCurrency(currentValue)}
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
        <h3 className="text-zinc-500 text-sm font-medium whitespace-nowrap truncate">Unrealized PnL (Value)</h3>
        <div className={`text-2xl font-bold tabular-nums mt-2 truncate ${unrealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isLoading ? '...' : `${unrealizedPnl >= 0 ? '+' : ''}${formatCurrency(unrealizedPnl)}`}
        </div>
      </div>

      {/* Card 4 */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
        <h3 className="text-zinc-500 text-sm font-medium whitespace-nowrap truncate">Unrealized PnL (%)</h3>
        <div className={`text-2xl font-bold tabular-nums mt-2 truncate ${unrealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isLoading ? '...' : `${unrealizedPnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`}
        </div>
      </div>

      {/* Card 5 */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
        <h3 className="text-zinc-500 text-sm font-medium whitespace-nowrap truncate">Total Realized PnL</h3>
        <div className={`text-2xl font-bold tabular-nums mt-2 truncate ${totalRealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isLoading && holdings.length === 0 ? '...' : `${totalRealizedPnl >= 0 ? '+' : ''}${formatCurrency(totalRealizedPnl)}`}
        </div>
      </div>
    </div>
  );
}
