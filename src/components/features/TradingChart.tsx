"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from "lightweight-charts";

interface TradingChartProps {
  ticker: string;
}

type TimeFrame = "1D" | "1W" | "1M" | "6M" | "1Y";

export default function TradingChart({ ticker }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeFrame>("1Y");
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#333",
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: "#f0f3fa" },
        horzLines: { color: "#f0f3fa" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      }
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00d09c",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#00d09c",
      wickDownColor: "#ef5350",
    });
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      chart.applyOptions({ 
         width: chartContainerRef.current?.clientWidth,
         height: chartContainerRef.current?.clientHeight
      });
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!ticker || !seriesRef.current) return;
    
    setLoading(true);
    
    const date = new Date();
    let interval = "1d";
    
    switch (timeframe) {
      case "1D":
        date.setDate(date.getDate() - 1);
        interval = "5m";
        break;
      case "1W":
        date.setDate(date.getDate() - 7);
        interval = "15m";
        break;
      case "1M":
        date.setMonth(date.getMonth() - 1);
        interval = "1d";
        break;
      case "6M":
        date.setMonth(date.getMonth() - 6);
        interval = "1d";
        break;
      case "1Y":
        date.setFullYear(date.getFullYear() - 1);
        interval = "1d";
        break;
    }
    
    const period1 = date.toISOString().split("T")[0];

    fetch(`/api/market/history?ticker=${ticker}&period1=${period1}&interval=${interval}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.data && resData.data.length > 0) {
          seriesRef.current?.setData(resData.data);
          chartRef.current?.timeScale().fitContent();
        } else {
           seriesRef.current?.setData([]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

  }, [ticker, timeframe]);

  return (
    <div className="bg-white p-2 relative w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 px-2 border-b border-gray-100 pb-2">
        <h3 className="text-sm font-bold text-gray-800">{ticker.replace(".NS", "")}</h3>
        <div className="flex space-x-1">
          {(["1D", "1W", "1M", "6M", "1Y"] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 text-[10px] sm:text-xs font-semibold rounded transition-colors ${timeframe === tf ? 'bg-[#00d09c] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <span className="text-[#00d09c] font-bold text-sm">Loading Chart...</span>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full flex-1" />
    </div>
  );
}
