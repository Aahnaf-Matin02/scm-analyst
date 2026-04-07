"use client";

type WatchlistPanelProps = {
  watchlist: string[];
  current: string;
  onSelect: (symbol: string) => void;
};

export default function WatchlistPanel({
  watchlist,
  current,
  onSelect
}: WatchlistPanelProps) {
  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold tracking-tight">Watchlist</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {watchlist.map((symbol) => {
          const active = symbol === current;

          return (
            <button
              key={symbol}
              onClick={() => onSelect(symbol)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
              }`}
              type="button"
            >
              <div className="font-medium">{symbol}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
