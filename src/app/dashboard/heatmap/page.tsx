import React from 'react';
import MarketHeatmap from '@/components/features/market/MarketHeatmap';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Heatmap | TradeNow',
  description: 'Analyze market sectors and stocks via a detailed heatmap.',
};

export default function HeatmapPage() {
  return (
    <div className="w-full h-full bg-[#f8f9fa] flex flex-col">
      <MarketHeatmap />
    </div>
  );
}
