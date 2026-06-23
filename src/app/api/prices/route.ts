import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get('tickers');

  if (!tickersParam) {
    return NextResponse.json({ error: 'Tickers parameter is required' }, { status: 400 });
  }

  const tickers = tickersParam.split(',').map((t) => t.trim().toUpperCase());
  const results: Record<string, number> = {};

  try {
    // Yahoo Finance uses .JK for Indonesian stocks
    const queryTickers = tickers.map((t) => `${t}.JK`);
    
    const quotes = await yahooFinance.quote(queryTickers);
    
    // Yahoo finance returns an array if multiple, or a single object if one ticker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotesArray: any[] = Array.isArray(quotes) ? quotes : [quotes];
    
    quotesArray.forEach((quote) => {
      // Remove .JK to map back to original ticker
      const originalTicker = quote.symbol.replace('.JK', '');
      results[originalTicker] = quote.regularMarketPrice || 0;
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching prices from Yahoo Finance:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
