import { NextRequest, NextResponse } from "next/server";
import { getIntradayCandles, getQuote } from "@/lib/market-data";
import { SignalResult } from "@/lib/market-types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const [quote, candles] = await Promise.all([
      getQuote(symbol),
      getIntradayCandles(symbol, "5min", 60)
    ]);

    if (candles.length < 20) {
      return NextResponse.json(
        { error: "Not enough intraday data to calculate signal." },
        { status: 400 }
      );
    }

    const closes = candles.map((candle) => candle.close);
    const latest = closes[closes.length - 1];
    const sma10 = closes.slice(-10).reduce((sum, value) => sum + value, 0) / 10;
    const sma20 = closes.slice(-20).reduce((sum, value) => sum + value, 0) / 20;

    const momentumScore = clamp(((latest - sma10) / sma10) * 100 * 8, -10, 10);
    const meanReversionScore = clamp(((sma20 - latest) / sma20) * 100 * 8, -10, 10);

    const intradayRangePct = quote.open > 0 ? ((quote.high - quote.low) / quote.open) * 100 : 0;
    const eventRiskScore = clamp(intradayRangePct, 0, 10);

    const combinedScore = momentumScore + meanReversionScore * 0.6 - eventRiskScore * 0.35;

    let bias: SignalResult["bias"] = "Neutral";
    if (combinedScore > 2) {
      bias = "Bullish";
    } else if (combinedScore < -2) {
      bias = "Bearish";
    }

    const absoluteScore = Math.abs(combinedScore);
    const confidence: SignalResult["confidence"] =
      absoluteScore > 6 ? "High" : absoluteScore > 3 ? "Medium" : "Low";

    const summary =
      bias === "Bullish"
        ? "Recent price action is stronger than short-term average behavior, while downside reversion pressure remains limited."
        : bias === "Bearish"
          ? "Momentum is fading relative to recent averages and current trading range suggests pressure on the downside."
          : "Signals are mixed. Momentum and mean-reversion forces are offsetting each other for now.";

    const result: SignalResult = {
      symbol,
      bias,
      momentumScore: Number(momentumScore.toFixed(2)),
      meanReversionScore: Number(meanReversionScore.toFixed(2)),
      eventRiskScore: Number(eventRiskScore.toFixed(2)),
      confidence,
      summary
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate signal"
      },
      { status: 500 }
    );
  }
}
