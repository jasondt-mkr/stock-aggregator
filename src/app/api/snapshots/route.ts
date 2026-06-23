import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { processLedger, Holding, Transaction } from '@/utils/ledger';
import { createClient } from '@supabase/supabase-js';

// Initialize a server-side Supabase client (using anon key since this is MVP and RLS is likely off/anon-allowed)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const yahooFinance = new YahooFinance();

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolio_id');
    const isCron = searchParams.get('cron') === 'true';

    if (!portfolioId && !isCron) {
      return NextResponse.json({ error: 'portfolio_id is required unless triggered by cron' }, { status: 400 });
    }

    // 1. Fetch transactions (all or for specific portfolio)
    let query = supabase.from('transactions').select('*').order('date', { ascending: true });
    if (!isCron && portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }
    
    const { data: transactions, error: txError } = await query;

    if (txError) throw txError;
    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ message: 'No transactions found for this portfolio' });
    }

    const txs = transactions as Transaction[];

    // 2. Identify all unique tickers and fetch today's closing prices
    const uniqueTickers = Array.from(new Set(txs.map(t => t.ticker)));
    const queryTickers = uniqueTickers.map(t => `${t}.JK`);
    const quotes = await yahooFinance.quote(queryTickers);
    const quotesArray: any[] = Array.isArray(quotes) ? quotes : [quotes];
    
    const priceMap: Record<string, number> = {};
    quotesArray.forEach(q => {
      const originalTicker = q.symbol.replace('.JK', '');
      priceMap[originalTicker] = q.regularMarketPrice || 0;
    });

    // 3. Helper to calculate snapshot for a specific list of transactions
    const calculateSnapshot = (filteredTxs: Transaction[]) => {
      const holdings = processLedger(filteredTxs);
      let totalInvested = 0;
      let currentValue = 0;
      let realizedPnl = 0;

      holdings.forEach(h => {
        totalInvested += h.totalInvested;
        realizedPnl += h.realizedPnl;
        const livePrice = priceMap[h.ticker];
        if (livePrice && h.lots > 0) {
          currentValue += h.lots * 100 * livePrice;
        }
      });

      return { totalInvested, currentValue, realizedPnl };
    };

    const snapshotsToInsert: any[] = [];
    const todayDate = new Date().toISOString().split('T')[0];

    // 4. Calculate snapshots by grouping by portfolio_id
    const uniquePortfolios = Array.from(new Set(txs.map(t => t.portfolio_id)));
    
    uniquePortfolios.forEach(pId => {
      const pTxs = txs.filter(t => t.portfolio_id === pId);

      // Overall snapshot for this portfolio
      const overall = calculateSnapshot(pTxs);
      snapshotsToInsert.push({
        portfolio_id: pId,
        date: todayDate,
        broker: 'ALL',
        total_invested: overall.totalInvested,
        current_value: overall.currentValue,
        realized_pnl: overall.realizedPnl
      });

      // Individual broker snapshots for this portfolio
      const uniqueBrokers = Array.from(new Set(pTxs.map(t => t.broker)));
      uniqueBrokers.forEach(broker => {
        const brokerTxs = pTxs.filter(t => t.broker === broker);
        const brokerMetrics = calculateSnapshot(brokerTxs);
        snapshotsToInsert.push({
          portfolio_id: pId,
          date: todayDate,
          broker: broker,
          total_invested: brokerMetrics.totalInvested,
          current_value: brokerMetrics.currentValue,
          realized_pnl: brokerMetrics.realizedPnl
        });
      });
    });

    // 6. UPSERT into Supabase
    // Requires a unique constraint on (portfolio_id, date, broker)
    const { error: insertError } = await supabase
      .from('daily_snapshots')
      .upsert(snapshotsToInsert, { onConflict: 'portfolio_id, date, broker' });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to upsert snapshots: ${insertError.message}`);
    }

    return NextResponse.json({ success: true, snapshots: snapshotsToInsert });
  } catch (error: any) {
    console.error('Error generating snapshot:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
