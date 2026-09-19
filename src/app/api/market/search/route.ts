import { NextResponse } from 'next/server';
import yahooFinanceStatic from 'yahoo-finance2';
const YahooFinanceClass = (yahooFinanceStatic as any).default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const results = await yahooFinance.search(query, {
      newsCount: 0,
    });
    
    // Filter out some noise if necessary, but Yahoo search usually brings equity first
    const quotes = results.quotes
      .filter((q: any) => q.isYahooFinance)
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname,
        exchange: q.exchDisp,
        type: q.quoteType,
      }));

    return NextResponse.json({ quotes });
  } catch (error: any) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Failed to search', details: error.message }, { status: 500 });
  }
}
