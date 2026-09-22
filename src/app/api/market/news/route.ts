import { NextResponse } from 'next/server';
import yahooFinanceStatic from 'yahoo-finance2';
const YahooFinanceClass = (yahooFinanceStatic as any).default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    // Yahoo Finance often doesn't return news for .NS or .BO suffixes directly.
    const searchTicker = ticker.replace('.NS', '').replace('.BO', '');
    const results = await yahooFinance.search(searchTicker, { newsCount: 5 });
    return NextResponse.json({ news: results.news });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to fetch news', details: error.message }, { status: 500 });
  }
}
