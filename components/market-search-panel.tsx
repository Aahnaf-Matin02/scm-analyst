"use client";

import { FormEvent, useDeferredValue, useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { MarketSearchResponse, MarketSecurity } from "@/lib/market-types";

type MarketSearchPanelProps = {
  current: MarketSecurity | null;
  quickPicks: MarketSecurity[];
  onSelect: (security: MarketSecurity) => void;
  pending?: boolean;
};

function ResultButton({
  active,
  security,
  onSelect
}: {
  active: boolean;
  security: MarketSecurity;
  onSelect: (security: MarketSecurity) => void;
}) {
  return (
    <button
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white"
      }`}
      onClick={() => onSelect(security)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{security.symbol}</div>
          <div className={`mt-1 text-sm ${active ? "text-neutral-200" : "text-neutral-600"}`}>
            {security.name}
          </div>
        </div>
        <div className={`text-right text-xs ${active ? "text-neutral-300" : "text-neutral-500"}`}>
          <div>{security.exchange}</div>
          <div className="mt-1">{security.assetType}</div>
        </div>
      </div>
    </button>
  );
}

export default function MarketSearchPanel({
  current,
  quickPicks,
  onSelect,
  pending = false
}: MarketSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketSecurity[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    if (!deferredQuery) {
      setResults([]);
      setSearching(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      setSearching(true);
      setError("");

      try {
        const response = await fetch(
          `/api/market/search?q=${encodeURIComponent(deferredQuery)}&limit=24`,
          {
            signal: controller.signal
          }
        );
        const payload = (await response.json()) as MarketSearchResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to search market");
        }

        setResults(payload.results);
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to search market");
          setResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [deferredQuery]);

  function handleSelect(security: MarketSecurity) {
    onSelect(security);
    setQuery("");
    setResults([]);
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const symbol = query.trim().split(/\s+/)[0]?.toUpperCase();

    if (!symbol) {
      return;
    }

    handleSelect({
      symbol,
      name: "Direct symbol lookup",
      exchange: "Manual entry",
      assetType: "Symbol",
      isEtf: false,
      source: "manual"
    });
  }

  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Market Search</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Search a much larger stock universe or enter a ticker directly.
          </p>
        </div>
        <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          Broad coverage
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Selected</div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">{current?.symbol ?? "AAPL"}</div>
            <div className="mt-1 text-sm text-neutral-600">
              {current?.name ?? "Apple Inc."}
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>{current?.exchange ?? "Nasdaq"}</div>
            <div className="mt-1">{pending ? "Loading" : "Live data"}</div>
          </div>
        </div>
      </div>

      <form className="mt-4" onSubmit={handleSubmit}>
        <label className="text-xs uppercase tracking-[0.2em] text-neutral-500" htmlFor="market-search">
          Find any symbol
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            autoComplete="off"
            className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            id="market-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ticker or company name, like AMZN or Toyota"
            value={query}
          />
        </div>
      </form>

      {query.trim() ? (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-neutral-500">
            <span>Results</span>
            <span>{searching ? "Searching..." : `${results.length} matches`}</span>
          </div>

          {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          {!error && !searching && results.length === 0 ? (
            <div className="rounded-xl bg-white px-3 py-4 text-sm text-neutral-500">
              No matches found. Press Enter to try a direct symbol lookup.
            </div>
          ) : null}

          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {results.map((security) => (
              <ResultButton
                active={security.symbol === current?.symbol}
                key={`${security.symbol}-${security.exchange}`}
                onSelect={handleSelect}
                security={security}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <Sparkles className="h-4 w-4" />
          Quick picks
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {quickPicks.map((security) => (
            <button
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                security.symbol === current?.symbol
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white hover:bg-neutral-100"
              }`}
              key={security.symbol}
              onClick={() => handleSelect(security)}
              type="button"
            >
              <div className="font-medium">{security.symbol}</div>
              <div
                className={`mt-1 text-xs ${
                  security.symbol === current?.symbol ? "text-neutral-300" : "text-neutral-500"
                }`}
              >
                {security.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
