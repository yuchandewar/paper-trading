"use client";

import { useEffect, useState } from "react";
import Watchlist from "@/components/features/Watchlist";
import OrderPad from "@/components/features/OrderPad";
import TradingChart from "@/components/features/TradingChart";
import NewsFeed from "@/components/features/NewsFeed";

export default function Dashboard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>("RELIANCE.NS");

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
    <div className="max-w-7xl mx-auto w-full p-4 flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-80px)] gap-4 overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Watchlist (25%) */}
      <div className="w-full lg:w-1/4 h-[50vh] lg:h-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col shrink-0 overflow-hidden">
        <Watchlist onSelect={setSelectedTicker} selected={selectedTicker} />
      </div>

      {/* Center Column: Chart (50%) */}
      <div className="w-full lg:w-2/4 h-[60vh] lg:h-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col shrink-0 overflow-hidden">
        <div className="flex-1 p-2">
          <TradingChart ticker={selectedTicker} />
        </div>
      </div>

      {/* Right Column: Order Pad & News (25%) */}
      <div className="w-full lg:w-1/4 h-auto lg:h-full flex flex-col gap-4 shrink-0">
        <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <OrderPad ticker={selectedTicker} onTradeSuccess={() => {
              // refresh balance
               fetch("/api/portfolio/positions")
               .then((res) => res.json())
               .then((data) => setBalance(data.user?.balance));
          }} />
        </div>
        <div className="flex-1 min-h-[40vh] lg:min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-y-auto p-2">
          <NewsFeed ticker={selectedTicker} />
        </div>
      </div>
    </div>
  );
}
