"use client";

import { useEffect, useState } from "react";

export default function PortfolioPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  
  // Modal state
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [modalSlType, setModalSlType] = useState<"PERCENTAGE"|"VALUE">("PERCENTAGE");
  const [modalSlValue, setModalSlValue] = useState("");
  const [modalTargetType, setModalTargetType] = useState<"PERCENTAGE"|"VALUE">("PERCENTAGE");
  const [modalTargetValue, setModalTargetValue] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/portfolio/positions").then((res) => res.json()),
      fetch("/api/portfolio/history").then((res) => res.json()),
    ])
      .then(([posData, histData]) => {
        if (posData.positions) setPositions(posData.positions);
        if (histData.orders) setOrders(histData.orders);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Poll live prices for active positions
  useEffect(() => {
    const activeTickers = positions.filter((p) => p.netQuantity !== 0).map(p => p.ticker);
    if (activeTickers.length === 0) return;

    const fetchPrices = async () => {
      const uniqueTickers = Array.from(new Set(activeTickers));
      const prices: Record<string, number> = {};
      
      await Promise.all(
        uniqueTickers.map(async (ticker) => {
          try {
            const res = await fetch(`/api/market/quote?ticker=${ticker}`);
            if (res.ok) {
              const data = await res.json();
              if (data.price) prices[ticker] = data.price;
            }
          } catch (e) {
             // silent fail
          }
        })
      );
      setLivePrices(prev => ({ ...prev, ...prices }));
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [positions]);

  if (loading) {
    return <div>Loading portfolio...</div>;
  }

  const calcTriggerPrice = (pos: any, isSl: boolean) => {
    const config = isSl ? pos.stopLoss : pos.target;
    if (!config || !config.value) return null;
    const isBuy = pos.netQuantity > 0;
    const avg = pos.averagePrice;
    const val = config.value;
    
    if (config.type === 'VALUE') {
      return isBuy 
        ? (isSl ? avg - val : avg + val)
        : (isSl ? avg + val : avg - val);
    } else { // PERCENTAGE
      const offset = avg * (val / 100);
      return isBuy 
        ? (isSl ? avg - offset : avg + offset)
        : (isSl ? avg + offset : avg - offset);
    }
  };

  const openPositionModal = (pos: any) => {
    setSelectedPosition(pos);
    if (pos.stopLoss) {
      setModalSlType(pos.stopLoss.type);
      setModalSlValue(pos.stopLoss.value.toString());
    } else {
      setModalSlType("PERCENTAGE");
      setModalSlValue("");
    }
    if (pos.target) {
      setModalTargetType(pos.target.type);
      setModalTargetValue(pos.target.value.toString());
    } else {
      setModalTargetType("PERCENTAGE");
      setModalTargetValue("");
    }
  };

  const handleUpdatePosition = async () => {
    setUpdating(true);
    try {
      const res = await fetch("/api/portfolio/positions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: selectedPosition._id,
          stopLoss: modalSlValue ? { type: modalSlType, value: parseFloat(modalSlValue) } : null,
          target: modalTargetValue ? { type: modalTargetType, value: parseFloat(modalTargetValue) } : null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Update failed");
      }
    } catch (e) {
      alert("Error updating position");
    } finally {
      setUpdating(false);
    }
  };

  const activePositions = positions.filter((p) => p.netQuantity !== 0);
  
  const totalRealizedPnL = positions.reduce((sum, p) => sum + p.realizedPnL, 0);
  
  // Calculate total unrealized P&L
  let totalUnrealizedPnL = 0;
  activePositions.forEach(p => {
    const livePrice = livePrices[p.ticker];
    if (livePrice) {
      if (p.netQuantity > 0) {
        totalUnrealizedPnL += (livePrice - p.averagePrice) * p.netQuantity;
      } else {
        totalUnrealizedPnL += (p.averagePrice - livePrice) * Math.abs(p.netQuantity);
      }
    }
  });

  const totalTrades = positions.length; // Approximate, each position is a trade sequence
  const winningTrades = positions.filter(p => p.realizedPnL > 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-indigo-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Realized P&L</h3>
          <p className={`mt-2 text-3xl font-bold ${totalRealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{totalRealizedPnL.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-teal-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Live Unrealized P&L</h3>
          <p className={`mt-2 text-3xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalUnrealizedPnL >= 0 ? '+' : '-'}₹{Math.abs(totalUnrealizedPnL).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Win Rate</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{winRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Positions Traded</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalTrades}</p>
        </div>
      </div>

      {/* Active Positions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Active Positions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invested (Margin)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live P&L</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activePositions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">No active positions.</td>
                </tr>
              )}
              {activePositions.map((pos, idx) => {
                const livePrice = livePrices[pos.ticker];
                let unrealizedPnL = 0;
                if (livePrice) {
                   unrealizedPnL = pos.netQuantity > 0 
                     ? (livePrice - pos.averagePrice) * pos.netQuantity
                     : (pos.averagePrice - livePrice) * Math.abs(pos.netQuantity);
                }
                const investedMargin = (pos.averagePrice * Math.abs(pos.netQuantity)) / (pos.product === 'MIS' ? 5 : 1);

                const handleExit = async () => {
                  const maxQty = Math.abs(pos.netQuantity);
                  const qtyStr = window.prompt(`Enter quantity to exit (Max: ${maxQty}):`, maxQty.toString());
                  if (!qtyStr) return; // user cancelled
                  
                  const qtyToExit = parseInt(qtyStr, 10);
                  if (isNaN(qtyToExit) || qtyToExit <= 0 || qtyToExit > maxQty) {
                    alert(`Invalid quantity! Please enter a number between 1 and ${maxQty}.`);
                    return;
                  }

                  try {
                    const res = await fetch("/api/trade/place", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ticker: pos.ticker,
                        type: pos.netQuantity > 0 ? "SELL" : "BUY",
                        product: pos.product,
                        orderType: "MARKET",
                        quantity: qtyToExit,
                        price: livePrice || pos.averagePrice,
                      }),
                    });

                    if (res.ok) {
                      // reload the page to refresh the positions
                      window.location.reload();
                    } else {
                      const data = await res.json();
                      alert(data.error || "Failed to exit position");
                    }
                  } catch (e: any) {
                    alert(e.message || "Error exiting position");
                  }
                };

                return (
                <tr key={idx} onClick={() => openPositionModal(pos)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pos.ticker.replace(".NS", "")}</div>
                    {(pos.stopLoss || pos.target) && (
                      <div className="text-[10px] text-gray-500 flex space-x-2 mt-1">
                        {pos.stopLoss && (
                          <span className="text-red-500">SL: ₹{calcTriggerPrice(pos, true)?.toFixed(2)}</span>
                        )}
                        {pos.target && (
                          <span className="text-green-600">TGT: ₹{calcTriggerPrice(pos, false)?.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {pos.product}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${pos.netQuantity > 0 ? 'text-blue-600' : 'text-red-600'}`}>{pos.netQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{pos.averagePrice.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">₹{investedMargin.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {livePrice ? `₹${livePrice.toFixed(2)}` : 'Loading...'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {livePrice ? `${unrealizedPnL >= 0 ? '+' : '-'}₹${Math.abs(unrealizedPnL).toFixed(2)}` : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleExit(); }}
                      className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      EXIT
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Order History (Last 50)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No recent orders.</td>
                </tr>
              )}
              {orders.map((order, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.ticker.replace(".NS", "")}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${order.type === 'BUY' ? 'text-blue-600' : 'text-red-600'}`}>
                    {order.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.product}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{order.executionPrice?.toFixed(2) || '--'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Selected Position Modal */}
      {selectedPosition && (() => {
        const livePrice = livePrices[selectedPosition.ticker];
        const investedMargin = (selectedPosition.averagePrice * Math.abs(selectedPosition.netQuantity)) / (selectedPosition.product === 'MIS' ? 5 : 1);
        let unrealizedPnL = 0;
        if (livePrice) {
          unrealizedPnL = selectedPosition.netQuantity > 0 
            ? (livePrice - selectedPosition.averagePrice) * selectedPosition.netQuantity
            : (selectedPosition.averagePrice - livePrice) * Math.abs(selectedPosition.netQuantity);
        }
        const profitMargin = investedMargin > 0 ? ((unrealizedPnL / investedMargin) * 100).toFixed(2) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-none">
                <h3 className="text-lg font-bold text-gray-900">{selectedPosition.ticker.replace(".NS", "")} Details</h3>
                <button onClick={() => setSelectedPosition(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Product</span>
                    <span className="font-semibold">{selectedPosition.product}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Quantity</span>
                    <span className={`font-semibold ${selectedPosition.netQuantity > 0 ? 'text-blue-600' : 'text-red-600'}`}>{selectedPosition.netQuantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Avg Price</span>
                    <span className="font-semibold">₹{selectedPosition.averagePrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Live Price</span>
                    <span className="font-semibold">{livePrice ? `₹${livePrice.toFixed(2)}` : 'Loading...'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Invested Margin</span>
                    <span className="font-semibold">₹{investedMargin.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Current P&L</span>
                    <span className={`font-bold ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {unrealizedPnL >= 0 ? '+' : '-'}₹{Math.abs(unrealizedPnL).toFixed(2)} ({profitMargin}%)
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Modify Stoploss / Target</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stoploss</label>
                      <div className="flex gap-2">
                        <select className="w-1/3 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" value={modalSlType} onChange={(e) => setModalSlType(e.target.value as any)}>
                          <option value="PERCENTAGE">%</option>
                          <option value="VALUE">₹</option>
                        </select>
                        <input type="number" step="0.1" value={modalSlValue} onChange={(e) => setModalSlValue(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="Leave empty to clear" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Target</label>
                      <div className="flex gap-2">
                        <select className="w-1/3 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" value={modalTargetType} onChange={(e) => setModalTargetType(e.target.value as any)}>
                          <option value="PERCENTAGE">%</option>
                          <option value="VALUE">₹</option>
                        </select>
                        <input type="number" step="0.1" value={modalTargetValue} onChange={(e) => setModalTargetValue(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="Leave empty to clear" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end space-x-2">
                <button onClick={() => setSelectedPosition(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300">Cancel</button>
                <button onClick={handleUpdatePosition} disabled={updating} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded font-medium disabled:opacity-50">
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
