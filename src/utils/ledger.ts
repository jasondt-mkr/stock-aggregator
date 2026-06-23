export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: string;
  portfolio_id: string;
  ticker: string;
  broker: string;
  type: TransactionType;
  lots: number;
  price: number;
  date: string;
}

export interface Holding {
  ticker: string;
  lots: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentValue: number; // Initially 0, updated by live prices
  unrealizedPnl: number; // Initially 0, updated by live prices
  unrealizedPnlPercent: number; // Initially 0, updated by live prices
  realizedPnl: number; // Accumulated profit/loss from SELL transactions
}

export function processLedger(transactions: Transaction[]): Holding[] {
  // Sort transactions chronologically (oldest first)
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const holdingsMap = new Map<string, Holding>();

  for (const tx of sorted) {
    if (!holdingsMap.has(tx.ticker)) {
      holdingsMap.set(tx.ticker, {
        ticker: tx.ticker,
        lots: 0,
        averageBuyPrice: 0,
        totalInvested: 0,
        currentValue: 0,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        realizedPnl: 0,
      });
    }

    const holding = holdingsMap.get(tx.ticker)!;

    if (tx.type === 'BUY') {
      const prevTotalCost = holding.lots * holding.averageBuyPrice;
      const newCost = tx.lots * tx.price;
      const newTotalLots = holding.lots + tx.lots;
      
      holding.averageBuyPrice = newTotalLots > 0 ? (prevTotalCost + newCost) / newTotalLots : 0;
      holding.lots = newTotalLots;
    } else if (tx.type === 'SELL') {
      const soldLots = Math.min(holding.lots, tx.lots); // Safety check
      
      // Calculate Realized PnL: (Sell Price - Avg Buy Price) * Lots * 100
      const pnl = (tx.price - holding.averageBuyPrice) * soldLots * 100;
      holding.realizedPnl += pnl;

      holding.lots = Math.max(0, holding.lots - tx.lots); 
      // Average buy price remains unchanged on SELL
    }

    // Update total invested based on current net lots (Book Value)
    holding.totalInvested = holding.lots * 100 * holding.averageBuyPrice;
  }

  // Keep holdings that still have lots OR have a realized PnL history
  return Array.from(holdingsMap.values()).filter(h => h.lots > 0 || h.realizedPnl !== 0);
}

export function applyLivePrices(holdings: Holding[], prices: Record<string, number>): Holding[] {
  return holdings.map(h => {
    const livePrice = prices[h.ticker];
    if (livePrice === undefined || h.lots === 0) {
      return h; // No live price or 0 lots, return as is
    }

    const currentValue = h.lots * 100 * livePrice;
    const unrealizedPnl = currentValue - h.totalInvested;
    const unrealizedPnlPercent = h.totalInvested > 0 ? (unrealizedPnl / h.totalInvested) * 100 : 0;

    return {
      ...h,
      currentValue,
      unrealizedPnl,
      unrealizedPnlPercent
    };
  });
}
