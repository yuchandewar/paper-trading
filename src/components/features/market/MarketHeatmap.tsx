"use client";

import React, { useState } from 'react';
import { HeatmapIndex, HeatmapSector } from '@/types/heatmap.types';
import { MOCK_HEATMAP_DATA } from '@/constants/mock-heatmap-data';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const getColor = (changePercent: number) => {
  if (changePercent >= 3) return 'bg-[#00B852] text-white'; // Strong Green
  if (changePercent >= 1) return 'bg-[#00D09C] text-white'; // Normal Green (Brand)
  if (changePercent > 0) return 'bg-[#A3E4D7] text-gray-900'; // Light Green
  if (changePercent <= -3) return 'bg-[#FF3B30] text-white'; // Strong Red
  if (changePercent <= -1) return 'bg-[#FF6B6B] text-white'; // Normal Red
  if (changePercent < 0) return 'bg-[#FFB3B3] text-gray-900'; // Light Red
  return 'bg-gray-200 text-gray-900'; // Neutral
};

export default function MarketHeatmap() {
  const [selectedIndex, setSelectedIndex] = useState<HeatmapIndex | null>(MOCK_HEATMAP_DATA[0]);
  const [selectedSector, setSelectedSector] = useState<HeatmapSector | null>(null);

  const handleIndexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = MOCK_HEATMAP_DATA.find(idx => idx.name === e.target.value) || null;
    setSelectedIndex(index);
    setSelectedSector(null);
  };

  const renderSectors = () => {
    if (!selectedIndex) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {selectedIndex.sectors.map((sector) => (
          <div
            key={sector.name}
            onClick={() => setSelectedSector(sector)}
            className={`cursor-pointer transition-all hover:shadow-lg rounded-xl p-4 flex flex-col justify-between min-h-[120px] ${getColor(sector.changePercent)}`}
          >
            <div className="font-semibold text-lg">{sector.name}</div>
            <div className="flex justify-between items-end mt-4">
              <span className="text-sm opacity-90">{sector.stocks.length} Stocks</span>
              <span className="text-xl font-bold">
                {sector.changePercent > 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStocks = () => {
    if (!selectedSector) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {selectedSector.stocks.map((stock) => (
          <div
            key={stock.symbol}
            className={`rounded-lg p-3 flex flex-col justify-between min-h-[100px] shadow-sm transition-transform hover:scale-[1.02] ${getColor(stock.changePercent)}`}
          >
            <div>
              <div className="font-bold">{stock.symbol.replace('.NS', '')}</div>
              <div className="text-xs opacity-80 truncate" title={stock.name}>{stock.name}</div>
            </div>
            <div className="flex justify-between items-end mt-2">
              <span className="text-sm font-medium">₹{stock.price}</span>
              <span className="text-sm font-bold">
                {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Heatmap</h1>
          <p className="text-sm text-gray-500 mt-1">Analyze market performance across indices and sectors.</p>
        </div>
        
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Index:</label>
          <select 
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#00d09c] focus:border-[#00d09c] block w-full p-2.5 shadow-sm"
            value={selectedIndex?.name || ''}
            onChange={handleIndexChange}
          >
            {MOCK_HEATMAP_DATA.map((idx) => (
              <option key={idx.name} value={idx.name}>{idx.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <button 
          onClick={() => setSelectedSector(null)}
          className={`text-sm font-medium transition-colors ${!selectedSector ? 'text-[#00d09c]' : 'text-gray-500 hover:text-gray-800'}`}
        >
          {selectedIndex?.name || 'All Sectors'}
        </button>
        
        {selectedSector && (
          <>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-[#00d09c]">
              {selectedSector.name}
            </span>
            <button 
              onClick={() => setSelectedSector(null)}
              className="ml-auto flex items-center text-xs text-gray-500 hover:text-gray-800 transition-colors bg-gray-100 px-2 py-1 rounded"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back to Sectors
            </button>
          </>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
        {!selectedSector ? renderSectors() : renderStocks()}
      </div>
    </div>
  );
}
