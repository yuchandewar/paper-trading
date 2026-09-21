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
  const [capital, setCapital] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  
  // Advanced Order states
  const [hasStoploss, setHasStoploss] = useState(false);
  const [slType, setSlType] = useState<"VALUE" | "PERCENTAGE" | "TOTAL_AMOUNT">("PERCENTAGE");
  const [slValue, setSlValue] = useState("1");
  
  const [hasTarget, setHasTarget] = useState(false);
  const [targetType, setTargetType] = useState<"VALUE" | "PERCENTAGE" | "TOTAL_AMOUNT">("PERCENTAGE");
  const [targetValue, setTargetValue] = useState("2");
  
  const [hasAutoExit, setHasAutoExit] = useState(false);
  const [autoExitMinutes, setAutoExitMinutes] = useState("15");

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
        .then((data) => {
           setQuote(data);
           setLimitPrice("");
        })
        .catch(console.error);
    }
  }, [ticker]);

  const calcPrice = orderType === "LIMIT" && limitPrice ? parseFloat(limitPrice) : (quote?.price || 0);
  const leverage = product === "MIS" ? 5 : 1;
  const marginRequired = ((calcPrice * quantity) / leverage) || 0;

  // Handle Capital Input
  const handleCapitalChange = (val: string) => {
    setCapital(val);
    if (!calcPrice) return;
    const cap = parseFloat(val);
    if (isNaN(cap)) {
      setQuantity(1);
      return;
    }
    const calculatedQty = Math.floor((cap * leverage) / calcPrice);
    setQuantity(calculatedQty > 0 ? calculatedQty : 1);
  };

  const handleQtyChange = (val: string) => {
    const q = parseInt(val);
    setQuantity(isNaN(q) ? 1 : q);
    setCapital(""); // Clear custom capital override
  };

  // Calculate projected PnL for SL/Target
  const getExpectedPnL = (isSl: boolean, configType: string, configValueStr: string) => {
    if (!calcPrice || !quantity) return 0;
    const val = parseFloat(configValueStr);
    if (isNaN(val) || val <= 0) return 0;
    
    if (configType === "TOTAL_AMOUNT") {
      return val;
    } else if (configType === "PERCENTAGE") {
      const priceOffset = calcPrice * (val / 100);
      return priceOffset * quantity;
    } else { // VALUE (Per share)
      return val * quantity;
    }
  };

  const slExpectedPnL = hasStoploss ? getExpectedPnL(true, slType, slValue) : 0;
  const targetExpectedPnL = hasTarget ? getExpectedPnL(false, targetType, targetValue) : 0;

  const handleTrade = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const priceToUse = orderType === "LIMIT" && limitPrice ? parseFloat(limitPrice) : quote.price;
      
      // Convert TOTAL_AMOUNT to per-share VALUE for the backend API
      let finalSl = undefined;
      if (hasStoploss && parseFloat(slValue) > 0) {
        if (slType === "TOTAL_AMOUNT") {
          finalSl = { type: "VALUE", value: parseFloat(slValue) / quantity };
        } else {
          finalSl = { type: slType, value: parseFloat(slValue) };
        }
      }

      let finalTarget = undefined;
      if (hasTarget && parseFloat(targetValue) > 0) {
        if (targetType === "TOTAL_AMOUNT") {
          finalTarget = { type: "VALUE", value: parseFloat(targetValue) / quantity };
        } else {
          finalTarget = { type: targetType, value: parseFloat(targetValue) };
        }
      }

      const res = await fetch("/api/trade/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          product,
          type,
          orderType,
          quantity,
          price: priceToUse,
          stopLoss: finalSl,
          target: finalTarget,
          autoExitMinutes: hasAutoExit ? parseInt(autoExitMinutes) : undefined
        }),
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

  return (
    <div className="bg-white flex flex-col h-full">
      <div className="flex border-b border-gray-100">
        <button
          className={`flex-1 py-3 text-sm font-bold transition-colors ${type === "BUY" ? "text-[#00d09c] border-b-2 border-[#00d09c]" : "text-gray-400 hover:text-gray-600"}`}
          onClick={() => setType("BUY")}
        >
          BUY
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold transition-colors ${type === "SELL" ? "text-red-500 border-b-2 border-red-500" : "text-gray-400 hover:text-gray-600"}`}
          onClick={() => setType("SELL")}
        >
          SELL
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex justify-between items-end mb-5">
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
                onChange={(e) => handleQtyChange(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Capital (₹)</label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={capital}
                onChange={(e) => handleCapitalChange(e.target.value)}
                placeholder="Auto Qty"
              />
            </div>
          </div>
          
          {orderType === "LIMIT" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Limit Price (₹)</label>
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

          {/* Advanced Bracket Order Options */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-800 mb-2">Advanced Options</h4>
            
            {/* Stop Loss Toggle */}
            <div className="mb-2">
              <div className="flex justify-between">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={hasStoploss} onChange={(e) => setHasStoploss(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span>Stoploss</span>
                </label>
                {hasStoploss && slExpectedPnL > 0 && (
                  <span className="text-xs text-red-600 font-medium">Risk: -₹{slExpectedPnL.toFixed(2)}</span>
                )}
              </div>
              {hasStoploss && (
                <div className="flex gap-2 mt-2">
                  <div className="w-1/3">
                     <select 
                       className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none"
                       value={slType} onChange={(e) => setSlType(e.target.value as any)}
                     >
                       <option value="PERCENTAGE">%</option>
                       <option value="VALUE">₹/shr</option>
                       <option value="TOTAL_AMOUNT">Total ₹</option>
                     </select>
                  </div>
                  <div className="flex-1 relative">
                    <input type="number" step="0.1" value={slValue} onChange={(e) => setSlValue(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Target Toggle */}
            <div className="mb-2">
              <div className="flex justify-between">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={hasTarget} onChange={(e) => setHasTarget(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span>Target</span>
                </label>
                {hasTarget && targetExpectedPnL > 0 && (
                  <span className="text-xs text-green-600 font-medium">Reward: +₹{targetExpectedPnL.toFixed(2)}</span>
                )}
              </div>
              {hasTarget && (
                <div className="flex gap-2 mt-2">
                  <div className="w-1/3">
                     <select 
                       className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none"
                       value={targetType} onChange={(e) => setTargetType(e.target.value as any)}
                     >
                       <option value="PERCENTAGE">%</option>
                       <option value="VALUE">₹/shr</option>
                       <option value="TOTAL_AMOUNT">Total ₹</option>
                     </select>
                  </div>
                  <div className="flex-1 relative">
                    <input type="number" step="0.1" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Auto Exit Timer */}
            <div>
              <div className="flex justify-between">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={hasAutoExit} onChange={(e) => setHasAutoExit(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span>Auto-Exit Timer</span>
                </label>
              </div>
              {hasAutoExit && (
                <div className="flex gap-2 mt-2 items-center">
                  <input type="number" min="1" value={autoExitMinutes} onChange={(e) => setAutoExitMinutes(e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="15" />
                  <span className="text-xs text-gray-500 font-medium">Minutes from now</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex justify-between items-center text-xs mb-4">
          <span className="text-gray-500 font-medium">Margin Required:</span>
          <span className="font-bold text-gray-900 text-sm">₹{marginRequired.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        
        <button
          onClick={handleTrade}
          disabled={loading || !quote}
          className={`w-full py-3 px-4 rounded-lg text-white text-sm font-bold shadow-sm transition-colors ${
            type === "BUY" ? "bg-[#00d09c] hover:bg-[#00b386]" : "bg-red-500 hover:bg-red-600"
          } ${loading || !quote ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Processing..." : type}
        </button>
      </div>
    </div>
  );
}