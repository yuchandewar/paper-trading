"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from "lightweight-charts";

interface TradingChartProps {
  ticker: string;
}

export default function TradingChart({ ticker }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ 
         width: chartContainerRef.current?.clientWidth,
         height: chartContainerRef.current?.clientHeight
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "white" },
        textColor: "black",
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: "#e0e3eb" },
        horzLines: { color: "#e0e3eb" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      }
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    seriesRef.current = candlestickSeries;

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!ticker || !seriesRef.current) return;
    
    setLoading(true);
    // Fetch one year of data
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    const period1 = date.toISOString().split("T")[0];

    fetch(`/api/market/history?ticker=${ticker}&period1=${period1}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.data && resData.data.length > 0) {
          // lightweight-charts requires strictly ascending dates and unique dates
          const uniqueData = Array.from(new Map(resData.data.map((item: any) => [item.time, item])).values());
          const sortedData = (uniqueData as any[]).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
          
          seriesRef.current?.setData(sortedData);
          chartRef.current?.timeScale().fitContent();
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

  }, [ticker]);

  return (
    <div className="bg-white p-2 relative w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="text-sm font-semibold">{ticker.replace(".NS", "")}</h3>
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <span className="text-indigo-600 font-medium text-sm">Loading Chart...</span>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full flex-1" />
    </div>
  );
}
