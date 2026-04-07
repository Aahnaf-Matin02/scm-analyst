"use client";

import { SignalResult } from "@/lib/market-types";

function ScoreBar({
  label,
  value,
  inverse = false
}: {
  label: string;
  value: number;
  inverse?: boolean;
}) {
  const width = Math.min(Math.abs(value) * 10, 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${
            inverse ? "bg-neutral-400" : value >= 0 ? "bg-neutral-900" : "bg-neutral-500"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function SignalPanel({
  signal,
  loading = false
}: {
  signal: SignalResult | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="text-sm text-neutral-500">Calculating signal...</div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
        No signal data available.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold tracking-tight">Forecast Engine</h2>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-neutral-500">Bias</div>
          <div className="text-2xl font-bold">{signal.bias}</div>
        </div>

        <div className="text-right">
          <div className="text-sm text-neutral-500">Confidence</div>
          <div className="text-lg font-semibold">{signal.confidence}</div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <ScoreBar label="Momentum" value={signal.momentumScore} />
        <ScoreBar label="Mean Reversion" value={signal.meanReversionScore} />
        <ScoreBar label="Event Risk" value={signal.eventRiskScore} inverse />
      </div>

      <p className="mt-6 text-sm leading-6 text-neutral-700">{signal.summary}</p>
    </div>
  );
}
