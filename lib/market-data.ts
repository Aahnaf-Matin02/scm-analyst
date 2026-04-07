import YahooFinance from "yahoo-finance2";
import { Candle, QuoteData } from "@/lib/market-types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"]
});

const CHART_INTERVALS = {
  "1min": "1m",
  "5min": "5m",
  "15min": "15m",
  "30min": "30m",
  "60min": "60m"
} as const;

const LOOKBACK_DAYS: Record<keyof typeof CHART_INTERVALS, number> = {
  "1min": 7,
  "5min": 10,
  "15min": 20,
  "30min": 30,
  "60min": 45
};

function round(value: number): number {
  return Number(value.toFixed(2));
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatTradingDay(value: Date | string | number | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatCandleTime(value: Date | string | number): string {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

export async function getQuote(symbol: string): Promise<QuoteData> {
  const quote = await yahooFinance.quote(symbol.toUpperCase());

  if (!quote.symbol || quote.regularMarketPrice == null) {
    throw new Error(`No quote data found for ${symbol}`);
  }

  return {
    symbol: quote.symbol,
    price: round(safeNumber(quote.regularMarketPrice)),
    change: round(safeNumber(quote.regularMarketChange)),
    changePercent: round(safeNumber(quote.regularMarketChangePercent)),
    open: round(safeNumber(quote.regularMarketOpen)),
    high: round(safeNumber(quote.regularMarketDayHigh)),
    low: round(safeNumber(quote.regularMarketDayLow)),
    previousClose: round(safeNumber(quote.regularMarketPreviousClose)),
    volume: Math.round(safeNumber(quote.regularMarketVolume)),
    lastTradingDay: formatTradingDay(quote.regularMarketTime)
  };
}

export async function getIntradayCandles(
  symbol: string,
  interval: keyof typeof CHART_INTERVALS = "5min",
  limit = 80
): Promise<Candle[]> {
  const lookbackDays = LOOKBACK_DAYS[interval] ?? LOOKBACK_DAYS["5min"];
  const chart = await yahooFinance.chart(symbol.toUpperCase(), {
    interval: CHART_INTERVALS[interval],
    period1: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
  });

  const candles = (chart.quotes ?? [])
    .filter((quote) => {
      return (
        quote.date != null &&
        quote.open != null &&
        quote.high != null &&
        quote.low != null &&
        quote.close != null &&
        quote.volume != null
      );
    })
    .map((quote) => ({
      time: formatCandleTime(quote.date as Date),
      open: round(quote.open as number),
      high: round(quote.high as number),
      low: round(quote.low as number),
      close: round(quote.close as number),
      volume: Math.round(quote.volume as number)
    }))
    .slice(-limit);

  if (candles.length === 0) {
    throw new Error(`No intraday candle data found for ${symbol}`);
  }

  return candles;
}
