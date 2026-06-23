import { Holding } from '@/utils/ledger';
import { PieChart, Plus } from 'lucide-react';

interface Props {
  holdings: Holding[];
  isLoading: boolean;
  onAddClick: () => void;
}

export default function HoldingsTable({ holdings, isLoading, onAddClick }: Props) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  if (holdings.length === 0) {
    return (
      <div className="border-2 border-dashed border-zinc-200 rounded-xl p-12 text-center bg-white">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
            <PieChart size={24} />
          </div>
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 mb-1">No holdings yet.</h3>
        <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
          Log your first buy or sell transaction to see your portfolio metrics and live market data.
        </p>
        <button 
          onClick={onAddClick}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Transaction
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs">Asset</th>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Lots</th>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Avg Buy</th>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Current Price</th>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Total Cost</th>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Market Value</th>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Unrealized PnL</th>
              <th className="py-3 px-4 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Realized PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {holdings.map((h) => {
              const currentPrice = h.lots > 0 ? (h.currentValue / (h.lots * 100)) : 0;
              const unPnlColorClass = h.unrealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600';
              const unPnlBgClass = h.unrealizedPnl >= 0 ? 'bg-zinc-50 text-zinc-700' : 'bg-rose-50 text-rose-700';
              
              const rePnlColorClass = h.realizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600';
              
              return (
                <tr key={h.ticker} className={`transition-colors ${h.lots === 0 ? 'bg-zinc-50/50 opacity-70 hover:opacity-100' : 'hover:bg-zinc-50'}`}>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-zinc-900">{h.ticker}</span>
                    {h.lots === 0 && <span className="ml-2 text-xs text-zinc-400 font-normal border border-zinc-200 rounded px-1.5 py-0.5">SOLD</span>}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-700">
                    {h.lots.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-500">
                    {h.lots > 0 ? formatCurrency(h.averageBuyPrice) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-700 font-medium">
                    {h.lots === 0 ? '-' : isLoading ? <span className="text-zinc-400">Syncing...</span> : (currentPrice > 0 ? formatCurrency(currentPrice) : '-')}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-500">
                    {h.lots > 0 ? formatCurrency(h.totalInvested) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold text-zinc-900">
                    {h.lots > 0 ? formatCurrency(h.currentValue) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {h.lots > 0 ? (
                      <div className={`font-semibold flex items-center justify-end gap-2 ${unPnlColorClass}`}>
                        {h.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(h.unrealizedPnl)}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${unPnlBgClass}`}>
                          {h.unrealizedPnl >= 0 ? '+' : ''}{h.unrealizedPnlPercent.toFixed(2)}%
                        </span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {h.realizedPnl !== 0 ? (
                      <span className={`font-semibold ${rePnlColorClass}`}>
                        {h.realizedPnl >= 0 ? '+' : ''}{formatCurrency(h.realizedPnl)}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
