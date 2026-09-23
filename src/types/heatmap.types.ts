export interface HeatmapStock {
  symbol: string;
  name: string;
  changePercent: number;
  marketCap: number;
  price: number;
  volume: number;
}

export interface HeatmapSector {
  name: string;
  changePercent: number;
  marketCap: number;
  stocks: HeatmapStock[];
}

export interface HeatmapIndex {
  name: string;
  changePercent: number;
  marketCap: number;
  sectors: HeatmapSector[];
}
