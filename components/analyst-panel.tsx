"use client";

type AnalystPanelProps = {
  symbol: string;
  securityName?: string;
};

export default function AnalystPanel({ symbol, securityName }: AnalystPanelProps) {
  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold tracking-tight">AI Analyst</h2>

      <p className="mt-3 text-sm leading-6 text-neutral-700">
        This panel is reserved for your full AI analyst engine. It can later combine live quote
        data, candle behavior, forecast signals, macro news, scenario logic, and your custom
        market-prediction prompt for {securityName ? `${securityName} (${symbol})` : symbol}.
      </p>

      <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
        Suggested future output:
        <div className="mt-2 leading-6">
          Executive summary, evidence matrix, short-term price range, medium-term trend,
          bull/base/bear cases, probability estimates, and trading-risk notes.
        </div>
      </div>
    </div>
  );
}
