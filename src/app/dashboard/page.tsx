"use client";

import { useEffect, useState } from "react";
import Watchlist from "@/components/features/Watchlist";
import OrderPad from "@/components/features/OrderPad";
import TradingChart from "@/components/features/TradingChart";
import NewsFeed from "@/components/features/NewsFeed";

export default function Dashboard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>("RELIANCE.NS");

  const [mobileView, setMobileView] = useState<"WATCHLIST" | "CHART" | "ORDER">("WATCHLIST");

  useEffect(() => {
    fetch("/api/portfolio/positions")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.balance) {
          setBalance(data.user.balance);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-7xl mx-auto w-full p-2 lg:p-4 flex flex-col h-[calc(100vh-64px)] overflow-hidden gap-2 lg:gap-4">
      {/* Mobile Navigation Tabs */}
      <div className="lg:hidden flex bg-white rounded-xl shadow-sm border border-gray-100 shrink-0">
        <button onClick={() => setMobileView("WATCHLIST")} className={`flex-1 py-3 text-xs font-bold transition-colors ${mobileView === "WATCHLIST" ? "text-[#00d09c] border-b-2 border-[#00d09c]" : "text-gray-500"}`}>WATCHLIST</button>
        <button onClick={() => setMobileView("CHART")} className={`flex-1 py-3 text-xs font-bold transition-colors ${mobileView === "CHART" ? "text-[#00d09c] border-b-2 border-[#00d09c]" : "text-gray-500"}`}>CHART</button>
        <button onClick={() => setMobileView("ORDER")} className={`flex-1 py-3 text-xs font-bold transition-colors ${mobileView === "ORDER" ? "text-[#00d09c] border-b-2 border-[#00d09c]" : "text-gray-500"}`}>TRADE</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 flex-1 overflow-hidden gap-2 lg:gap-4">
        {/* Left Column: Watchlist (25%) */}
        <div className={`h-full bg-white rounded-xl shadow-sm border border-gray-100 flex-col overflow-hidden lg:col-span-1 ${mobileView === "WATCHLIST" ? "flex" : "hidden lg:flex"}`}>
          <Watchlist onSelect={(ticker) => {
            setSelectedTicker(ticker);
            setMobileView("ORDER");
          }} selected={selectedTicker} />
        </div>

        {/* Center Column: Chart (50%) */}
        <div className={`h-full bg-white rounded-xl shadow-sm border border-gray-100 flex-col overflow-hidden lg:col-span-2 ${mobileView === "CHART" ? "flex" : "hidden lg:flex"}`}>
          <div className="flex-1 p-2">
            <TradingChart ticker={selectedTicker} />
          </div>
        </div>

        {/* Right Column: Order Pad & News (25%) */}
        <div className={`h-full flex-col gap-2 lg:gap-4 overflow-y-auto lg:overflow-hidden lg:col-span-1 ${mobileView === "ORDER" ? "flex" : "hidden lg:flex"}`}>
          <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <OrderPad ticker={selectedTicker} onTradeSuccess={() => {
                fetch("/api/portfolio/positions")
                .then((res) => res.json())
                .then((data) => setBalance(data.user?.balance));
            }} />
          </div>
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-y-auto p-2">
            <NewsFeed ticker={selectedTicker} />
          </div>
        </div>
      </div>
    </div>
  );
}
