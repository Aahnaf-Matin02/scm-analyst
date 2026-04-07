"use client";

import { useEffect, useState, useTransition } from "react";
import AnalystPanel from "@/components/analyst-panel";
import CandleChart from "@/components/candle-chart";
import MarketSearchPanel from "@/components/market-search-panel";
import QuoteCard from "@/components/quote-card";
import SignalPanel from "@/components/signal-panel";
import { Candle, MarketSecurity, QuoteData, SignalResult } from "@/lib/market-types";

const DEFAULT_SECURITIES: MarketSecurity[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "Nasdaq",
    assetType: "Equity",
    isEtf: false,
    source: "manual"
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    exchange: "Nasdaq",
    assetType: "Equity",
    isEtf: false,
    source: "manual"
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "Nasdaq",
    assetType: "Equity",
    isEtf: false,
    source: "manual"
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    exchange: "Nasdaq",
    assetType: "Equity",
    isEtf: false,
    source: "manual"
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices, Inc.",
    exchange: "Nasdaq",
    assetType: "Equity",
    isEtf: false,
    source: "manual"
  },
  {
    symbol: "META",
    name: "Meta Platforms, Inc.",
    exchange: "Nasdaq",
    assetType: "Equity",
    isEtf: false,
    source: "manual"
  }
];

export default function DashboardShell() {
  const [selectedSecurity, setSelectedSecurity] = useState<MarketSecurity | null>(DEFAULT_SECURITIES[0]);
  const [symbol, setSymbol] = useState<string>(DEFAULT_SECURITIES[0].symbol);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  async function loadData(activeSymbol: string) {
    setLoading(true);
    setError("");

    try {
      const [quoteResponse, candlesResponse, signalResponse] = await Promise.all([
        fetch(`/api/market/quote?symbol=${activeSymbol}`),
        fetch(`/api/market/candles?symbol=${activeSymbol}&interval=5min`),
        fetch(`/api/market/signal?symbol=${activeSymbol}`)
      ]);

      const [quoteJson, candlesJson, signalJson] = await Promise.all([
        quoteResponse.json(),
        candlesResponse.json(),
        signalResponse.json()
      ]);

      if (!quoteResponse.ok) {
        throw new Error(quoteJson.error || "Failed to load quote");
      }

      if (!candlesResponse.ok) {
        throw new Error(candlesJson.error || "Failed to load candles");
      }

      if (!signalResponse.ok) {
        throw new Error(signalJson.error || "Failed to load signal");
      }

      setQuote(quoteJson);
      setCandles(candlesJson);
      setSignal(signalJson);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setQuote(null);
      setCandles([]);
      setSignal(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(symbol);

    const intervalId = setInterval(() => {
      loadData(symbol);
    }, 60_000);

    return () => clearInterval(intervalId);
  }, [symbol]);

  function handleSelectSecurity(security: MarketSecurity) {
    startTransition(() => {
      setSelectedSecurity(security);
      setSymbol(security.symbol);
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-neutral-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">AI Trading Dashboard</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Search a much larger stock universe with live quotes, candles, and signal scoring
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              Use the search panel to look up far more symbols than the original watchlist, then
              load live market data for the one you want.
            </p>
          </div>

          <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm shadow-sm">
            Smooth white mode
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <QuoteCard loading={loading} quote={quote} security={selectedSecurity} />
            <CandleChart data={candles} loading={loading} />
            <AnalystPanel securityName={selectedSecurity?.name} symbol={symbol} />
          </div>

          <div className="space-y-6 lg:col-span-4">
            <MarketSearchPanel
              current={selectedSecurity}
              onSelect={handleSelectSecurity}
              pending={loading || isPending}
              quickPicks={DEFAULT_SECURITIES}
            />
            <SignalPanel loading={loading} signal={signal} />
          </div>
        </div>
      </div>
    </div>
  );
}
