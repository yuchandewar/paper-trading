"use client";

import { useState, useEffect } from "react";

interface OrderPadProps {
  ticker: string;
  onTradeSuccess: () => void;
}

export default function OrderPad({ ticker, onTradeSuccess }: OrderPadProps) {
  const [quote, setQuote] = useState<any>(null);
  const [product, setProduct] = useState("MIS");
  const [type, setType] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState("");
  
  // Advanced Order states
  const [hasStoploss, setHasStoploss] = useState(false);
  const [slType, setSlType] = useState<"VALUE" | "PERCENTAGE">("PERCENTAGE");
  const [slValue, setSlValue] = useState("1"); // 1% or 1 Rs
  
  const [hasTarget, setHasTarget] = useState(false);
  const [targetType, setTargetType] = useState<"VALUE" | "PERCENTAGE">("PERCENTAGE");
  const [targetValue, setTargetValue] = useState("2"); // 2% or 2 Rs

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (ticker) {
      setQuote(null);
      fetch(`/api/market/quote?ticker=${ticker}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed");
          return res.json();
        })
        .then((data) => setQuote(data))
        .catch(console.error);
    }
  }, [ticker]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
          ticker,
          type,
          product,
          orderType,
          quantity,
          price: orderType === "LIMIT" ? parseFloat(limitPrice) : quote?.price,
          stopLoss: hasStoploss ? { type: slType, value: parseFloat(slValue) } : undefined,
          target: hasTarget ? { type: targetType, value: parseFloat(targetValue) } : undefined,
      };

      const res = await fetch("/api/trade/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Successfully executed ${type} for ${quantity} of ${ticker}`);
        onTradeSuccess();
      } else {
        setError(data.error || "Trade failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const calcPrice = orderType === "LIMIT" && limitPrice ? parseFloat(limitPrice) : (quote?.price || 0);
  const marginRequired = ((calcPrice * quantity) / (product === "MIS" ? 5 : 1));

  return (
    <div className="bg-white flex flex-col h-full">
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-sm font-semibold ${type === "BUY" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setType("BUY")}
        >
          BUY
        </button>
        <button
          className={`flex-1 py-2 text-sm font-semibold ${type === "SELL" ? "text-red-600 border-b-2 border-red-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setType("SELL")}
        >
          SELL
        </button>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-sm font-bold text-gray-800">{ticker.replace(".NS", "")}</h3>
          <div className="text-right">
            <span className="text-sm font-semibold block">{quote ? `₹${quote.price.toFixed(2)}` : "--"}</span>
          </div>
        </div>

        {error && <div className="mb-2 p-2 bg-red-50 text-red-700 text-xs rounded">{error}</div>}
        {successMsg && <div className="mb-2 p-2 bg-green-50 text-green-700 text-xs rounded">{successMsg}</div>}

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              >
                <option value="MIS">Intraday (MIS)</option>
                <option value="CNC">Delivery (CNC)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                required
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
            {orderType === "LIMIT" && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={quote?.price?.toString() || ""}
                />
              </div>
            )}
          </div>

          {/* Advanced Bracket Order Options */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-800 mb-2">Advanced Options</h4>
            
            {/* Stop Loss Toggle */}
            <div className="mb-2">
              <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={hasStoploss} onChange={(e) => setHasStoploss(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Stoploss</span>
              </label>
              {hasStoploss && (
                <div className="flex gap-2 mt-2">
                  <div className="w-1/3">
                     <select 
                       className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none"
                       value={slType} onChange={(e) => setSlType(e.target.value as any)}
                     >
                       <option value="PERCENTAGE">%</option>
                       <option value="VALUE">₹</option>
                     </select>
                  </div>
                  <div className="flex-1 relative">
                    <input type="number" step="0.1" value={slValue} onChange={(e) => setSlValue(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Target Toggle */}
            <div>
              <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={hasTarget} onChange={(e) => setHasTarget(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Target</span>
              </label>
              {hasTarget && (
                <div className="flex gap-2 mt-2">
                  <div className="w-1/3">
                     <select 
                       className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none"
                       value={targetType} onChange={(e) => setTargetType(e.target.value as any)}
                     >
                       <option value="PERCENTAGE">%</option>
                       <option value="VALUE">₹</option>
                     </select>
                  </div>
                  <div className="flex-1 relative">
                    <input type="number" step="0.1" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="0" />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-xs mb-3">
          <span className="text-gray-500">Margin:</span>
          <span className="font-semibold text-gray-900">₹{marginRequired.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        
        <button
          onClick={handleTrade}
          disabled={loading || !quote}
          className={`w-full py-2 px-4 rounded text-white text-sm font-bold shadow-sm transition-colors ${
            type === "BUY" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
          } ${loading || !quote ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Processing..." : type}
        </button>
      </div>
    </div>
  );
}
