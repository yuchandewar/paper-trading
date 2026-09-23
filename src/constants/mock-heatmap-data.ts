import { HeatmapIndex } from "@/types/heatmap.types";

export const MOCK_HEATMAP_DATA: HeatmapIndex[] = [
  {
    name: "NIFTY 50",
    changePercent: 1.2,
    marketCap: 150000000,
    sectors: [
      {
        name: "Financial Services",
        changePercent: 2.1,
        marketCap: 50000000,
        stocks: [
          { symbol: "HDFCBANK.NS", name: "HDFC Bank", changePercent: 2.5, marketCap: 12000000, price: 1500, volume: 1000000 },
          { symbol: "ICICIBANK.NS", name: "ICICI Bank", changePercent: 1.8, marketCap: 8000000, price: 1000, volume: 800000 },
          { symbol: "SBIN.NS", name: "State Bank of India", changePercent: -0.5, marketCap: 6000000, price: 750, volume: 500000 },
          { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", changePercent: 0.2, marketCap: 4000000, price: 1800, volume: 300000 },
          { symbol: "AXISBANK.NS", name: "Axis Bank", changePercent: 3.1, marketCap: 3500000, price: 1050, volume: 450000 },
        ]
      },
      {
        name: "Information Technology",
        changePercent: -1.5,
        marketCap: 40000000,
        stocks: [
          { symbol: "TCS.NS", name: "Tata Consultancy Services", changePercent: -1.2, marketCap: 14000000, price: 3800, volume: 200000 },
          { symbol: "INFY.NS", name: "Infosys", changePercent: -2.1, marketCap: 8000000, price: 1600, volume: 400000 },
          { symbol: "HCLTECH.NS", name: "HCL Technologies", changePercent: 0.5, marketCap: 4000000, price: 1300, volume: 150000 },
          { symbol: "WIPRO.NS", name: "Wipro", changePercent: -1.8, marketCap: 3000000, price: 500, volume: 300000 },
          { symbol: "TECHM.NS", name: "Tech Mahindra", changePercent: -0.9, marketCap: 2500000, price: 1200, volume: 100000 },
        ]
      },
      {
        name: "Oil & Gas",
        changePercent: 0.8,
        marketCap: 30000000,
        stocks: [
          { symbol: "RELIANCE.NS", name: "Reliance Industries", changePercent: 1.5, marketCap: 18000000, price: 2900, volume: 500000 },
          { symbol: "ONGC.NS", name: "Oil & Natural Gas Corp", changePercent: -0.2, marketCap: 4000000, price: 280, volume: 800000 },
          { symbol: "COALINDIA.NS", name: "Coal India", changePercent: 1.1, marketCap: 3000000, price: 450, volume: 600000 },
          { symbol: "NTPC.NS", name: "NTPC", changePercent: 0.5, marketCap: 2500000, price: 350, volume: 400000 },
          { symbol: "POWERGRID.NS", name: "Power Grid Corp", changePercent: -1.0, marketCap: 2500000, price: 300, volume: 350000 },
        ]
      },
      {
        name: "FMCG",
        changePercent: -0.3,
        marketCap: 15000000,
        stocks: [
          { symbol: "ITC.NS", name: "ITC", changePercent: -0.5, marketCap: 6000000, price: 420, volume: 1200000 },
          { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", changePercent: 0.2, marketCap: 5000000, price: 2400, volume: 250000 },
          { symbol: "NESTLEIND.NS", name: "Nestle India", changePercent: -1.1, marketCap: 2000000, price: 2600, volume: 50000 },
          { symbol: "BRITANNIA.NS", name: "Britannia Industries", changePercent: 0.8, marketCap: 1500000, price: 4800, volume: 60000 },
          { symbol: "TATACONSUM.NS", name: "Tata Consumer Products", changePercent: -1.5, marketCap: 1000000, price: 1100, volume: 150000 },
        ]
      },
      {
        name: "Automobile",
        changePercent: 3.5,
        marketCap: 15000000,
        stocks: [
          { symbol: "TATAMOTORS.NS", name: "Tata Motors", changePercent: 4.2, marketCap: 4000000, price: 1050, volume: 900000 },
          { symbol: "M&M.NS", name: "Mahindra & Mahindra", changePercent: 3.8, marketCap: 3500000, price: 1950, volume: 400000 },
          { symbol: "MARUTI.NS", name: "Maruti Suzuki", changePercent: 2.1, marketCap: 3000000, price: 11500, volume: 100000 },
          { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto", changePercent: 4.5, marketCap: 2500000, price: 8500, volume: 80000 },
          { symbol: "EICHERMOT.NS", name: "Eicher Motors", changePercent: 1.2, marketCap: 1500000, price: 4800, volume: 150000 },
        ]
      }
    ]
  },
  {
    name: "NIFTY NEXT 50",
    changePercent: -0.4,
    marketCap: 80000000,
    sectors: [
      {
        name: "Metals & Mining",
        changePercent: -2.1,
        marketCap: 15000000,
        stocks: [
          { symbol: "TATASTEEL.NS", name: "Tata Steel", changePercent: -3.2, marketCap: 3000000, price: 150, volume: 2000000 },
          { symbol: "HINDALCO.NS", name: "Hindalco", changePercent: -1.5, marketCap: 2500000, price: 600, volume: 800000 },
          { symbol: "JSWSTEEL.NS", name: "JSW Steel", changePercent: -2.8, marketCap: 2500000, price: 850, volume: 500000 },
          { symbol: "VEDL.NS", name: "Vedanta", changePercent: 0.5, marketCap: 2000000, price: 400, volume: 1200000 },
        ]
      },
      {
        name: "Healthcare",
        changePercent: 1.5,
        marketCap: 12000000,
        stocks: [
          { symbol: "SUNPHARMA.NS", name: "Sun Pharma", changePercent: 2.1, marketCap: 3500000, price: 1550, volume: 300000 },
          { symbol: "CIPLA.NS", name: "Cipla", changePercent: 1.2, marketCap: 2000000, price: 1400, volume: 200000 },
          { symbol: "DRREDDY.NS", name: "Dr Reddy's Labs", changePercent: 0.5, marketCap: 1800000, price: 6200, volume: 50000 },
          { symbol: "DIVISLAB.NS", name: "Divi's Labs", changePercent: -0.8, marketCap: 1500000, price: 3800, volume: 80000 },
        ]
      }
    ]
  }
];
