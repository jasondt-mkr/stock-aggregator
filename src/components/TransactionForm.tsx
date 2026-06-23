import { useState, useRef, useEffect } from 'react';
import { TransactionType } from '@/utils/ledger';
import { X, Search, Loader2 } from 'lucide-react';

interface Props {
  onSubmit: (tx: { ticker: string; broker: string; type: TransactionType; lots: number; price: number }) => Promise<void>;
  isLoading: boolean;
  onClose: () => void;
}

const ALLOWED_BROKERS = ["Bareksa", "Ajaib", "Stockbit"];

function AsyncTickerCombobox({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{symbol: string, name: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!search || search.length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${search}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [search]);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input 
          type="text"
          className="w-full h-10 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-900 focus:border-transparent transition-all uppercase"
          placeholder="Search stock..."
          value={isOpen ? search : value}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setSearch(val);
            onChange(val); // Update form state too
            setIsOpen(true);
          }}
          onFocus={() => {
            setSearch(value);
            setIsOpen(true);
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
          {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </div>
      </div>
      
      {isOpen && (search.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-md max-h-48 overflow-auto py-1">
          {isSearching ? (
            <div className="px-3 py-2 text-sm text-zinc-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-500">No stocks found. Press enter to use "{search}" anyway.</div>
          ) : (
            results.map((opt) => (
              <button
                key={opt.symbol}
                type="button"
                className="w-full flex flex-col text-left px-3 py-2 hover:bg-zinc-100 transition-colors"
                onClick={() => {
                  onChange(opt.symbol);
                  setSearch(opt.symbol);
                  setIsOpen(false);
                }}
              >
                <span className="text-sm font-semibold text-zinc-900">{opt.symbol}</span>
                <span className="text-xs text-zinc-500 truncate">{opt.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TransactionForm({ onSubmit, isLoading, onClose }: Props) {
  const [ticker, setTicker] = useState('');
  const [broker, setBroker] = useState(ALLOWED_BROKERS[0]); // Default to first
  const [type, setType] = useState<TransactionType>('BUY');
  const [lots, setLots] = useState('');
  
  // Price states for auto-formatting
  const [rawPrice, setRawPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');

  const [error, setError] = useState('');

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setRawPrice('');
      setDisplayPrice('');
      return;
    }
    setRawPrice(numericValue);
    setDisplayPrice(new Intl.NumberFormat('id-ID').format(Number(numericValue)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ticker || !broker || !lots || !rawPrice) {
      setError('All fields are required.');
      return;
    }

    const numLots = Number(lots);
    const numPrice = Number(rawPrice);

    if (numLots <= 0 || numPrice <= 0) {
      setError('Volume and Price must be strictly positive.');
      return;
    }

    try {
      await onSubmit({
        ticker: ticker.toUpperCase(),
        broker,
        type,
        lots: numLots,
        price: numPrice
      });
    } catch (err: any) {
      setError(err.message || 'Failed to sync transaction.');
    }
  };

  return (
    <div className="bg-zinc-950/50 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-zinc-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Log Transaction</h2>
          <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-2 block">Action</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-lg">
              <button
                type="button"
                onClick={() => setType('BUY')}
                className={`py-1.5 text-sm font-medium rounded-md transition-all ${
                  type === 'BUY' 
                    ? 'bg-white text-zinc-700 shadow-sm border border-zinc-200' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setType('SELL')}
                className={`py-1.5 text-sm font-medium rounded-md transition-all ${
                  type === 'SELL' 
                    ? 'bg-white text-rose-700 shadow-sm border border-zinc-200' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-2 block">Ticker</label>
              <AsyncTickerCombobox value={ticker} onChange={setTicker} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-2 block">Broker</label>
              <div className="relative">
                <select
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  className="w-full h-10 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-900 focus:border-transparent transition-all appearance-none"
                >
                  {ALLOWED_BROKERS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-2 block">Lots (Volume)</label>
              <input 
                type="number" 
                value={lots} 
                onChange={(e) => setLots(e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-900 focus:border-transparent transition-all tabular-nums"
                placeholder="100"
                min="1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-2 block">Price per Share</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium pointer-events-none">Rp</div>
                <input 
                  type="text" 
                  value={displayPrice} 
                  onChange={handlePriceChange}
                  className="w-full h-10 rounded-md border border-zinc-300 bg-transparent pl-8 pr-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-900 focus:border-transparent transition-all tabular-nums"
                  placeholder="9.500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 mt-2 border-t border-zinc-100">
            <button 
              type="button" 
              onClick={onClose}
              className="h-10 px-4 rounded-md border border-zinc-300 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="h-10 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
