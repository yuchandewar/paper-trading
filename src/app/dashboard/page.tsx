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
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      {/* Left Column: Watchlist (25%) */}
      <div className="w-1/4 h-full border-r border-gray-200 bg-white flex flex-col">
        <Watchlist onSelect={setSelectedTicker} selected={selectedTicker} />
      </div>

      {/* Center Column: Chart (50%) */}
      <div className="w-2/4 h-full flex flex-col border-r border-gray-200">
        <div className="flex-1 bg-white p-2">
          <TradingChart ticker={selectedTicker} />
        </div>
      </div>

      {/* Right Column: Order Pad & News (25%) */}
      <div className="w-1/4 h-full flex flex-col bg-gray-50">
        <div className="flex-none p-2 border-b border-gray-200 bg-white">
          <OrderPad ticker={selectedTicker} onTradeSuccess={() => {
              // refresh balance
               fetch("/api/portfolio/positions")
               .then((res) => res.json())
               .then((data) => setBalance(data.user?.balance));
          }} />
        </div>
        <div className="flex-1 overflow-hidden p-2">
          <NewsFeed ticker={selectedTicker} />
        </div>
      </div>
    </div>
  );
}
