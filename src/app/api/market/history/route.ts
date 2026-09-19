import { NextResponse } from 'next/server';
import yahooFinanceStatic from 'yahoo-finance2';
const YahooFinanceClass = (yahooFinanceStatic as any).default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const period1 = searchParams.get('period1') || '2023-01-01'; // Default start date

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const queryOptions = { period1, interval: '1d' as const };
    const chartResult = await yahooFinance.chart(ticker, queryOptions);
    
    // Format for lightweight-charts
    const chartData = chartResult.quotes
      .filter((item: any) => item.open != null && item.close != null)
      .map((item: any) => ({
        time: item.date.toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        value: item.volume, // lightweight charts sometimes use value for histogram
      }));

    // lightweight-charts needs strict ascending order with no duplicates
    const sortedChartData = chartData.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const uniqueData = Array.from(new Map(sortedChartData.map((item: any) => [item.time, item])).values());

    return NextResponse.json({ data: uniqueData });
  } catch (error: any) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json({ error: 'Failed to fetch historical data', details: error.message }, { status: 500 });
  }
}
