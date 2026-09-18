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
    const results = await yahooFinance.search(ticker, { newsCount: 5 });
    return NextResponse.json({ news: results.news });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to fetch news', details: error.message }, { status: 500 });
  }
}
