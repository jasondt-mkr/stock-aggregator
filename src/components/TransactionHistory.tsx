import { Transaction } from '@/utils/ledger';

interface Props {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: Props) {
  if (transactions.length === 0) return null;

  // Show newest first
  const reversed = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('id-ID', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    }).format(new Date(dateString));
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm mt-8">
      <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
        <h3 className="font-semibold tracking-tight text-zinc-900">Activity Log</h3>
        <span className="text-xs text-zinc-500">{transactions.length} records</span>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
            <tr>
              <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs">Date & Time</th>
              <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs">Action</th>
              <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs">Ticker</th>
              <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs">Broker</th>
              <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Lots</th>
              <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Price</th>
              <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {reversed.map((tx) => (
              <tr key={tx.id} className="hover:bg-zinc-50 transition-colors">
                <td className="py-3 px-6 text-zinc-500 tabular-nums whitespace-nowrap">
                  {formatDate(tx.date)}
                </td>
                <td className="py-3 px-6">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tx.type === 'BUY' ? 'bg-zinc-100 text-zinc-700' : 'bg-rose-100 text-rose-700'}`}>
                    {tx.type}
                  </span>
                </td>
                <td className="py-3 px-6 font-semibold text-zinc-900">{tx.ticker}</td>
                <td className="py-3 px-6 text-emerald-600">{tx.broker}</td>
                <td className="py-3 px-6 text-right tabular-nums text-zinc-700">{tx.lots.toLocaleString('id-ID')}</td>
                <td className="py-3 px-6 text-right tabular-nums text-zinc-500">{formatCurrency(tx.price)}</td>
                <td className="py-3 px-6 text-right tabular-nums font-medium text-zinc-900">{formatCurrency(tx.price * tx.lots * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
