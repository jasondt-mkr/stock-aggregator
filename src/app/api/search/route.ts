import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const results = await yahooFinance.search(query, { newsCount: 0, quotesCount: 15 });
    
    // Filter strictly for Indonesian stocks (suffix .JK or exchange JKT)
    const idxStocks = results.quotes
      .filter((q: any) => q.symbol && (q.symbol.endsWith('.JK') || q.exchange === 'JKT'))
      .map((q: any) => ({
        symbol: q.symbol.replace('.JK', ''),
        name: q.shortname || q.longname || q.symbol
      }));

    // Remove duplicates if any
    const uniqueStocks = Array.from(new Map(idxStocks.map(item => [item.symbol, item])).values());

    return NextResponse.json(uniqueStocks);
  } catch (error) {
    console.error('Error searching Yahoo Finance:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
