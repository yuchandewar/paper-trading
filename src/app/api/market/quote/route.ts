import { NextResponse } from 'next/server';
import yahooFinanceStatic from 'yahoo-finance2';
const YahooFinanceClass = yahooFinanceStatic.default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const quote = await yahooFinance.quote(ticker);
    
    // Handle array case if it returns an array
    const q = Array.isArray(quote) ? quote[0] : quote;
    if (!q) throw new Error("Quote is missing or undefined");

    return NextResponse.json({
      ticker: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      open: q.regularMarketOpen,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      volume: q.regularMarketVolume,
      previousClose: q.regularMarketPreviousClose,
    });
  } catch (error: any) {
    console.error('Error fetching quote:', error);
    return NextResponse.json({ error: 'Failed to fetch quote', details: error.message }, { status: 500 });
  }
}
