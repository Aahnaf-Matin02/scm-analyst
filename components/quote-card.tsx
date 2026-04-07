"use client";

import { MarketSecurity, QuoteData } from "@/lib/market-types";

type QuoteCardProps = {
  quote: QuoteData | null;
  security?: MarketSecurity | null;
  loading?: boolean;
};

function Metric({
  label,
  value,
  raw = false
}: {
  label: string;
  value: number;
  raw?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">
        {raw ? value.toLocaleString() : `$${value.toFixed(2)}`}
      </div>
    </div>
  );
}

export default function QuoteCard({ quote, security, loading = false }: QuoteCardProps) {
  if (loading) {
    return (
      <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="text-sm text-neutral-500">Loading quote...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
        No quote data available.
      </div>
    );
  }

  const positive = quote.change >= 0;

  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-neutral-500">Symbol</div>
          <div className="text-3xl font-semibold tracking-tight">{quote.symbol}</div>
          {security?.name ? (
            <div className="mt-1 text-sm text-neutral-500">
              {security.name}
              {security.exchange ? ` • ${security.exchange}` : ""}
            </div>
          ) : null}
        </div>

        <div className="text-right">
          <div className="text-sm text-neutral-500">Last Trading Day</div>
          <div className="text-sm font-medium">{quote.lastTradingDay}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="text-4xl font-bold tracking-tight">${quote.price.toFixed(2)}</div>
        <div className={`text-sm font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
          {positive ? "+" : ""}
          {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Metric label="Open" value={quote.open} />
        <Metric label="High" value={quote.high} />
        <Metric label="Low" value={quote.low} />
        <Metric label="Prev Close" value={quote.previousClose} />
        <Metric label="Volume" value={quote.volume} raw />
      </div>
    </div>
  );
}
