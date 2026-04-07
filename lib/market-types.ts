export type QuoteData = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  lastTradingDay: string;
};

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SignalResult = {
  symbol: string;
  bias: "Bullish" | "Bearish" | "Neutral";
  momentumScore: number;
  meanReversionScore: number;
  eventRiskScore: number;
  confidence: "Low" | "Medium" | "High";
  summary: string;
};

export type MarketSecurity = {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  isEtf: boolean;
  region?: string;
  currency?: string;
  source: "nasdaq-trader" | "yahoo" | "manual";
};

export type MarketSearchResponse = {
  query: string;
  total: number;
  results: MarketSecurity[];
};
