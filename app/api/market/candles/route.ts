import { NextRequest, NextResponse } from "next/server";
import { getIntradayCandles } from "@/lib/market-data";

const ALLOWED_INTERVALS = new Set(["1min", "5min", "15min", "30min", "60min"]);

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
    const requestedInterval = request.nextUrl.searchParams.get("interval") ?? "5min";
    const interval = ALLOWED_INTERVALS.has(requestedInterval) ? requestedInterval : "5min";

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const candles = await getIntradayCandles(
      symbol,
      interval as "1min" | "5min" | "15min" | "30min" | "60min",
      80
    );

    return NextResponse.json(candles);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch candles"
      },
      { status: 500 }
    );
  }
}
