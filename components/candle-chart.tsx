"use client";

import { Candle } from "@/lib/market-types";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type CandleChartProps = {
  data: Candle[];
  loading?: boolean;
};

export default function CandleChart({ data, loading = false }: CandleChartProps) {
  if (loading) {
    return (
      <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="text-sm text-neutral-500">Loading intraday chart...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
        No chart data available.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: item.time.slice(11, 16)
  }));

  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Intraday Price Trend</h2>
        <div className="text-sm text-neutral-500">Latest session</div>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#e7e5e4" strokeDasharray="4 4" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              axisLine={false}
              domain={["auto", "auto"]}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "16px",
                borderColor: "#e5e5e5",
                boxShadow: "0 12px 28px rgba(0,0,0,0.08)"
              }}
            />
            <Line dataKey="close" dot={false} stroke="#171717" strokeWidth={2.5} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
