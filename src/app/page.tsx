"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { Transaction, processLedger, applyLivePrices, TransactionType } from '@/utils/ledger';
import PortfolioOverview from '@/components/PortfolioOverview';
import TransactionForm from '@/components/TransactionForm';
import HoldingsTable from '@/components/HoldingsTable';
import TransactionHistory from '@/components/TransactionHistory';
import DailyPerformance from '@/components/DailyPerformance';
import { RefreshCw, Plus } from 'lucide-react';

export default function Dashboard() {
  const [portfolioId, setPortfolioId] = useState<string>('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  
  const [activeTab, setActiveTab] = useState<string>('ALL');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPricesLoading, setIsPricesLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Derive unique brokers for the tabs
  const uniqueBrokers = useMemo(() => {
    const brokers = new Set(transactions.map(t => t.broker));
    return Array.from(brokers).sort();
  }, [transactions]);

  // Derive ALL holdings just to know which tickers to fetch prices for
  const allHoldings = useMemo(() => processLedger(transactions), [transactions]);

  // Derive active holdings based on the selected tab
  const activeTransactions = useMemo(() => {
    if (activeTab === 'ALL') return transactions;
    return transactions.filter(t => t.broker === activeTab);
  }, [transactions, activeTab]);

  const activeHoldings = useMemo(() => processLedger(activeTransactions), [activeTransactions]);

  // Finally, apply the fetched live prices to the active holdings
  const liveHoldings = useMemo(() => {
    return applyLivePrices(activeHoldings, priceMap);
  }, [activeHoldings, priceMap]);

  const loadPortfolio = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('portfolio_id', id)
        .order('date', { ascending: true });

      if (error) throw error;
      setTransactions(data as Transaction[]);
    } catch (err) {
      console.error('Error loading portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Menggunakan 'my-portfolio' agar selaras dengan data seed SQL yang baru saja dimasukkan
    const id = 'my-portfolio';
    setPortfolioId(id);
    loadPortfolio(id).then(() => setIsInitialized(true));
  }, []);

  const fetchPrices = useCallback(async () => {
    if (allHoldings.length === 0) return;
    setIsPricesLoading(true);
    try {
      const tickers = allHoldings.map(h => h.ticker).join(',');
      const res = await fetch(`/api/prices?tickers=${tickers}`);
      if (!res.ok) throw new Error('Failed to fetch prices');
      const prices = await res.json();
      setPriceMap(prices);
    } catch (err) {
      console.error('Error fetching prices:', err);
    } finally {
      setIsPricesLoading(false);
    }
  }, [allHoldings]);

  // Fetch prices automatically when transactions change (new ticker added)
  useEffect(() => {
    if (allHoldings.length > 0) {
      fetchPrices();
    } else {
      setPriceMap({});
    }
  }, [allHoldings.length, fetchPrices]); // Only re-run if number of unique holdings changes

  const handleAddTransaction = async (tx: { ticker: string; broker: string; type: TransactionType; lots: number; price: number }) => {
    if (!portfolioId) return;
    
    setIsLoading(true);
    try {
      const newTx = { ...tx, portfolio_id: portfolioId, date: new Date().toISOString() };
      const { data, error } = await supabase.from('transactions').insert([newTx]).select();
      
      if (error) throw error;

      if (data && data[0]) {
        setTransactions(prev => [...prev, data[0] as Transaction]);
        setIsModalOpen(false);
        // Automatically switch to the broker tab where the user just added a transaction
        // if they aren't on 'ALL' to avoid confusion.
        if (activeTab !== 'ALL' && activeTab !== tx.broker) {
          setActiveTab(tx.broker);
        }
      }
    } catch (err: unknown) {
      console.error('Error adding transaction:', err);
      const msg = err instanceof Error ? err.message : 'Error saving transaction';
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-zinc-50 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-zinc-200 bg-white/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="hidden md:block"></div>
          <div className="flex items-center gap-3 w-full justify-between md:justify-end">
            <button 
              onClick={fetchPrices} 
              disabled={isPricesLoading || allHoldings.length === 0} 
              className="flex items-center gap-2 h-9 px-4 rounded-md border border-zinc-200 bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-50 hover:text-zinc-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isPricesLoading ? 'animate-spin text-zinc-500' : 'text-zinc-500'} />
              Refresh
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Transaction
            </button>
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            
            {/* Broker Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === 'ALL' 
                    ? 'border-emerald-600 text-zinc-900' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
              >
                Overall Portfolio
              </button>
              {uniqueBrokers.map(broker => (
                <button
                  key={broker}
                  onClick={() => setActiveTab(broker)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === broker 
                      ? 'border-emerald-600 text-zinc-900' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  {broker}
                </button>
              ))}
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-6">
                {activeTab === 'ALL' ? 'Overall Metrics' : `${activeTab} Metrics`}
              </h2>
              <PortfolioOverview holdings={liveHoldings} isLoading={isPricesLoading} />
            </div>
            
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mb-4">
                {activeTab === 'ALL' ? 'All Holdings' : `${activeTab} Holdings`}
              </h2>
              <HoldingsTable holdings={liveHoldings} isLoading={isPricesLoading} onAddClick={() => setIsModalOpen(true)} />
            </div>

            <DailyPerformance portfolioId={portfolioId} activeBroker={activeTab} />

            <TransactionHistory transactions={activeTransactions} />
          </div>
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <TransactionForm 
          onSubmit={handleAddTransaction} 
          isLoading={isLoading} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}
